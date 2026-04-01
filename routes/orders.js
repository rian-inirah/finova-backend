const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  markOrderPrinted,
  orderValidation
} = require('../controllers/orderController');

// ✅ All routes require authentication
router.use(authenticateToken);

// ✅ Create new order
router.post('/', orderValidation, createOrder);

// ✅ Get all orders belonging to logged-in user
router.get('/', getOrders);

// ✅ Get single order by ID (only user’s own)
router.get('/:id', getOrderById);

// ✅ Update existing order
router.put('/:id', orderValidation, updateOrder);

// ✅ Delete draft order (only user’s own)
router.delete('/:id', deleteOrder);

// ✅ Mark order as printed (only user’s own)
router.patch('/:id/printed', markOrderPrinted);

module.exports = router;
