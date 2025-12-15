// -- file: bot/handlers/contact.js --

/**
 * Contact Admin Handler
 * Allows users to send messages directly to admin
 */

const userStates = new Map();

/**
 * Handle CONTACT_ADMIN callback - prompt user to send message
 */
exports.handleContactAdmin = async (ctx) => {
  try {
    const userId = ctx.from.id;
    userStates.set(userId, 'waiting_for_message');

    const msg = `
📧 راسل الأدمن

اكتب رسالتك الآن وسيتم إرسالها للإدارة.

💡 يمكنك إرسال:
• استفسار
• شكوى
• اقتراح
• أي موضوع آخر

اكتب رسالتك...
    `.trim();

    if (ctx.callbackQuery) {
      await ctx.editMessageText(msg);
    } else {
      await ctx.reply(msg);
    }
  } catch (error) {
    console.error('Contact admin error:', error.message);
  }
};

/**
 * Handle incoming message when user is in contact mode
 */
exports.handleUserMessage = async (ctx) => {
  const userId = ctx.from.id;
  
  // Check if user is in contact mode
  if (userStates.get(userId) !== 'waiting_for_message') {
    return; // Not waiting for message
  }

  try {
    const message = ctx.message.text;
    const username = ctx.from.username || 'بدون معرف';
    const name = ctx.from.first_name || 'مستخدم';

    // Send to admin
    if (process.env.ADMIN_CHAT_ID) {
      const adminMsg = `
📬 رسالة جديدة من مستخدم

👤 من: ${name} (@${username})
🆔 ID: ${userId}

📝 الرسالة:
${message}
      `.trim();

      await ctx.telegram.sendMessage(process.env.ADMIN_CHAT_ID, adminMsg);
      
      // Confirm to user
      await ctx.reply('✅ تم إرسال رسالتك للإدارة بنجاح!\n\nسيتم الرد عليك في أقرب وقت.');
    } else {
      await ctx.reply('❌ خطأ: لم يتم تعيين حساب الأدمن.');
    }

    // Clear user state
    userStates.delete(userId);
  } catch (error) {
    console.error('Handle user message error:', error.message);
    ctx.reply('❌ حدث خطأ أثناء إرسال الرسالة.');
    userStates.delete(userId);
  }
};

/**
 * Check if user is in contact mode
 */
exports.isWaitingForMessage = (userId) => {
  return userStates.get(userId) === 'waiting_for_message';
};
