// server.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

// Import database
const db = require('./models');

const app = express();
const PORT = process.env.PORT || 5000;

// -----------------
// Security middleware
// -----------------
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

// -----------------
// CORS configuration (PRODUCTION READY)
// -----------------
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://finova-frontend-swart.vercel.app"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// Handle preflight requests
app.options("*", cors());

// -----------------
// Body parsing
// -----------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// -----------------
// Static files
// -----------------
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// -----------------
// Health check
// -----------------
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// -----------------
// Routes
// -----------------
app.use('/api/auth', require('./routes/auth'));
app.use('/api/business', require('./routes/business'));
app.use('/api/items', require('./routes/items'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/psg', require('./routes/psg'));

// -----------------
// 404 handler
// -----------------
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// -----------------
// Global error handler
// -----------------
app.use((error, req, res, next) => {
  console.error('Global error:', error);

  const isDev = process.env.NODE_ENV === 'development';

  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    ...(isDev && { stack: error.stack })
  });
});

// -----------------
// Start server
// -----------------
const startServer = async () => {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Database connected');

    // Safe sync for deployment
    await db.sequelize.sync();

    console.log('✅ Database synced');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔗 Health check: /health`);
    });

  } catch (error) {
    console.error('❌ Server failed:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  await db.sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await db.sequelize.close();
  process.exit(0);
});

startServer();

module.exports = app;