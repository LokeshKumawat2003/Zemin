const onlineUsers = new Map();

const markOnline = (userId) => {
  const id = userId.toString();
  onlineUsers.set(id, (onlineUsers.get(id) || 0) + 1);
};

const markOffline = (userId) => {
  const id = userId.toString();
  const connections = (onlineUsers.get(id) || 1) - 1;

  if (connections > 0) {
    onlineUsers.set(id, connections);
  } else {
    onlineUsers.delete(id);
  }
};

const isOnline = (userId) => onlineUsers.has(userId.toString());

module.exports = { markOnline, markOffline, isOnline };