const fs = require('fs');
const os = require('os');
const path = require('path');
const multer = require('multer');
const liveService = require('../services/live.service');
const { getIO } = require('../sockets');
const { success, paginated } = require('../utils/response.util');
const { getPagination } = require('../utils/pagination.util');
const AppError = require('../utils/AppError');

const frameUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(os.tmpdir(), 'zemin-live-moderation');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/jpeg|jpg|png|webp/i.test(file.mimetype)) cb(null, true);
    else cb(new AppError('VALIDATION_ERROR', 400, 'Image file required'));
  },
}).single('file');

exports.create = async (req, res, next) => {
  try {
    const data = await liveService.createRoom(req.user._id, {
      ...req.body,
      roomType: 'public',
      startMode: 'instant',
    });
    success(res, data, 'Live room created', 201);
  } catch (err) {
    next(err);
  }
};

exports.createVip = async (req, res, next) => {
  try {
    const data = await liveService.createRoom(req.user._id, {
      ...req.body,
      roomType: 'vip',
    });
    success(res, data, 'VIP room created', 201);
  } catch (err) {
    next(err);
  }
};

exports.start = async (req, res, next) => {
  try {
    const result = await liveService.startRoom(req.user._id, req.body.roomId);
    success(res, {
      roomId: result.room._id,
      status: result.room.status,
      title: result.room.title,
      webrtcToken: result.webrtcToken,
      livekitUrl: result.livekitUrl,
      livekitRoom: result.livekitRoom,
      livekitEnabled: result.livekitEnabled,
    }, 'Stream started');
  } catch (err) {
    next(err);
  }
};

exports.convertToVip = async (req, res, next) => {
  try {
    const io = getIO();
    const roomName = `live:${req.body.roomId}`;
    const preservedViewerIds = io
      ? [...io.sockets.sockets.values()]
          .filter((socket) => socket.rooms.has(roomName) && socket.userId !== String(req.user._id))
          .map((socket) => socket.userId)
      : [];
    const data = await liveService.convertRoomToVip(
      req.user._id,
      req.body.roomId,
      req.body.entryGiftId,
      preservedViewerIds,
    );
    if (io) {
      io.to(roomName).emit('live:privacy_changed', {
        roomId: req.body.roomId,
        roomType: 'vip',
        entryGiftId: data.entryGiftId,
        entryFeeCoins: data.entryFeeCoins,
        entryGift: data.entryGift,
        preservedViewerIds,
      });
    }
    success(res, data, 'Live converted to private');
  } catch (err) {
    next(err);
  }
};

exports.join = async (req, res, next) => {
  try {
    const data = await liveService.joinRoom(req.user._id, req.body.roomId);
    success(res, data);
  } catch (err) {
    next(err);
  }
};

exports.end = async (req, res, next) => {
  try {
    const data = await liveService.endRoom(req.user._id, req.body.roomId);
    success(res, data, 'Stream ended');
  } catch (err) {
    next(err);
  }
};

exports.leave = async (req, res, next) => {
  try {
    const data = await liveService.leaveRoom(req.user._id, req.body.roomId);
    success(res, data, 'Left stream');
  } catch (err) {
    next(err);
  }
};

exports.getRoom = async (req, res, next) => {
  try {
    const data = await liveService.getRoomById(req.params.roomId);
    success(res, data);
  } catch (err) {
    next(err);
  }
};

exports.active = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { rooms, total } = await liveService.getActiveRooms({
      skip,
      limit,
      category: req.query.category,
    });
    paginated(res, rooms, page, limit, total);
  } catch (err) {
    next(err);
  }
};

exports.vipRooms = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { rooms, total } = await liveService.getVipRooms({
      skip,
      limit,
      includeScheduled: req.query.includeScheduled !== 'false',
    });
    paginated(res, rooms, page, limit, total);
  } catch (err) {
    next(err);
  }
};

exports.moderateFrame = (req, res, next) => {
  frameUpload(req, res, async (err) => {
    if (err) return next(err);
    if (!req.file) return next(new AppError('VALIDATION_ERROR', 400, 'Frame image required'));

    try {
      const data = await liveService.moderateLiveFrame(
        req.user._id,
        req.params.roomId,
        req.file.path,
      );
      success(res, data, 'Frame scanned');
    } catch (uploadErr) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        await fs.promises.unlink(req.file.path).catch(() => {});
      }
      next(uploadErr);
    }
  });
};
