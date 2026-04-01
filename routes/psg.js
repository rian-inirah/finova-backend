const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
  getPSGReports,
  getPSGOrderHistory,
  getPSGItemDetails
} = require('../controllers/psgController');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// PSG routes — frontend handles PIN
router.get('/reports', getPSGReports);
router.get('/orders', getPSGOrderHistory);
router.get('/items/:itemId', getPSGItemDetails);

module.exports = router;
