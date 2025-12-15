// -- file: routes/users.js --
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Audit = require('../models/Audit');
const authBotSecret = require('../middleware/authBotSecret');
const sanitize = require('../middleware/sanitize');
const rateLimiter = require('../middleware/rateLimiter');
const { upsertUser } = require('../services/db');
const { applyIQCChange } = require('../services/scoring');
const { getTopN, getRank } = require('../services/leaderboard');

// Apply middleware
router.use(sanitize);

// GET /api/users/all (for broadcasting)
router.get('/all', authBotSecret, async (req, res) => {
  try {
    const users = await User.find({}, 'telegramId name username');
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/byTelegram/:telegramId
router.get('/byTelegram/:telegramId', authBotSecret, async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: req.params.telegramId });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/register
router.post('/register', authBotSecret, rateLimiter, async (req, res) => {
  try {
    const { telegramId, username, name } = req.body;
    if (!telegramId) return res.status(400).json({ error: 'telegramId required' });

    const existingUser = await User.findOne({ telegramId });
    const isNew = !existingUser;

    const user = await upsertUser({ telegramId, username, name });
    
    if (isNew) {
      await Audit.create({
        userTelegramId: telegramId,
        action: 'REGISTER',
        reason: 'New user registration',
        ip: req.ip
      });
    }

    res.json({ success: true, user, isNew });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const leaderboard = await getTopN(limit);
    res.json({ success: true, leaderboard });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/:telegramId/adjust
router.post('/:telegramId/adjust', authBotSecret, async (req, res) => {
  try {
    const { telegramId } = req.params;
    const { delta, reason, adminId } = req.body;

    if (typeof delta !== 'number' || !reason) {
      return res.status(400).json({ error: 'delta (number) and reason (string) required' });
    }

    const result = await applyIQCChange(telegramId, delta, reason);
    
    // Log audit
    await Audit.create({
      userTelegramId: telegramId,
      action: 'ADJUST_POINTS',
      adminId: adminId || 'SYSTEM',
      delta,
      reason,
      ip: req.ip
    });

    // Check if level changed and send notification
    if (result.levelChanged) {
      const { notifyLevelPromotion } = require('../services/notifications');
      await notifyLevelPromotion(
        telegramId,
        result.oldLevel,
        result.newLevel,
        result.newIQC
      );
    }

    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
