// -- file: routes/admin.js --
const express = require('express');
const router = express.Router();
const Submission = require('../models/Submission');
const BannedUser = require('../models/BannedUser');
const User = require('../models/User');
const Audit = require('../models/Audit');
const adminAuth = require('../middleware/adminAuth');
const sanitize = require('../middleware/sanitize');
const { banUser, unbanUser } = require('../services/db');

router.use(sanitize);
router.use(adminAuth);

// /api/admin/review_list
router.get('/review_list', async (req, res) => {
  try {
    const submissions = await Submission.find({ status: 'pending' }).sort({ createdAt: 1 });
    res.json({ success: true, submissions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// /api/admin/banUser
router.post('/banUser', async (req, res) => {
  try {
    const { telegramId, reason, hours } = req.body;
    if (!telegramId || !reason || !hours) return res.status(400).json({ error: 'Missing fields' });

    const banned = await banUser(telegramId, reason, hours);
    
    await Audit.create({
      userTelegramId: telegramId,
      action: 'BAN_USER',
      reason: reason,
      delta: hours,
      ip: req.ip
    });

    res.json({ success: true, banned });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// /api/admin/unbanUser
router.post('/unbanUser', async (req, res) => {
  try {
    const { telegramId } = req.body;
    if (!telegramId) return res.status(400).json({ error: 'telegramId required' });

    await unbanUser(telegramId);
    
    await Audit.create({
      userTelegramId: telegramId,
      action: 'UNBAN_USER',
      reason: 'Admin unban',
      ip: req.ip
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// /api/admin/updateUser (Owner only - controlled by bot handler)
router.post('/updateUser', async (req, res) => {
  try {
    const { telegramId, field, value } = req.body;
    if (!telegramId || !field) return res.status(400).json({ error: 'telegramId and field required' });

    const user = await User.findOne({ telegramId });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Simple field update (be careful with this in production)
    if (field === 'iqc') user.iqc = Number(value);
    else if (field === 'level') user.level = Number(value);
    else if (field === 'name') user.name = value;
    else if (field === 'username') user.username = value;
    else return res.status(400).json({ error: 'Invalid field' });

    await user.save();
    
    await Audit.create({
      userTelegramId: telegramId,
      action: 'UPDATE_USER',
      reason: `Field ${field} updated to ${value}`,
      ip: req.ip
    });

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const usersCount = await User.countDocuments();
    const submissionsCount = await Submission.countDocuments();
    const pendingCount = await Submission.countDocuments({ status: 'pending' });
    
    res.json({
      success: true,
      stats: {
        users: usersCount,
        submissions: submissionsCount,
        pending: pendingCount
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
