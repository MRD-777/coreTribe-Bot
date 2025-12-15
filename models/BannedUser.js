// -- file: models/BannedUser.js --
const mongoose = require('mongoose');

const bannedUserSchema = new mongoose.Schema({
  telegramId: { type: String, required: true, unique: true },
  reason: { type: String, required: true },
  until: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BannedUser', bannedUserSchema);
