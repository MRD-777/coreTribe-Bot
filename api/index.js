// Vercel Serverless Function - Main API Handler
const express = require('express');
const { connectToMongo } = require('../services/db');
const apiRouter = require('../routes/api');

const app = express();

// Middleware
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// API routes
app.use('/api', apiRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'CoreTribe Bot API',
    version: '1.0.0',
    status: 'running',
    platform: 'vercel'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).json({ error: '❗ خطأ داخلي في الخادم.' });
});

// Database connection singleton
let dbConnected = false;

module.exports = async (req, res) => {
  try {
    if (!dbConnected) {
      await connectToMongo();
      dbConnected = true;
    }
    app(req, res);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
