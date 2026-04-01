const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
  getOrderReports,
  getItemReports,
  getDailyReports,
  getTopSellingItems
} = require('../controllers/reportsController');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Reports routes (frontend handles PIN)
router.get('/orders', getOrderReports);
router.get('/items', getItemReports);
router.get('/daily', getDailyReports);
router.get('/top-items', getTopSellingItems);

module.exports = router;
