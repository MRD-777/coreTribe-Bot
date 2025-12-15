// -- file: bot/handlers/start.js --
const axios = require('axios');
const { Markup } = require('telegraf');
const API_URL = process.env.API_URL || 'http://localhost:3000/api';

module.exports = async (ctx) => {
  try {
    const { id, username, first_name } = ctx.from;
    
    // Register user via API
    const response = await axios.post(`${API_URL}/users/register`, {
      telegramId: String(id),
      username: username || '',
      name: first_name
    }, {
      headers: { 'x-bot-secret': process.env.BOT_SECRET }
    });

    // Send welcome message
    const isOwner = String(id) === process.env.ADMIN_CHAT_ID;
    
    if (isOwner) {
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🏛️ نظام المجتمع', 'COMMUNITY')],
        [Markup.button.callback('📋 القائمة الرئيسية', 'MAIN_MENU')]
      ]);

      await ctx.reply(`
👑 أهلاً بالمالك ${first_name}!

مرحبًا بك في لوحة التحكم الكاملة لـ CoreTribe Bot

🎯 أوامر المستخدم العامة:
/menu - القائمة الرئيسية
/profile - ملفك الشخصي
/challenges - التحديات المتاحة
/submit <id> <link> - تقديم حل

🔧 أوامر المشرف:
/review_list - المشاركات المعلقة
/adjust <id> <±points> <reason> - تعديل النقاط
/ban_user <id> <hours> <reason> - حظر مستخدم
/unban_user <id> - إلغاء حظر
/create_challenge title|desc|date - إنشاء تحدي

👑 أوامر المالك الحصرية:
/update_user <id> <field> <value> - تعديل بيانات مستخدم
/admin_help - عرض كل الأوامر

البوت يعمل بكامل طاقته! 🚀
      `.trim(), keyboard);
    } else {
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🏛️ نظام المجتمع', 'COMMUNITY')],
        [Markup.button.callback('📋 القائمة الرئيسية', 'MAIN_MENU')]
      ]);

      await ctx.reply(
        `أهلاً ${first_name} 👋\nمرحبًا بك في CoreTribe — اختر من القائمة أدناه:`,
        keyboard
      );
    }

    // Notify Admin only if new
    if (process.env.ADMIN_CHAT_ID && response.data.isNew) {
      ctx.telegram.sendMessage(
        process.env.ADMIN_CHAT_ID,
        `New user joined: @${username} (${id}) — ${first_name}`
      ).catch(err => console.error('Admin notify error:', err.message));
    }

  } catch (error) {
    console.error('Start handler error:', error.message);
    ctx.reply('❗ حدث خطأ أثناء التسجيل.');
  }
};
