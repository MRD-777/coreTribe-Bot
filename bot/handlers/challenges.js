// -- file: bot/handlers/challenges.js --
const axios = require('axios');
const { Markup } = require('telegraf');
const API_URL = process.env.API_URL || 'http://localhost:3000/api';

exports.handleChallenges = async (ctx) => {
  try {
    const res = await axios.get(`${API_URL}/challenges`);
    const challenges = res.data.challenges;

    if (!challenges || challenges.length === 0) {
      const msg = 'لا توجد تحديات مفتوحة حالياً.';
      if (ctx.callbackQuery) return ctx.editMessageText(msg);
      return ctx.reply(msg);
    }

    for (const ch of challenges) {
      const msg = `
🎯 ${ch.title}
${ch.description.substring(0, 120)}...
المكافأة: ${ch.reward} IQC
ينتهي: ${new Date(ch.endAt).toLocaleDateString()}
      `.trim();

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('JOIN', `JOIN_${ch._id}`)],
        [Markup.button.callback('VIEW', `VIEW_${ch._id}`)]
      ]);

      await ctx.reply(msg, keyboard);
    }
    
    if (ctx.callbackQuery) await ctx.answerCbQuery();

  } catch (error) {
    console.error('Challenges error:', error.message);
    ctx.reply('❗ خطأ في جلب التحديات.');
  }
};

exports.handleJoinChallenge = async (ctx, challengeId) => {
  try {
    await axios.post(`${API_URL}/challenges/${challengeId}/join`, {
      telegramId: String(ctx.from.id)
    }, {
      headers: { 'x-bot-secret': process.env.BOT_SECRET }
    });

    await ctx.answerCbQuery('✅ تم الانضمام بنجاح!');
    await ctx.reply(`تم تسجيلك في التحدي. للتسليم استخدم:\n/submit ${challengeId} <link>`);
  } catch (error) {
    const errMsg = error.response?.data?.error || 'فشل الانضمام';
    await ctx.answerCbQuery(`❗ ${errMsg}`);
  }
};

exports.handleViewChallenge = async (ctx, challengeId) => {
  try {
    const res = await axios.get(`${API_URL}/challenges/${challengeId}`);
    const ch = res.data.challenge;

    const msg = `
🎯 ${ch.title}
${ch.description}

نوع: ${ch.type}
مكافأة: ${ch.reward}
ينتهي: ${new Date(ch.endAt).toLocaleString()}

مثال تسليم:
/submit ${ch._id} https://github.com/yourname/project
    `.trim();

    await ctx.reply(msg);
    await ctx.answerCbQuery();
  } catch (error) {
    await ctx.answerCbQuery('❗ فشل عرض التفاصيل');
  }
};
