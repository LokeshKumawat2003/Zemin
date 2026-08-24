const reportService = require('../services/report.service');
const { success } = require('../utils/response.util');

exports.create = async (req, res, next) => {
  try {
    const data = await reportService.createReport(req.user._id, req.body);
    success(res, data, 'Report submitted', 201);
  } catch (err) {
    next(err);
  }
};
