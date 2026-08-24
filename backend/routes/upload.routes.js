const express = require('express');
const uploadController = require('../controllers/upload.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/media', authenticate, uploadController.uploadMedia);

module.exports = router;
