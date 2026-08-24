const Report = require('../models/Report.model');
const AppError = require('../utils/AppError');
const notificationService = require('./notification.service');

class ReportService {
  async createReport(reporterId, { targetType, targetId, reason, description }) {
    const existing = await Report.findOne({ reporterId, targetType, targetId, status: 'pending' });
    if (existing) {
      throw new AppError('DUPLICATE_REPORT', 409, 'You already reported this content');
    }

    const report = await Report.create({
      reporterId,
      targetType,
      targetId,
      reason,
      description,
    });

    try {
      await notificationService.notifyAdmins({
        type: 'report',
        title: 'New report submitted',
        body: `${targetType} reported for ${reason}`,
        data: { targetType: 'report', targetId: report._id.toString(), action: 'review_report' },
      });
    } catch (err) {
      console.warn('[ReportService] admin notification failed:', err.message || err);
    }

    return {
      id: report._id.toString(),
      status: report.status,
    };
  }
}

module.exports = new ReportService();
