// -- file: routes/api.js --
const express = require('express');
const router = express.Router();
const helmet = require('helmet');
const compression = require('compression');

// Middleware
router.use(helmet());
router.use(compression());
router.use(express.json());

// Import Routes
const usersRoutes = require('./users');
const challengesRoutes = require('./challenges');
const submissionsRoutes = require('./submissions');
const adminRoutes = require('./admin');

// Mount Routes
router.use('/users', usersRoutes);
router.use('/challenges', challengesRoutes);
router.use('/submissions', submissionsRoutes);
router.use('/admin', adminRoutes);

// 404 for unknown API routes
router.use((req, res) => {
  res.status(404).json({ error: 'API Endpoint Not Found' });
});

module.exports = router;
