const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const AppError = require('../utils/AppError');
const User = require('../models/User.model');
const LiveRoom = require('../models/LiveRoom.model');
const Creator = require('../models/Creator.model');
const { getAuthModels } = require('../config/database');

const scriptPath = path.join(__dirname, '..', 'moderation', 'nudenet_scan.py');
const workerScriptPath = path.join(__dirname, '..', 'moderation', 'nudenet_worker.py');
const defaultPython = process.platform === 'win32'
  ? path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python312', 'python.exe')
  : 'python3';

let moderationWorker = null;
let workerReady = false;
let workerBootPromise = null;
let workerRequestId = 0;
const workerPending = new Map();

const resetModerationWorker = () => {
  if (moderationWorker) {
    moderationWorker.kill();
  }
  moderationWorker = null;
  workerReady = false;
  workerBootPromise = null;
  workerPending.forEach(({ reject, timeout }) => {
    clearTimeout(timeout);
    reject(new Error('Moderation worker restarted'));
  });
  workerPending.clear();
};

const handleWorkerLine = (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let payload;
  try {
    payload = JSON.parse(trimmed);
  } catch (error) {
    console.warn('[Moderation] Ignored worker output:', trimmed);
    return;
  }

  if (payload.ready) {
    workerReady = true;
    return;
  }

  const pending = workerPending.get(payload.id);
  if (!pending) return;

  clearTimeout(pending.timeout);
  workerPending.delete(payload.id);
  if (payload.error) pending.reject(new Error(payload.error));
  else pending.resolve(payload);
};

const ensureModerationWorker = () => {
  if (workerReady && moderationWorker) {
    return Promise.resolve();
  }
  if (workerBootPromise) return workerBootPromise;

  workerBootPromise = new Promise((resolve, reject) => {
    const python = process.env.NSFW_PYTHON || defaultPython;
    moderationWorker = spawn(python, [workerScriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      cwd: path.join(__dirname, '..', 'moderation'),
    });

    let stdoutBuffer = '';
    let bootResolved = false;

    const bootTimeout = setTimeout(() => {
      resetModerationWorker();
      reject(new Error('Moderation worker failed to start'));
    }, Number(process.env.NSFW_WORKER_BOOT_TIMEOUT_MS || 45000));

    const finishBoot = () => {
      if (bootResolved) return;
      bootResolved = true;
      clearTimeout(bootTimeout);
      resolve();
    };

    moderationWorker.stdout.on('data', (chunk) => {
      stdoutBuffer += chunk.toString();
      const lines = stdoutBuffer.split('\n');
      stdoutBuffer = lines.pop() || '';
      lines.forEach((line) => {
        handleWorkerLine(line);
        if (workerReady) finishBoot();
      });
    });

    moderationWorker.stderr.on('data', (chunk) => {
      const message = chunk.toString().trim();
      if (message) console.warn('[Moderation worker]', message);
    });

    moderationWorker.once('error', (error) => {
      clearTimeout(bootTimeout);
      resetModerationWorker();
      reject(error);
    });

    moderationWorker.once('close', () => {
      resetModerationWorker();
    });
  }).catch((error) => {
    workerBootPromise = null;
    throw error;
  });

  return workerBootPromise;
};

const scanImageWithWorker = async (imagePath, mode = 'default') => {
  await ensureModerationWorker();
  const requestId = ++workerRequestId;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      workerPending.delete(requestId);
      reject(new Error('Moderation worker timed out'));
    }, Number(process.env.NSFW_SCAN_TIMEOUT_MS || 15000));

    workerPending.set(requestId, { resolve, reject, timeout });

    try {
      moderationWorker.stdin.write(`${JSON.stringify({ id: requestId, path: imagePath, mode })}\n`);
    } catch (error) {
      clearTimeout(timeout);
      workerPending.delete(requestId);
      resetModerationWorker();
      reject(error);
    }
  });
};

const scanImageOnce = (imagePath, mode = 'default') => new Promise((resolve, reject) => {
  const python = process.env.NSFW_PYTHON || defaultPython;
  const child = spawn(python, [scriptPath, imagePath], {
    windowsHide: true,
    env: {
      ...process.env,
      NSFW_SCAN_MODE: mode,
    },
  });
  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  const timeout = setTimeout(() => child.kill(), Number(process.env.NSFW_SCAN_TIMEOUT_MS || 15000));

  child.once('error', (error) => {
    clearTimeout(timeout);
    reject(error);
  });
  child.once('close', (code) => {
    clearTimeout(timeout);
    if (code !== 0) return reject(new Error(stderr.trim() || stdout.trim() || `Scanner exited with ${code}`));
    try {
      const result = JSON.parse(stdout.trim());
      if (result.error) return reject(new Error(result.error));
      resolve(result);
    } catch (error) {
      reject(new Error(`Invalid moderation response: ${error.message}`));
    }
  });
});

const scanImage = async (imagePath, mode = 'default') => {
  if (process.env.NSFW_WORKER_ENABLED === 'false') {
    return scanImageOnce(imagePath, mode);
  }

  try {
    return await scanImageWithWorker(imagePath, mode);
  } catch (error) {
    console.warn('[Moderation] Worker scan failed, falling back to one-shot scanner:', error.message);
    return scanImageOnce(imagePath, mode);
  }
};

const enforceScan = async (imagePath, context, options = {}) => {
  if (process.env.NSFW_MODERATION_ENABLED === 'false') return { isNsfw: false, skipped: true };
  if (!imagePath || !fs.existsSync(imagePath)) {
    throw new AppError('MODERATION_UNAVAILABLE', 503, 'Image moderation input is unavailable');
  }
  const mode = options.mode || (String(context).includes('live') ? 'live' : 'default');
  try {
    return await scanImage(imagePath, mode);
  } catch (error) {
    console.error(`[Moderation] ${context} scan failed:`, error.message);
    if (process.env.NSFW_MODERATION_FAIL_CLOSED !== 'false') {
      throw new AppError('MODERATION_UNAVAILABLE', 503, 'Image moderation is temporarily unavailable');
    }
    return { isNsfw: false, skipped: true };
  }
};

const recordProfileViolation = async (userId) => {
  const { User: AuthUser } = getAuthModels();
  const [authUser, mainUser] = await Promise.all([
    AuthUser.findById(userId),
    User.findById(userId),
  ]);
  if (!authUser) throw new AppError('NOT_FOUND', 404, 'User not found');

  const warningCount = Math.min((authUser.nsfwProfileWarnings || 0) + 1, 4);
  const update = {
    nsfwProfileWarnings: warningCount,
    nsfwProfileLastWarningAt: new Date(),
  };
  let message = `Nude profile images are not allowed. Warning ${Math.min(warningCount, 2)} of 2.`;
  let code = 'NSFW_PROFILE_WARNING';

  if (warningCount === 3) {
    const suspendedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    Object.assign(update, { suspendedUntil, banReason: 'Nude profile image: 7-day suspension' });
    message = 'Your account is suspended for 7 days because of repeated nude profile images.';
    code = 'ACCOUNT_SUSPENDED';
  } else if (warningCount >= 4) {
    Object.assign(update, { isBanned: true, banReason: 'Repeated nude profile images' });
    message = 'Your account has been permanently blocked because of repeated nude profile images.';
    code = 'ACCOUNT_BANNED';
  }

  await Promise.all([
    AuthUser.findByIdAndUpdate(userId, update),
    mainUser ? User.findByIdAndUpdate(userId, update) : Promise.resolve(),
  ]);
  throw new AppError(code, 403, message, { warningCount, maxWarnings: 2 });
};

const recordPostViolation = async (userId) => {
  const { User: AuthUser } = getAuthModels();
  const [authUser, mainUser] = await Promise.all([
    AuthUser.findById(userId),
    User.findById(userId),
  ]);
  if (!authUser) throw new AppError('NOT_FOUND', 404, 'User not found');

  const warningCount = Math.min((authUser.nsfwPostWarnings || 0) + 1, 4);
  const update = {
    nsfwPostWarnings: warningCount,
    nsfwPostLastWarningAt: new Date(),
  };
  let message = `Nude images are not allowed in public posts. Warning ${Math.min(warningCount, 2)} of 2.`;
  let code = 'NSFW_POST_WARNING';

  if (warningCount === 3) {
    const suspendedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    Object.assign(update, { suspendedUntil, banReason: 'Nude public post: 7-day suspension' });
    message = 'Your account is suspended for 7 days because of repeated nude public posts.';
    code = 'ACCOUNT_SUSPENDED';
  } else if (warningCount >= 4) {
    Object.assign(update, { isBanned: true, banReason: 'Repeated nude public posts' });
    message = 'Your account has been permanently blocked because of repeated nude public posts.';
    code = 'ACCOUNT_BANNED';
  }

  await Promise.all([
    AuthUser.findByIdAndUpdate(userId, update),
    mainUser ? User.findByIdAndUpdate(userId, update) : Promise.resolve(),
  ]);
  throw new AppError(code, 403, message, { warningCount, maxWarnings: 2 });
};

const notifyLiveModerationEnd = (roomId) => {
  if (!roomId) return;
  try {
    const { getIO } = require('../sockets');
    const io = getIO();
    if (io) {
      io.to(`live:${roomId}`).emit('live:ended', { roomId, reason: 'moderation' });
    }
  } catch (_) {
    // Socket may be unavailable during tests
  }
};

const disablePublicStreaming = async (userId, reason, roomId = null) => {
  const { User: AuthUser } = getAuthModels();
  const update = {
    streamingDisabled: true,
    streamingDisabledReason: reason,
    streamingDisabledAt: new Date(),
  };
  await Promise.all([
    AuthUser.findByIdAndUpdate(userId, update),
    User.findByIdAndUpdate(userId, update),
    LiveRoom.updateMany(
      { userId, roomType: 'public', status: { $in: ['waiting', 'live'] } },
      { $set: { status: 'ended', endedAt: new Date() } },
    ),
    Creator.findOneAndUpdate({ userId }, { isLive: false, currentLiveRoomId: null }),
  ]);
  notifyLiveModerationEnd(roomId);
};

const enforcePublicImage = async (imagePath, userId, context, roomId = null) => {
  const result = await enforceScan(imagePath, context, { mode: 'live' });
  if (!result.isNsfw) return result;
  await disablePublicStreaming(
    userId,
    'Nude or sexually explicit image detected in a public live room',
    roomId,
  );
  throw new AppError(
    'PUBLIC_STREAMING_DISABLED',
    403,
    'Public streaming has been disabled because explicit content was detected',
    { detections: result.detections?.length || 0 },
  );
};

const enforcePublicPostImage = async (imagePath, userId, context = 'public post') => {
  const result = await enforceScan(imagePath, context);
  if (result.isNsfw) {
    await recordPostViolation(userId);
  }
  return result;
};

const enforcePublicPostUrl = async (imageUrl, userId) => {
  let parsedUrl;
  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    throw new AppError('MODERATION_UNAVAILABLE', 503, 'Public post image URL is invalid');
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new AppError('MODERATION_UNAVAILABLE', 503, 'Public post image URL is unsupported');
  }

  const response = await fetch(parsedUrl, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new AppError('MODERATION_UNAVAILABLE', 503, 'Public post image could not be scanned');
  const imageBuffer = Buffer.from(await response.arrayBuffer());
  if (!imageBuffer.length || imageBuffer.length > 25 * 1024 * 1024) {
    throw new AppError('MODERATION_UNAVAILABLE', 503, 'Public post image is unavailable');
  }

  const tempPath = path.join(os.tmpdir(), `zemin-nsfw-${crypto.randomUUID()}.image`);
  await fs.promises.writeFile(tempPath, imageBuffer);
  try {
    return await enforcePublicPostImage(tempPath, userId, 'public post URL');
  } finally {
    await fs.promises.rm(tempPath, { force: true });
  }
};

module.exports = {
  enforceScan,
  recordProfileViolation,
  recordPostViolation,
  disablePublicStreaming,
  enforcePublicImage,
  enforcePublicPostImage,
  enforcePublicPostUrl,
  warmupModerationWorker: async () => {
    if (process.env.NSFW_MODERATION_ENABLED === 'false') return;
    try {
      await ensureModerationWorker();
      console.log('[Moderation] NudeNet worker ready');
    } catch (error) {
      console.warn('[Moderation] NudeNet worker preload failed:', error.message);
    }
  },
};