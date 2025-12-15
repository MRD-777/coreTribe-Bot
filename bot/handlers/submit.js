// -- file: bot/handlers/submit.js --
const axios = require('axios');
const API_URL = process.env.API_URL || 'http://localhost:3000/api';

module.exports = async (ctx) => {
  try {
    const parts = ctx.message.text.split(' ');
    if (parts.length < 3) {
      return ctx.reply('❗ الصيغة خطأ. استخدم:\n/submit <challengeId> <link>');
    }

    const challengeId = parts[1];
    const link = parts[2];

    // Validate URL
    if (!/^https?:\/\/.+/.test(link)) {
      return ctx.reply('❗ الرابط غير صالح.');
    }

    await axios.post(`${API_URL}/submissions`, {
      userTelegramId: String(ctx.from.id),
      challengeId,
      link
    }, {
      headers: { 'x-bot-secret': process.env.BOT_SECRET }
    });

    await ctx.reply('✅ تم استلام تسليمك بنجاح! سيتم مراجعته قريباً.');

    // Notify Admin
    if (process.env.ADMIN_CHAT_ID) {
      ctx.telegram.sendMessage(
        process.env.ADMIN_CHAT_ID,
        `New submission from @${ctx.from.username} — Challenge ${challengeId}`
      ).catch(() => {});
    }

  } catch (error) {
    console.error('Submit error:', error.message);
    const errMsg = error.response?.data?.error || 'فشل التسليم.';
    ctx.reply(`❗ ${errMsg}`);
  }
};
