const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');

const router = express.Router();

// Rate limiting for login attempts
const loginLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_ATTEMPTS) || 5, // 5 attempts per window
  message: {
    error: 'Too many login attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// POST login with rate limiting
router.post('/login', loginLimiter, authController.login);

// POST register (optional)
router.post('/register', authController.register);

// GET user profile (requires authentication middleware)
router.get('/profile', authController.authenticate, async (req, res) => {
  // For now, just return the decoded user info
  res.json({ user: req.user });
});

// GET verify token (requires authentication middleware)
router.get('/verify', authController.authenticate, async (req, res) => {
  res.json({ valid: true, user: req.user });
});

module.exports = router;
