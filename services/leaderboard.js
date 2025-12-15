const { listTopUsers, getUserByTelegramId } = require('./db');

/**
 * Get user rank by IQC
 */
async function getRank(telegramId) {
  const topUsers = await listTopUsers(1000); // Get more users to find rank
  
  const index = topUsers.findIndex(u => u.telegramId === telegramId);
  
  if (index === -1) {
    return null; // User not found
  }
  
  return index + 1;
}

/**
 * Get top N users
 */
async function getTopN(n = 20) {
  return await listTopUsers(n);
}

module.exports = {
  getRank,
  getTopN
};
