// -- file: services/notifications.js --

/**
 * Notification Service
 * Handles sending notifications to users for various events
 */

let botInstance = null;

/**
 * Initialize the notification service with bot instance
 */
function initNotifications(bot) {
  botInstance = bot;
}

/**
 * Broadcast new challenge to all users
 */
async function notifyNewChallenge(challenge, usersList) {
  if (!botInstance) return;

  const message = `
🎯 تحدي جديد متاح الآن!

📌 ${challenge.title}

${challenge.description.substring(0, 150)}...

🏆 المكافأة: ${challenge.reward} IQC
⏰ ينتهي في: ${new Date(challenge.endAt).toLocaleDateString('ar-EG')}

شارك الآن: /challenges
  `.trim();

  // Send to all users (with rate limiting)
  for (const user of usersList) {
    try {
      await botInstance.telegram.sendMessage(user.telegramId, message);
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to notify user ${user.telegramId}:`, error.message);
    }
  }
}

/**
 * Notify user about level promotion
 */
async function notifyLevelPromotion(telegramId, oldLevel, newLevel, currentIQC) {
  if (!botInstance) return;

  const levelNames = {
    1: 'Seeker (الباحث)',
    2: 'Learner (المتعلم)',
    3: 'Builder (البنّاء)',
    4: 'Creator (المبدع)',
    5: 'Expert (الخبير)',
    6: 'Master (المحترف)',
    7: 'Legend (الأسطورة)',
    8: 'Architect (المهندس)'
  };

  const message = `
🎉 مبروك! تمت ترقيتك!

📈 المستوى القديم: ${oldLevel} - ${levelNames[oldLevel] || 'غير معروف'}
🌟 المستوى الجديد: ${newLevel} - ${levelNames[newLevel] || 'غير معروف'}

💎 نقاطك الحالية: ${currentIQC} IQC

استمر في التميز! 🚀
  `.trim();

  try {
    await botInstance.telegram.sendMessage(telegramId, message);
  } catch (error) {
    console.error(`Failed to notify level promotion to ${telegramId}:`, error.message);
  }
}

/**
 * Notify user about being banned
 */
async function notifyUserBanned(telegramId, reason, hours, bannedUntil) {
  if (!botInstance) return;

  const message = `
🚫 تم حظر حسابك مؤقتًا

⏱️ مدة الحظر: ${hours} ساعة
📅 ينتهي الحظر في: ${new Date(bannedUntil).toLocaleString('ar-EG')}

📋 السبب:
${reason}

⚠️ يمكنك التواصل مع الإدارة للاستفسار أو الاعتراض.
نأمل منك الالتزام بقوانين المجتمع في المستقبل.
  `.trim();

  try {
    await botInstance.telegram.sendMessage(telegramId, message);
  } catch (error) {
    console.error(`Failed to notify ban to ${telegramId}:`, error.message);
  }
}

/**
 * Notify user about being unbanned
 */
async function notifyUserUnbanned(telegramId) {
  if (!botInstance) return;

  const message = `
✅ تم إلغاء حظر حسابك

يمكنك الآن استخدام البوت والمشاركة في المجتمع بشكل طبيعي.
نتمنى لك تجربة مفيدة! 🎯
  `.trim();

  try {
    await botInstance.telegram.sendMessage(telegramId, message);
  } catch (error) {
    console.error(`Failed to notify unban to ${telegramId}:`, error.message);
  }
}

module.exports = {
  initNotifications,
  notifyNewChallenge,
  notifyLevelPromotion,
  notifyUserBanned,
  notifyUserUnbanned
};
