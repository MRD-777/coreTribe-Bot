// -- file: bot/handlers/admin.js --
const axios = require('axios');
const API_URL = process.env.API_URL || 'http://localhost:3000/api';

const isAdmin = (ctx) => String(ctx.from.id) === process.env.ADMIN_CHAT_ID;

exports.handleReviewList = async (ctx) => {
  if (!isAdmin(ctx)) return;
  try {
    const res = await axios.get(`${API_URL}/admin/review_list`, {
      headers: { 'x-bot-secret': process.env.BOT_SECRET }
    });
    
    const subs = res.data.submissions;
    if (!subs.length) return ctx.reply('لا يوجد تسليمات معلقة.');

    // Send each submission separately
    for (const sub of subs) {
      // Get challenge details
      let challengeTitle = 'غير معروف';
      try {
        const challengeRes = await axios.get(`${API_URL}/challenges/${sub.challengeId}`, {
          headers: { 'x-bot-secret': process.env.BOT_SECRET }
        });
        challengeTitle = challengeRes.data.challenge.title;
      } catch (err) {
        // Challenge not found
      }

      const msg = `
🎯 ${challengeTitle}

📋 Submission ID: ${sub._id}
👤 User: ${sub.userTelegramId}
🔗 Link: ${sub.link}
📅 Date: ${new Date(sub.createdAt).toLocaleDateString('ar-EG')}

⏳ الحالة: قيد المراجعة
      `.trim();

      await ctx.reply(msg);
      await new Promise(resolve => setTimeout(resolve, 200)); // Small delay
    }
    
  } catch (error) {
    ctx.reply('Error fetching list');
  }
};

exports.handleAdjust = async (ctx) => {
  if (!isAdmin(ctx)) return;
  // /adjust <telegramId> <delta> <reason>
  const parts = ctx.message.text.split(' ');
  if (parts.length < 4) return ctx.reply('Usage: /adjust <id> <delta> <reason>');

  const targetId = parts[1];
  const delta = parseInt(parts[2]);
  const reason = parts.slice(3).join(' ');

  try {
    const response = await axios.post(`${API_URL}/users/${targetId}/adjust`, {
      delta,
      reason,
      adminId: String(ctx.from.id)
    }, {
      headers: { 'x-bot-secret': process.env.BOT_SECRET }
    });
    
    const result = response.data.result;
    
    ctx.reply('✅ Points adjusted successfully.');
    
    // Notify user about points change
    try {
      await ctx.telegram.sendMessage(targetId, `تم تعديل نقاطك: ${delta > 0 ? '+' : ''}${delta}\nالسبب: ${reason}\n\nنقاطك الجديدة: ${result.newIQC}`);
    } catch (notifyError) {
      console.error('Failed to notify user:', notifyError.message);
    }

  } catch (error) {
    console.error('Adjust error:', error);
    ctx.reply('Error adjusting points');
  }
};

exports.handleAdminHelp = (ctx) => {
  if (!isAdmin(ctx)) return;
  
  const isOwner = String(ctx.from.id) === process.env.ADMIN_CHAT_ID;
  
  let msg = `
🔧 أوامر المشرف

📋 إدارة المشاركات:
/review_list - عرض المشاركات قيد المراجعة

⭐ إدارة النقاط:
/adjust <telegramId> <+/-points> <reason>
تعديل نقاط أي مستخدم

🚫 إدارة الحظر:
/ban_user <telegramId> <hours> <reason>
حظر مستخدم مؤقتًا

✅ /unban_user <telegramId>
إلغاء حظر مستخدم

🎯 إدارة التحديات:
/create_challenge title|description|YYYY-MM-DD
إنشاء تحدي جديد

📌 أمثلة:
/adjust 123456789 +100 مشاركة ممتازة
/adjust 987654321 -50 مخالفة القواعد
/ban_user 987654321 24 spam
/unban_user 987654321
/create_challenge تحدي البرمجة|اصنع تطبيق ويب|2025-12-31
  `.trim();

  if (isOwner) {
    msg += `\n\n👑 أوامر المالك (حصرية):
/update_user <telegramId> <field> <value>
تعديل بيانات أي مستخدم مباشرة

الحقول المتاحة: iqc, level, name, username

مثال:
/update_user 123456789 iqc 1000
/update_user 123456789 level 10
/update_user 123456789 name محمد`;
  }

  msg += '\n\n/admin_help - عرض هذه الرسالة';

  ctx.reply(msg);
};

exports.handleCreateChallenge = async (ctx) => {
  if (!isAdmin(ctx)) return;
  // /create_challenge title|desc|2025-12-31
  const args = ctx.message.text.replace('/create_challenge ', '').split('|');
  if (args.length < 3) return ctx.reply('Usage: /create_challenge title|desc|YYYY-MM-DD');

  try {
    const response = await axios.post(`${API_URL}/challenges`, {
      title: args[0].trim(),
      description: args[1].trim(),
      endAt: args[2].trim(),
      type: 'solo',
      reward: 100
    }, { headers: { 'x-bot-secret': process.env.BOT_SECRET } });
    
    const challenge = response.data.challenge;
    
    ctx.reply('✅ Challenge created. Broadcasting to all users...');
    
    // Get all users and broadcast
    try {
      const usersResponse = await axios.get(`${API_URL}/users/all`, {
        headers: { 'x-bot-secret': process.env.BOT_SECRET }
      });
      
      const users = usersResponse.data.users || [];
      
      // Broadcast notification
      for (const user of users) {
        try {
          const message = `
🎯 تحدي جديد متاح الآن!

📌 ${challenge.title}

${challenge.description.substring(0, 150)}${challenge.description.length > 150 ? '...' : ''}

🏆 المكافأة: ${challenge.reward} IQC
⏰ ينتهي في: ${new Date(challenge.endAt).toLocaleDateString('ar-EG')}

شارك الآن: /challenges
          `.trim();
          
          await ctx.telegram.sendMessage(user.telegramId, message);
          await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
        } catch (err) {
          // Silent fail for individual users
        }
      }
      
      ctx.reply(`✅ Broadcast sent to ${users.length} users.`);
    } catch (broadcastError) {
      ctx.reply('⚠️ Challenge created but broadcast failed.');
    }
    
  } catch (e) { 
    ctx.reply('Error creating challenge');
  }
};

exports.handleUpdateUser = async (ctx) => {
  if (String(ctx.from.id) !== process.env.ADMIN_CHAT_ID) return ctx.reply('⛔ Owner only command.');
  
  // /update_user <id> <field> <value>
  const parts = ctx.message.text.split(' ');
  if (parts.length < 4) return ctx.reply('Usage: /update_user <id> <field> <value>');

  try {
    await axios.post(`${API_URL}/admin/updateUser`, {
      telegramId: parts[1],
      field: parts[2],
      value: parts.slice(3).join(' ')
    }, { headers: { 'x-bot-secret': process.env.BOT_SECRET } });
    ctx.reply('✅ User updated.');
  } catch (e) { ctx.reply('Error updating user'); }
};

exports.handleBanUser = async (ctx) => {
  if (!isAdmin(ctx)) return;
  const parts = ctx.message.text.split(' ');
  if (parts.length < 4) return ctx.reply('Usage: /ban_user <id> <hours> <reason>');

  const telegramId = parts[1];
  const hours = parseInt(parts[2]);
  const reason = parts.slice(3).join(' ');

  try {
    const response = await axios.post(`${API_URL}/admin/banUser`, {
      telegramId,
      hours,
      reason
    }, { headers: { 'x-bot-secret': process.env.BOT_SECRET } });
    
    const bannedUntil = response.data.banned.until;
    
    ctx.reply('✅ User banned.');
    
    // Notify user with detailed message
    try {
      const message = `
🚫 تم حظر حسابك مؤقتًا

⏱️ مدة الحظر: ${hours} ساعة
📅 ينتهي الحظر في: ${new Date(bannedUntil).toLocaleString('ar-EG')}

📋 السبب:
${reason}

⚠️ يمكنك التواصل مع الإدارة للاستفسار أو الاعتراض.
نأمل منك الالتزام بقوانين المجتمع في المستقبل.
      `.trim();
      
      await ctx.telegram.sendMessage(telegramId, message);
    } catch (notifyError) {
      console.error('Failed to notify banned user:', notifyError.message);
    }
  } catch (e) { 
    ctx.reply('Error banning user');
  }
};

exports.handleUnbanUser = async (ctx) => {
  if (!isAdmin(ctx)) return;
  const parts = ctx.message.text.split(' ');
  if (parts.length < 2) return ctx.reply('Usage: /unban_user <id>');

  try {
    await axios.post(`${API_URL}/admin/unbanUser`, {
      telegramId: parts[1]
    }, { headers: { 'x-bot-secret': process.env.BOT_SECRET } });
    ctx.reply('✅ User unbanned.');
    
    // Notify user
    try {
      const message = `
✅ تم إلغاء حظر حسابك

يمكنك الآن استخدام البوت والمشاركة في المجتمع بشكل طبيعي.
نتمنى لك تجربة مفيدة! 🎯
      `.trim();
      
      await ctx.telegram.sendMessage(parts[1], message);
    } catch (notifyError) {
      console.error('Failed to notify unbanned user:', notifyError.message);
    }
  } catch (e) { ctx.reply('Error unbanning user'); }
};
