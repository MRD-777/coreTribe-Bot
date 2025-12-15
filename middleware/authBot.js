const crypto = require('crypto');

// Rate limiting map: { telegramId: lastTimestamp }
const rateLimitMap = new Map();

// Blocked dangerous keywords
const DANGEROUS_KEYWORDS = [
  '$where', '$expr', '$lookup', '$merge', '$accumulator',
  '<script', 'javascript:', 'onerror=', 'onload='
];

/**
 * Middleware: Verify BOT_SECRET header
 */
function verifyBotSecret(req, res, next) {
  const providedSecret = req.headers['x-bot-secret'];
  
  if (!providedSecret || providedSecret !== process.env.BOT_SECRET) {
    return res.status(401).json({ error: '❗ خطأ أمني: وصول غير مصرح.' });
  }
  
  next();
}

/**
 * Middleware: Verify HMAC signature
 */
function verifySignature(req, res, next) {
  const providedSignature = req.headers['x-signature'];
  
  if (!providedSignature) {
    return res.status(401).json({ error: '❗ خطأ أمني: توقيع مفقود.' });
  }
  
  const bodyString = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', process.env.BOT_SECRET)
    .update(bodyString)
    .digest('hex');
  
  if (providedSignature !== expectedSignature) {
    return res.status(401).json({ error: '❗ خطأ أمني: توقيع غير صحيح.' });
  }
  
  next();
}

/**
 * Middleware: Rate limiting (1 request per second per user)
 */
function rateLimit(req, res, next) {
  const telegramId = req.body.telegramId || req.params.telegramId || req.body.userTelegramId;
  
  if (!telegramId) {
    return res.status(400).json({ error: '❗ خطأ: معرف المستخدم مفقود.' });
  }
  
  const now = Date.now();
  const lastRequest = rateLimitMap.get(telegramId);
  
  if (lastRequest && (now - lastRequest) < 1000) {
    return res.status(429).json({ error: '❗ تم إيقافك مؤقتًا بسبب كثرة الطلبات.' });
  }
  
  rateLimitMap.set(telegramId, now);
  next();
}

/**
 * Middleware: Validate payload size and content
 */
function validatePayload(req, res, next) {
  const bodyString = JSON.stringify(req.body);
  
  // Check size (50KB max)
  if (Buffer.byteLength(bodyString, 'utf8') > 50 * 1024) {
    return res.status(413).json({ error: '❗ خطأ: حجم الطلب كبير جدًا.' });
  }
  
  // Check for dangerous keywords
  for (const keyword of DANGEROUS_KEYWORDS) {
    if (bodyString.toLowerCase().includes(keyword.toLowerCase())) {
      return res.status(403).json({ error: '❗ محاولة هجوم تم رصدها وتم منعها.' });
    }
  }
  
  next();
}

/**
 * Middleware: Sanitize string inputs
 */
function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  
  return str
    .replace(/[<>]/g, '')
    .replace(/['"]/g, '')
    .slice(0, 5000); // Max 5000 chars
}

/**
 * Middleware: Validate URL
 */
function validateUrl(url) {
  if (typeof url !== 'string') return false;
  
  const urlPattern = /^https?:\/\/.+/i;
  return urlPattern.test(url);
}

/**
 * Generate HMAC signature for bot requests
 */
function generateSignature(body) {
  const bodyString = JSON.stringify(body);
  return crypto
    .createHmac('sha256', process.env.BOT_SECRET)
    .update(bodyString)
    .digest('hex');
}

module.exports = {
  verifyBotSecret,
  verifySignature,
  rateLimit,
  validatePayload,
  sanitizeInput,
  validateUrl,
  generateSignature
};
