// -- file: models/Audit.js --
const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema({
  userTelegramId: { type: String, required: true, index: true },
  action: { type: String, required: true },
  adminId: { type: String },
  delta: { type: Number },
  reason: { type: String },
  ip: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Audit', auditSchema);
