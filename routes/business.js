const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const {
  getBusinessDetails,
  createOrUpdateBusinessDetails,
  businessValidation,
} = require('../controllers/businessController');

// --------------------
// Multer setup for logo uploads
// --------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/businessLogos/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, filename);
  },
});
const upload = multer({ storage });

// --------------------
// Routes
// --------------------

// GET /api/business — Fetch business details
router.get('/', authenticateToken, getBusinessDetails);

// POST /api/business — Create or update business details (supports file upload)
router.post(
  '/',
  authenticateToken,
  upload.single('businessLogo'),
  businessValidation,
  createOrUpdateBusinessDetails
);

module.exports = router;
