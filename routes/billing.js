const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
  generateBillPreview,
  generateBillPDFFile,
  printBill
} = require('../controllers/billingController');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// ✅ Preview bill (HTML preview for frontend)
router.get('/:id/preview', generateBillPreview);

// ✅ Generate and download bill PDF
router.get('/:id/pdf', generateBillPDFFile);

// ✅ Mark bill as printed
router.post('/:id/print', printBill);

module.exports = router;
