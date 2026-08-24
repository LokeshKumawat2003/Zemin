const searchService = require('../services/search.service');
const { success } = require('../utils/response.util');
const { getPagination } = require('../utils/pagination.util');

exports.search = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const type = req.query.type || 'all';
    const data = await searchService.search(req.query.q || '', type, { skip, limit });
    success(res, data);
  } catch (err) {
    next(err);
  }
};
