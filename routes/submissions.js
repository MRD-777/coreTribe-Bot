const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Submission = require('../models/Submission');
const { verifyBotSecret, rateLimit, validatePayload, validateUrl, sanitizeInput } = require('../middleware/authBot');
const { getChallengeById } = require('../services/challengesService');
const { getUserByTelegramId, addAudit } = require('../services/db');
const { applyIQCChange } = require('../services/scoring');

// In-memory fallback
let inMemorySubmissions = [];

/**
 * POST /api/submissions
 * Submit a challenge solution
 */
router.post('/', verifyBotSecret, validatePayload, rateLimit, async (req, res) => {
  try {
    const { userTelegramId, challengeId, link } = req.body;
    
    if (!userTelegramId || !challengeId || !link) {
      return res.status(400).json({ error: '❗ خطأ: البيانات المطلوبة مفقودة.' });
    }
    
    // Validate URL
    if (!validateUrl(link)) {
      return res.status(400).json({ error: '❗ خطأ: الرابط غير صحيح. يجب أن يبدأ بـ http أو https.' });
    }
    
    // Check if challenge exists
    const challenge = await getChallengeById(challengeId);
    if (!challenge) {
      return res.status(404).json({ error: '❗ خطأ: التحدي غير موجود.' });
    }
    
    // Check if challenge has ended
    const now = new Date();
    if (now > new Date(challenge.endAt)) {
      return res.status(400).json({ error: '❗ خطأ: التحدي قد انتهى. لا يمكن إرسال مشاركة.' });
    }
    
    // Check if user exists
    const user = await getUserByTelegramId(userTelegramId);
    if (!user) {
      return res.status(404).json({ error: '❗ خطأ: المستخدم غير موجود.' });
    }
    
    const submissionData = {
      userTelegramId,
      challengeId,
      link: sanitizeInput(link),
      status: 'pending',
      score: 0,
      note: '',
      createdAt: new Date()
    };
    
    let submission;
    
    if (mongoose.connection.readyState === 1) {
      submission = new Submission(submissionData);
      await submission.save();
    } else {
      submission = {
        ...submissionData,
        _id: Date.now().toString()
      };
      inMemorySubmissions.push(submission);
    }
    
    await addAudit(userTelegramId, 'SUBMISSION_CREATE', `Submitted challenge: ${challenge.title}`);
    
    res.json({ success: true, submission });
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({ error: '❗ خطأ: فشل إرسال المشاركة.' });
  }
});

/**
 * GET /api/submissions/pending
 * List pending submissions (admin)
 */
router.get('/pending', verifyBotSecret, async (req, res) => {
  try {
    let submissions;
    
    if (mongoose.connection.readyState === 1) {
      submissions = await Submission.find({ status: 'pending' })
        .sort({ createdAt: -1 })
        .limit(50);
    } else {
      submissions = inMemorySubmissions
        .filter(s => s.status === 'pending')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 50);
    }
    
    res.json({ success: true, submissions });
  } catch (error) {
    console.error('List pending submissions error:', error);
    res.status(500).json({ error: '❗ خطأ: فشل جلب المشاركات.' });
  }
});

/**
 * POST /api/submissions/:id/review
 * Review submission (admin)
 */
router.post('/:id/review', verifyBotSecret, validatePayload, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, score, note } = req.body;
    
    if (!action || !['accept', 'reject'].includes(action)) {
      return res.status(400).json({ error: '❗ خطأ: الإجراء غير صحيح.' });
    }
    
    let submission;
    
    if (mongoose.connection.readyState === 1) {
      submission = await Submission.findById(id);
    } else {
      submission = inMemorySubmissions.find(s => s._id === id);
    }
    
    if (!submission) {
      return res.status(404).json({ error: '❗ خطأ: المشاركة غير موجودة.' });
    }
    
    submission.status = action === 'accept' ? 'accepted' : 'rejected';
    submission.note = sanitizeInput(note || '');
    
    if (action === 'accept' && score) {
      submission.score = Number(score);
      
      // Update user IQC
      await applyIQCChange(submission.userTelegramId, submission.score, 'Challenge accepted');
    }
    
    if (mongoose.connection.readyState === 1) {
      await submission.save();
    }
    
    await addAudit(submission.userTelegramId, 'SUBMISSION_REVIEW', `Submission ${action}ed with score: ${score || 0}`);
    
    res.json({ success: true, submission });
  } catch (error) {
    console.error('Review submission error:', error);
    res.status(500).json({ error: '❗ خطأ: فشل مراجعة المشاركة.' });
  }
});

module.exports = router;
