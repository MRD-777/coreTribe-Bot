// Vercel Serverless Function - Telegram Webhook Handler
// Production-ready with idempotency, timeout safety, and proper error handling

const { Telegraf } = require('telegraf');

// Import handlers (lazy loaded for cold start optimization)
let handlersLoaded = false;
let handlers = {};

bot.on('message', (ctx) => {
  console.log('📩 MESSAGE RECEIVED:', ctx.message.text);
  ctx.reply('وصلت رسالة 👍');
});

function loadHandlers() {
  if (handlersLoaded) return handlers;
  
  handlers = {
    db: require('../services/db'),
    start: require('../bot/handlers/start'),
    menu: require('../bot/handlers/menu'),
    profile: require('../bot/handlers/profile'),
    challenges: require('../bot/handlers/challenges'),
    submit: require('../bot/handlers/submit'),
    admin: require('../bot/handlers/admin'),
    community: require('../bot/handlers/community'),
    contact: require('../bot/handlers/contact')
  };
  
  handlersLoaded = true;
  return handlers;
}

// Singleton bot instance (stateless - recreated per cold start)
bot = new Telegraf(process.env.BOT_TOKEN, {
  telegram: { webhookReply: false }
});

function getBot() {
  const h = loadHandlers();

  const bot = new Telegraf(process.env.BOT_TOKEN, {
    telegram: { webhookReply: false }
  });

  console.log('🟢 Bot initialized with token:', process.env.BOT_TOKEN?.slice(0, 10));

  // middlewares
  bot.use(async (ctx, next) => {
    return next();
  });

  bot.command('start', async (ctx) => {
    console.log('🟢 START RECEIVED');
    await ctx.reply('✅ البوت شغال أخيرًا');
  });

  return bot;
}


// Idempotency: Track processed update_ids (in-memory for single instance)
// Note: For multi-instance, use Redis/DB
const processedUpdates = new Set();
const MAX_PROCESSED_UPDATES = 1000;

function isAlreadyProcessed(updateId) {
  if (processedUpdates.has(updateId)) {
    return true;
  }
  
  // Cleanup old entries to prevent memory leak
  if (processedUpdates.size >= MAX_PROCESSED_UPDATES) {
    const entries = Array.from(processedUpdates);
    entries.slice(0, 500).forEach(id => processedUpdates.delete(id));
  }
  
  processedUpdates.add(updateId);
  return false;
}

// Database connection state
let dbConnected = false;

async function ensureDbConnection() {
  if (!dbConnected) {
    const { connectToMongo } = loadHandlers().db;
    await connectToMongo();
    dbConnected = true;
  }
}

// Main handler
module.exports = async (req, res) => {
  // 1. Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // 2. Verify Content-Type (Telegram sends application/json)
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('application/json')) {
    return res.status(400).json({ error: 'Invalid content type' });
  }
  
  // 3. Verify Webhook Secret (if configured)
  const secretToken = req.headers['x-telegram-bot-api-secret-token'];
  if (process.env.WEBHOOK_SECRET) {
    if (secretToken !== process.env.WEBHOOK_SECRET) {
      console.error('Invalid webhook secret');
      return res.status(403).json({ error: 'Forbidden' });
    }
  }
  
  // 4. Validate request body
  const update = req.body;
  if (!update || !update.update_id) {
    return res.status(400).json({ error: 'Invalid update' });
  }
  
  // 5. Idempotency check - prevent duplicate processing
  if (isAlreadyProcessed(update.update_id)) {
    return res.status(200).json({ ok: true, duplicate: true });
  }
  
  // 6. Send 200 OK immediately for timeout safety
  // Telegram will retry if no response within 60s
  res.status(200).json({ ok: true });
  
  // 7. Process update asynchronously (after response sent)
  try {
    await ensureDbConnection();
    const bot = getBot();
    await bot.handleUpdate(update);
  } catch (error) {
    // Log error but don't fail - response already sent
    console.error('Webhook processing error:', error.message);
  }
};
