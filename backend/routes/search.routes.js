const express = require('express');
const searchController = require('../controllers/search.controller');
const { optionalAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', optionalAuth, searchController.search);

module.exports = router;
