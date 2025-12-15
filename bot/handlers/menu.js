// -- file: bot/handlers/menu.js --
const { Markup } = require('telegraf');

module.exports = async (ctx) => {
  try {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('👤 PROFILE', 'PROFILE')],
      [Markup.button.callback('🎯 CHALLENGES', 'CHALLENGES')],
      [Markup.button.callback('⭐ POINTS', 'POINTS')],
      [Markup.button.callback('❓ HOWTO', 'HOWTO')],
      [Markup.button.callback('📧 راسل الأدمن', 'CONTACT_ADMIN')]
    ]);

    const message = 'اختر من القائمة:';
    
    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, keyboard);
    } else {
      await ctx.reply(message, keyboard);
    }
  } catch (error) {
    console.error('Menu handler error:', error.message);
  }
};
