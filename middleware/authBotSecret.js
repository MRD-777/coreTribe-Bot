const crypto = require('crypto');

module.exports = function authBotSecret(req, res, next) {
  const secret = req.headers['x-bot-secret'];
  if (!secret || secret !== process.env.BOT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized: Invalid Bot Secret' });
  }
  next();
};
