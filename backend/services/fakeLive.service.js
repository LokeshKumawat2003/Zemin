const LiveRoom = require("../models/LiveRoom.model");
const Gift = require("../models/Gift.model");

const timers = new Map();

const fakeViewerId = (roomId, name) =>
  `fake-${roomId}-${String(name).trim().toLowerCase()}`;

const registerFakeViewer = async (roomId, name) => {
  const id = fakeViewerId(roomId, name);
  const room = await LiveRoom.findByIdAndUpdate(
    roomId,
    { $addToSet: { fakeViewerIds: id } },
    { new: true, projection: { fakeViewerIds: 1 } },
  ).lean();
  const { getIO } = require("../sockets");
  const io = getIO();
  if (io) {
    const realViewerCount =
      io.sockets.adapter.rooms.get(`live:${roomId}`)?.size || 0;
    io.to(`live:${roomId}`).emit("live:viewer_count", {
      roomId: String(roomId),
      count: realViewerCount + (room?.fakeViewerIds?.length || 0),
    });
  }
  return id;
};

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const normalizeComments = (value) =>
  asArray(value)
    .map((item) => ({
      name: String(item.name || "Viewer")
        .trim()
        .slice(0, 40),
      text: String(item.text || "")
        .trim()
        .slice(0, 200),
      delaySeconds: Math.max(
        5,
        Math.min(86400, Number(item.delaySeconds) || 30),
      ),
    }))
    .filter((item) => item.text);

const normalizeGifts = (value) =>
  asArray(value)
    .map((item) => ({
      name: String(item.name || "Viewer")
        .trim()
        .slice(0, 40),
      giftId: String(item.giftId || "rose").trim(),
      giftName: item.giftName
        ? String(item.giftName).trim().slice(0, 80)
        : undefined,
      giftEmoji: String(item.giftEmoji || "🎁").slice(0, 8),
      coinCost: Math.max(0, Number(item.coinCost) || 0),
      quantity: Math.max(1, Math.min(100, Number(item.quantity) || 1)),
      delaySeconds: Math.max(
        5,
        Math.min(86400, Number(item.delaySeconds) || 60),
      ),
    }))
    .filter((item) => item.name);

const emitComment = async (roomId, item) => {
  await registerFakeViewer(roomId, item.name);
  const { getIO } = require("../sockets");
  const io = getIO();
  if (!io) return;
  io.to(`live:${roomId}`).emit("live:chat_message", {
    userId: fakeViewerId(roomId, item.name),
    userName: item.name,
    text: item.text,
    isFake: true,
    sentAt: new Date().toISOString(),
  });
};

const emitGift = async (roomId, item) => {
  await registerFakeViewer(roomId, item.name);
  const { getIO } = require("../sockets");
  const io = getIO();
  if (!io) return;
  let gift = await Gift.findOne({ giftId: item.giftId, isActive: true }).lean();
  if (!gift)
    gift = {
      giftId: item.giftId,
      name: item.giftName || "Gift",
      emoji: item.giftEmoji || "🎁",
      coinCost: item.coinCost || 0,
    };
  io.to(`live:${roomId}`).emit("live:gift", {
    roomId: String(roomId),
    senderId: fakeViewerId(roomId, item.name),
    senderName: item.name,
    giftId: gift.giftId,
    giftName: item.giftName || gift.name,
    giftEmoji: item.giftEmoji || gift.emoji || "🎁",
    coinCost: item.coinCost || gift.coinCost || 0,
    quantity: item.quantity,
    totalCoins: (item.coinCost || gift.coinCost || 0) * item.quantity,
    isFake: true,
    sentAt: new Date().toISOString(),
  });
};

const schedule = (room, item, callback) => {
  const delay = Math.max(5, Number(item.delaySeconds) || 30) * 1000;
  const timeout = setTimeout(() => {
    callback(room._id.toString(), item).catch?.(() => {});
    const interval = setInterval(
      () => callback(room._id.toString(), item).catch?.(() => {}),
      delay,
    );
    const current = timers.get(room._id.toString());
    if (current) current.push(interval);
  }, delay);
  return timeout;
};

const stop = (roomId) => {
  const handles = timers.get(String(roomId)) || [];
  handles.forEach(clearTimeout);
  handles.forEach(clearInterval);
  timers.delete(String(roomId));
};

const resetFakeViewers = async (roomId) => {
  await LiveRoom.findByIdAndUpdate(roomId, { $set: { fakeViewerIds: [] } });
};

const start = (room) => {
  stop(room._id);
  if (room.status !== "live" || room.playbackType !== "video") return;
  const handles = [];
  (room.fakeComments || []).forEach((item) =>
    handles.push(
      schedule(room, item, async (id, value) => emitComment(id, value)),
    ),
  );
  (room.fakeGifts || []).forEach((item) =>
    handles.push(schedule(room, item, emitGift)),
  );
  timers.set(room._id.toString(), handles);
};

const restart = (room) => start(room);

const startActiveRooms = async () => {
  const rooms = await LiveRoom.find({ status: "live", playbackType: "video" });
  rooms.forEach(start);
};

module.exports = {
  normalizeComments,
  normalizeGifts,
  start,
  restart,
  stop,
  resetFakeViewers,
  startActiveRooms,
};
