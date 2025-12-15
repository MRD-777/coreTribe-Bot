const { getUserByTelegramId, updateUserIQC } = require('./db');

// Level thresholds matching the community system
const LEVEL_THRESHOLDS = [
  { level: 1, minIQC: 0 },      // Seeker
  { level: 2, minIQC: 101 },    // Learner
  { level: 3, minIQC: 251 },    // Builder
  { level: 4, minIQC: 501 },    // Creator
  { level: 5, minIQC: 1001 },   // Expert
  { level: 6, minIQC: 2001 },   // Master
  { level: 7, minIQC: 4001 },   // Legend
  { level: 8, minIQC: 8001 }    // Architect
];

/**
 * Compute level based on IQC
 */
function computeLevel(iqc) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (iqc >= LEVEL_THRESHOLDS[i].minIQC) {
      return LEVEL_THRESHOLDS[i].level;
    }
  }
  return 1;
}

/**
 * Apply IQC change to user
 */
async function applyIQCChange(telegramId, delta, reason) {
  const user = await getUserByTelegramId(telegramId);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  const oldIQC = user.iqc;
  const oldLevel = user.level;
  
  const newIQC = Math.max(0, user.iqc + delta);
  const newLevel = computeLevel(newIQC);
  
  const updatedUser = await updateUserIQC(telegramId, newIQC, newLevel);
  
  // Detect level promotion
  const levelChanged = newLevel > oldLevel;
  
  return {
    user: updatedUser,
    oldIQC,
    newIQC,
    oldLevel,
    newLevel,
    levelChanged,
    reason
  };
}

module.exports = {
  computeLevel,
  applyIQCChange,
  LEVEL_THRESHOLDS
};
