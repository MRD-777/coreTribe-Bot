const mongoose = require('mongoose');
const Challenge = require('../models/Challenge');

// In-memory fallback
let inMemoryChallenges = [];
let useMongo = false;

// Initialize based on mongoose connection
setTimeout(() => {
  useMongo = mongoose.connection.readyState === 1;
}, 1000);

/**
 * List open challenges (not expired)
 */
async function listOpenChallenges() {
  const now = new Date();
  
  if (useMongo || mongoose.connection.readyState === 1) {
    return await Challenge.find({ endAt: { $gte: now } }).sort({ createdAt: -1 });
  } else {
    return inMemoryChallenges.filter(c => new Date(c.endAt) >= now);
  }
}

/**
 * Get challenge by ID
 */
async function getChallengeById(challengeId) {
  if (useMongo || mongoose.connection.readyState === 1) {
    return await Challenge.findById(challengeId);
  } else {
    return inMemoryChallenges.find(c => c._id === challengeId) || null;
  }
}

/**
 * Join challenge (add user to participants)
 */
async function joinChallenge(challengeId, telegramId) {
  if (useMongo || mongoose.connection.readyState === 1) {
    const challenge = await Challenge.findById(challengeId);
    
    if (!challenge) {
      throw new Error('Challenge not found');
    }
    
    // Check if already joined
    if (challenge.participants.includes(telegramId)) {
      throw new Error('Already joined this challenge');
    }
    
    // Check if challenge hasn't started or expired
    const now = new Date();
    if (now > challenge.endAt) {
      throw new Error('Challenge has ended');
    }
    
    challenge.participants.push(telegramId);
    await challenge.save();
    
    return challenge;
  } else {
    const challenge = inMemoryChallenges.find(c => c._id === challengeId);
    
    if (!challenge) {
      throw new Error('Challenge not found');
    }
    
    if (challenge.participants.includes(telegramId)) {
      throw new Error('Already joined this challenge');
    }
    
    const now = new Date();
    if (now > new Date(challenge.endAt)) {
      throw new Error('Challenge has ended');
    }
    
    challenge.participants.push(telegramId);
    return challenge;
  }
}

/**
 * Create new challenge (in-memory)
 */
function createChallengeInMemory(data) {
  const challenge = {
    _id: Date.now().toString(),
    title: data.title,
    description: data.description,
    type: data.type || 'solo',
    reward: data.reward || 100,
    startAt: data.startAt || new Date(),
    endAt: data.endAt,
    participants: [],
    createdAt: new Date()
  };
  
  inMemoryChallenges.push(challenge);
  return challenge;
}

module.exports = {
  listOpenChallenges,
  getChallengeById,
  joinChallenge,
  createChallengeInMemory
};
