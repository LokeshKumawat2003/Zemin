const getPagination = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 50);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

module.exports = { getPagination };
