// Vercel Serverless Function - Telegram Webhook Handler
// Production-ready with idempotency, timeout safety, and proper error handling

const { Telegraf } = require('telegraf');

// Import handlers (lazy loaded for cold start optimization)
let handlersLoaded = false;
let handlers = {};

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
  if (bot) return bot;
  
  const h = loadHandlers();
  bot = new Telegraf(process.env.BOT_TOKEN);
  
  // Global middleware: Check if user is banned
  bot.use(async (ctx, next) => {
    if (ctx.from) {
      const telegramId = String(ctx.from.id);
      const banned = await h.db.isUserBanned(telegramId);
      
      if (banned) {
        const until = new Date(banned.until).toLocaleString('ar-EG');
        return ctx.reply(`❗ حسابك موقوف حتى ${until}\n\nالسبب: ${banned.reason}`);
      }
    }
    return next();
  });
  
  // Global middleware: Validate ctx.from exists
  bot.use(async (ctx, next) => {
    if (!ctx.from && ctx.updateType !== 'callback_query') {
      return; // Silent skip - no console spam
    }
    return next();
  });
  
  // Command handlers
  bot.command('start', h.start);
  bot.command('menu', h.menu);
  bot.command('profile', h.profile.handleProfile);
  bot.command('challenges', h.challenges.handleChallenges);
  bot.command('submit', h.submit);
  
  // Admin commands
  bot.command('review_list', h.admin.handleReviewList);
  bot.command('adjust', h.admin.handleAdjust);
  bot.command('ban_user', h.admin.handleBanUser);
  bot.command('unban_user', h.admin.handleUnbanUser);
  bot.command('create_challenge', h.admin.handleCreateChallenge);
  bot.command('update_user', h.admin.handleUpdateUser);
  bot.command('admin_help', h.admin.handleAdminHelp);
  
  // Callback query handlers - Main menu
  bot.action('MAIN_MENU', h.menu);
  bot.action('PROFILE', h.profile.handleProfile);
  bot.action('CHALLENGES', h.challenges.handleChallenges);
  bot.action('POINTS', h.profile.handlePoints);
  bot.action('HOWTO', h.profile.handleHowTo);
  bot.action('CONTACT_ADMIN', h.contact.handleContactAdmin);
  
  // Callback query handlers - Community system
  bot.action('COMMUNITY', h.community.handleCommunitySystem);
  bot.action('POINTS_SYSTEM', h.community.handlePointsSystem);
  bot.action('LEVELS_SYSTEM', h.community.handleLevelsSystem);
  bot.action('COMMUNITY_RULES', h.community.handleCommunityRules);
  bot.action('BACK_TO_MENU', h.menu);
  
  // Dynamic callback handlers for challenges
  bot.action(/^JOIN_(.+)$/, async (ctx) => {
    const challengeId = ctx.match[1];
    await h.challenges.handleJoinChallenge(ctx, challengeId);
  });
  
  bot.action(/^VIEW_(.+)$/, async (ctx) => {
    const challengeId = ctx.match[1];
    await h.challenges.handleViewChallenge(ctx, challengeId);
  });
  
  // Text message handler - for contact admin
  bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    if (h.contact.isWaitingForMessage(userId)) {
      await h.contact.handleUserMessage(ctx);
    }
  });
  
  // Error handler - log only errors
  bot.catch((err) => {
    console.error('Bot error:', err.message);
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
