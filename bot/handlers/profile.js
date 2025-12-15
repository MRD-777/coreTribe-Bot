// -- file: bot/handlers/profile.js --
const axios = require('axios');
const API_URL = process.env.API_URL || 'http://localhost:3000/api';

async function getProfile(telegramId) {
  const res = await axios.get(`${API_URL}/users/byTelegram/${telegramId}`, {
    headers: { 'x-bot-secret': process.env.BOT_SECRET }
  });
  return res.data.user;
}

async function getRank(telegramId) {
  // Simple rank implementation - in real app might need dedicated endpoint
  const res = await axios.get(`${API_URL}/users/leaderboard?limit=1000`);
  const leaderboard = res.data.leaderboard;
  const index = leaderboard.findIndex(u => u.telegramId === String(telegramId));
  return index !== -1 ? index + 1 : 'N/A';
}

exports.handleProfile = async (ctx) => {
  try {
    const telegramId = ctx.from.id;
    const user = await getProfile(telegramId);
    const rank = await getRank(telegramId);

    const msg = `
👤 الملف الشخصي

الاسم: ${user.name}
المعرف: @${user.username || 'غير محدد'}
النقاط (IQC): ${user.iqc}
المستوى: ${user.level}
الترتيب: #${rank}
آخر نشاط: ${new Date(user.lastActive).toLocaleDateString('ar-EG')}
عدد المشاركات: 0
    `.trim();

    if (ctx.callbackQuery) {
      await ctx.editMessageText(msg);
    } else {
      await ctx.reply(msg);
    }
  } catch (error) {
    console.error('Profile error:', error.message);
    ctx.reply('❗ خطأ في جلب البيانات.');
  }
};

exports.handlePoints = async (ctx) => {
  try {
    const user = await getProfile(ctx.from.id);
    const msg = `
⭐ نقاطك (IQC)

النقاط الحالية: ${user.iqc}
المستوى: ${user.level}

لزيادة نقاطك:
- شارك في التحديات (/challenges)
- قدّم حلولًا مبتكرة
- تفاعل مع المجتمع
    `.trim();
    
    if (ctx.callbackQuery) {
      await ctx.editMessageText(msg);
    } else {
      await ctx.reply(msg);
    }
  } catch (error) {
    ctx.reply('❗ خطأ في جلب النقاط.');
  }
};

exports.handleHowTo = async (ctx) => {
  const msg = `
❓ كيفية الاستخدام

الأوامر الأساسية:
/start - التسجيل في البوت
/menu - القائمة الرئيسية
/profile - عرض ملفك الشخصي
/challenges - التحديات المتاحة

المشاركة في تحدي:
1. اختر تحديًا من /challenges
2. اضغط على JOIN للانضمام
3. قدّم حلك باستخدام:
   /submit <challengeId> <رابط_المشروع>

مثال:
/submit 12345 https://github.com/username/project

الحصول على النقاط:
- قدّم حلولًا للتحديات
- انتظر مراجعة المشرفين
- احصل على نقاط IQC عند القبول
  `.trim();

  if (ctx.callbackQuery) {
    await ctx.editMessageText(msg);
  } else {
    await ctx.reply(msg);
  }
};
