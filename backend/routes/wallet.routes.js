const express = require('express');
const walletController = require('../controllers/wallet.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

router.get('/balance', authenticate, walletController.getBalance);
router.get('/transactions', authenticate, walletController.getTransactions);
router.get('/payment-methods', authenticate, walletController.listPaymentMethods);
router.get('/packages', authenticate, walletController.getCoinPackages);
router.post('/purchase', authenticate, walletController.purchaseCoins);
router.post('/withdraw', authenticate, authorize('creator', 'admin'), walletController.withdrawEarnings);
router.delete('/payment-methods/:id', authenticate, walletController.deletePaymentMethod);

module.exports = router;
