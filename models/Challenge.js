const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['solo', 'team', 'mini'],
    default: 'solo'
  },
  reward: {
    type: Number,
    required: true,
    default: 100
  },
  startAt: {
    type: Date,
    default: Date.now
  },
  endAt: {
    type: Date,
    required: true
  },
  participants: [{
    type: String // telegramId
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Challenge', challengeSchema);
