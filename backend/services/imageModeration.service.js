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
const defaultPython = process.platform === 'win32'
  ? path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python312', 'python.exe')
  : 'python3';

const scanImage = (imagePath) => new Promise((resolve, reject) => {
  const python = process.env.NSFW_PYTHON || defaultPython;
  const child = spawn(python, [scriptPath, imagePath], { windowsHide: true });
  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  const timeout = setTimeout(() => child.kill(), Number(process.env.NSFW_SCAN_TIMEOUT_MS || 30000));

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

const enforceScan = async (imagePath, context) => {
  if (process.env.NSFW_MODERATION_ENABLED === 'false') return { isNsfw: false, skipped: true };
  if (!imagePath || !fs.existsSync(imagePath)) {
    throw new AppError('MODERATION_UNAVAILABLE', 503, 'Image moderation input is unavailable');
  }
  try {
    return await scanImage(imagePath);
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

const disablePublicStreaming = async (userId, reason) => {
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
};

const enforcePublicImage = async (imagePath, userId, context) => {
  const result = await enforceScan(imagePath, context);
  if (!result.isNsfw) return result;
  await disablePublicStreaming(userId, 'Nude or sexually explicit image detected in a public live room');
  throw new AppError(
    'PUBLIC_STREAMING_DISABLED',
    403,
    'Public streaming has been disabled because explicit content was detected',
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
  enforcePublicImage,
  enforcePublicPostImage,
  enforcePublicPostUrl,
};