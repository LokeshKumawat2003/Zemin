const express = require('express');
const walletController = require('../controllers/wallet.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/catalog', walletController.getGiftCatalog);
router.post('/send', authenticate, walletController.sendGift);

module.exports = router;
