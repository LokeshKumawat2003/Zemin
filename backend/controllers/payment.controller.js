const { paymentService } = require('../services/payment.service');
const { success } = require('../utils/response.util');

exports.createOrder = async (req, res, next) => {
  try {
    const { paymentMethod, currency, packageId } = req.body;
    const data = await paymentService.createCoinPurchaseOrder({
      userId: req.user._id,
      packageId,
      paymentGateway: paymentMethod,
      currency,
    });
    success(res, data, 'Payment order created');
  } catch (err) {
    next(err);
  }
};

exports.verifyPayment = async (req, res, next) => {
  try {
    const { gateway, orderId, paymentId, signature, sessionId } = req.body;
    const data = await paymentService.verifyPayment({ gateway, orderId, paymentId, signature, sessionId });
    success(res, data, 'Payment verified');
  } catch (err) {
    next(err);
  }
};
