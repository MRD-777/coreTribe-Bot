// -- file: routes/challenges.js --
const express = require('express');
const router = express.Router();
const Challenge = require('../models/Challenge');
const Audit = require('../models/Audit');
const authBotSecret = require('../middleware/authBotSecret');
const sanitize = require('../middleware/sanitize');
const { listOpenChallenges, joinChallenge, getChallengeById } = require('../services/challengesService');

router.use(sanitize);

// GET /api/challenges (Open only)
router.get('/', async (req, res) => {
  try {
    const challenges = await listOpenChallenges();
    res.json({ success: true, challenges });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/challenges (Create new challenge)
router.post('/', authBotSecret, async (req, res) => {
  try {
    const { title, description, type, reward, endAt } = req.body;
    if (!title || !endAt) return res.status(400).json({ error: 'Title and endAt required' });

    const challenge = await Challenge.create({
      title,
      description,
      type: type || 'solo',
      reward: reward || 0,
      endAt: new Date(endAt),
      participants: []
    });

    await Audit.create({
      userTelegramId: 'SYSTEM',
      action: 'CREATE_CHALLENGE',
      reason: `Created challenge ${title}`,
      ip: req.ip
    });

    res.json({ success: true, challenge });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/challenges/:id
router.get('/:id', async (req, res) => {
  try {
    const challenge = await getChallengeById(req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    res.json({ success: true, challenge });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/challenges/:id/join
router.post('/:id/join', authBotSecret, async (req, res) => {
  try {
    const { telegramId } = req.body;
    if (!telegramId) return res.status(400).json({ error: 'telegramId required' });

    const challenge = await joinChallenge(req.params.id, telegramId);
    
    await Audit.create({
      userTelegramId: telegramId,
      action: 'JOIN_CHALLENGE',
      reason: `Joined challenge ${challenge.title}`,
      ip: req.ip
    });

    res.json({ success: true, challenge });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
