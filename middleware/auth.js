// server/middleware/auth.js
const jwt = require('jsonwebtoken');
const db = require('../models');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader) {
      console.warn('authenticateToken: missing Authorization header');
      return res.status(401).json({ error: 'Access token required' });
    }

    // Accept "Bearer <token>" or raw token
    let token = authHeader;
    if (token.startsWith('Bearer ')) token = token.slice(7);
    token = token.trim();

    if (!token) {
      console.warn('authenticateToken: token empty after trimming');
      return res.status(401).json({ error: 'Access token required' });
    }

    // quick sanity check: JWTs have 3 parts separated by dots
    if (token.split('.').length !== 3) {
      console.warn('authenticateToken: token does not look like a JWT:', token.slice(0, 30));
      return res.status(401).json({ error: 'Invalid token format' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('authenticateToken: JWT_SECRET not set in environment');
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    // Verify token signature + expiry
    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch (err) {
      console.warn('authenticateToken: jwt.verify failed:', err.message);
      // For debugging only: show decoded payload if possible (not a security leak in local dev)
      const decoded = jwt.decode(token, { json: true });
      console.warn('authenticateToken: decoded payload (unverified):', decoded);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // payload may use different field names (userId, id, sub)
    const userId = payload.userId || payload.id || payload.sub;
    if (!userId) {
      console.warn('authenticateToken: token payload missing user identifier:', payload);
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    // load user record (select only needed fields)
    const user = await db.User.findByPk(userId, {
      attributes: ['id', 'username', 'role', 'isActive']
    });

    if (!user || !user.isActive) {
      console.warn('authenticateToken: user not found or inactive for id:', userId);
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }

    // Normalize req.user so other code can rely on plain object fields
    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      jwtPayload: payload
    };

    // debug
    console.log('authenticateToken -> req.user.id:', req.user.id);

    return next();
  } catch (err) {
    console.error('authenticateToken unexpected error:', err);
    return res.status(500).json({ error: 'Authentication middleware error' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin
};
