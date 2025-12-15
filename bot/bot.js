const { Telegraf } = require('telegraf');
const { isUserBanned } = require('../services/db');

// Import handlers
const handleStart = require('./handlers/start');
const handleMenu = require('./handlers/menu');
const { handleProfile, handlePoints, handleHowTo } = require('./handlers/profile');
const { handleChallenges, handleJoinChallenge, handleViewChallenge } = require('./handlers/challenges');
const handleSubmit = require('./handlers/submit');
const {
  handleReviewList,
  handleAdjust,
  handleBanUser,
  handleUnbanUser,
  handleAdminHelp,
  handleCreateChallenge,
  handleUpdateUser
} = require('./handlers/admin');
const {
  handleCommunitySystem,
  handlePointsSystem,
  handleLevelsSystem,
  handleCommunityRules
} = require('./handlers/community');
const {
  handleContactAdmin,
  handleUserMessage,
  isWaitingForMessage
} = require('./handlers/contact');

/**
 * Initialize Telegram bot
 */
function initBot() {
  const bot = new Telegraf(process.env.BOT_TOKEN);
  
  // Global middleware: Check if user is banned
  bot.use(async (ctx, next) => {
    if (ctx.from) {
      const telegramId = String(ctx.from.id);
      const banned = await isUserBanned(telegramId);
      
      if (banned) {
        const until = new Date(banned.until).toLocaleString('ar-EG');
        return ctx.reply(
          `❗ حسابك موقوف حتى ${until}\n\nالسبب: ${banned.reason}`
        );
      }
    }
    
    return next();
  });
  
  // Global middleware: Validate ctx.from exists
  bot.use(async (ctx, next) => {
    if (!ctx.from && ctx.updateType !== 'callback_query') {
      console.warn('Received update without ctx.from:', ctx.updateType);
      return;
    }
    
    return next();
  });
  
  // Command handlers
  bot.command('start', handleStart);
  bot.command('menu', handleMenu);
  bot.command('profile', handleProfile);
  bot.command('challenges', handleChallenges);
  bot.command('submit', handleSubmit);
  
  // Admin commands
  bot.command('review_list', handleReviewList);
  bot.command('adjust', handleAdjust);
  bot.command('ban_user', handleBanUser);
  bot.command('unban_user', handleUnbanUser);
  bot.command('create_challenge', handleCreateChallenge);
  bot.command('update_user', handleUpdateUser);
  bot.command('admin_help', handleAdminHelp);
  
  // Callback query handlers - Main menu
  bot.action('MAIN_MENU', handleMenu);
  bot.action('PROFILE', handleProfile);
  bot.action('CHALLENGES', handleChallenges);
  bot.action('POINTS', handlePoints);
  bot.action('HOWTO', handleHowTo);
  bot.action('CONTACT_ADMIN', handleContactAdmin);
  
  // Callback query handlers - Community system
  bot.action('COMMUNITY', handleCommunitySystem);
  bot.action('POINTS_SYSTEM', handlePointsSystem);
  bot.action('LEVELS_SYSTEM', handleLevelsSystem);
  bot.action('COMMUNITY_RULES', handleCommunityRules);
  bot.action('BACK_TO_MENU', handleMenu);
  
  // Dynamic callback handlers for challenges
  bot.action(/^JOIN_(.+)$/, async (ctx) => {
    const challengeId = ctx.match[1];
    await handleJoinChallenge(ctx, challengeId);
  });
  
  bot.action(/^VIEW_(.+)$/, async (ctx) => {
    const challengeId = ctx.match[1];
    await handleViewChallenge(ctx, challengeId);
  });
  
  // Text message handler - for contact admin
  bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    
    // Check if user is waiting to send message to admin
    if (isWaitingForMessage(userId)) {
      await handleUserMessage(ctx);
    }
  });
  
  // Error handler
  bot.catch((err, ctx) => {
    console.error('Bot error:', err);
    ctx.reply('❗ حدث خطأ غير متوقع. حاول مرة أخرى.');
  });
  
  return bot;
}

module.exports = { initBot };
