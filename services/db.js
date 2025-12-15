const mongoose = require('mongoose');
const User = require('../models/User');
const Audit = require('../models/Audit');
const BannedUser = require('../models/BannedUser');

// In-memory fallback storage
let useMongo = false;
let inMemoryUsers = [];
let inMemoryAudits = [];
let inMemoryBanned = [];

/**
 * Connect to MongoDB or use in-memory fallback
 */
async function connectToMongo() {
  const mongoUri = process.env.MONGO_URI;
  
  if (!mongoUri) {
    console.log('⚠️  MONGO_URI not found. Using in-memory storage.');
    useMongo = false;
    return;
  }
  
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    useMongo = true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('⚠️  Falling back to in-memory storage.');
    useMongo = false;
  }
}

/**
 * Get user by telegramId
 */
async function getUserByTelegramId(telegramId) {
  if (!telegramId) return null;
  
  if (useMongo) {
    return await User.findOne({ telegramId });
  } else {
    return inMemoryUsers.find(u => u.telegramId === telegramId) || null;
  }
}

/**
 * Upsert user (create or update)
 */
async function upsertUser(userData) {
  if (!userData.telegramId) {
    throw new Error('telegramId is required');
  }
  
  if (useMongo) {
    const user = await User.findOneAndUpdate(
      { telegramId: userData.telegramId },
      {
        ...userData,
        lastActive: new Date(),
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );
    return user;
  } else {
    const existingIndex = inMemoryUsers.findIndex(u => u.telegramId === userData.telegramId);
    
    if (existingIndex !== -1) {
      inMemoryUsers[existingIndex] = {
        ...inMemoryUsers[existingIndex],
        ...userData,
        lastActive: new Date(),
        updatedAt: new Date()
      };
      return inMemoryUsers[existingIndex];
    } else {
      const newUser = {
        telegramId: userData.telegramId,
        username: userData.username || '',
        name: userData.name,
        iqc: userData.iqc || 0,
        level: userData.level || 1,
        role: userData.role || 'member',
        lastActive: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      inMemoryUsers.push(newUser);
      return newUser;
    }
  }
}

/**
 * Add audit log entry
 */
async function addAudit(telegramId, action, details = '', ip = '') {
  const auditData = {
    telegramId,
    action,
    details,
    ip,
    timestamp: new Date()
  };
  
  if (useMongo) {
    const audit = new Audit(auditData);
    await audit.save();
    return audit;
  } else {
    inMemoryAudits.push(auditData);
    return auditData;
  }
}

/**
 * Get top N users by IQC
 */
async function listTopUsers(limit = 20) {
  if (useMongo) {
    return await User.find().sort({ iqc: -1 }).limit(limit);
  } else {
    return [...inMemoryUsers]
      .sort((a, b) => b.iqc - a.iqc)
      .slice(0, limit);
  }
}

/**
 * Update user IQC and level
 */
async function updateUserIQC(telegramId, newIQC, newLevel) {
  if (useMongo) {
    return await User.findOneAndUpdate(
      { telegramId },
      { iqc: newIQC, level: newLevel, updatedAt: new Date() },
      { new: true }
    );
  } else {
    const user = inMemoryUsers.find(u => u.telegramId === telegramId);
    if (user) {
      user.iqc = newIQC;
      user.level = newLevel;
      user.updatedAt = new Date();
    }
    return user;
  }
}

/**
 * Check if user is banned
 */
async function isUserBanned(telegramId) {
  if (useMongo) {
    const banned = await BannedUser.findOne({ 
      telegramId,
      until: { $gt: new Date() }
    });
    return banned;
  } else {
    const banned = inMemoryBanned.find(b => 
      b.telegramId === telegramId && new Date(b.until) > new Date()
    );
    return banned || null;
  }
}

/**
 * Ban user
 */
async function banUser(telegramId, reason, hours) {
  const until = new Date();
  until.setHours(until.getHours() + hours);
  
  const banData = {
    telegramId,
    reason,
    until,
    createdAt: new Date()
  };
  
  if (useMongo) {
    const banned = await BannedUser.findOneAndUpdate(
      { telegramId },
      banData,
      { upsert: true, new: true }
    );
    return banned;
  } else {
    const existingIndex = inMemoryBanned.findIndex(b => b.telegramId === telegramId);
    if (existingIndex !== -1) {
      inMemoryBanned[existingIndex] = banData;
    } else {
      inMemoryBanned.push(banData);
    }
    return banData;
  }
}

/**
 * Unban user
 */
async function unbanUser(telegramId) {
  if (useMongo) {
    await BannedUser.deleteOne({ telegramId });
  } else {
    const index = inMemoryBanned.findIndex(b => b.telegramId === telegramId);
    if (index !== -1) {
      inMemoryBanned.splice(index, 1);
    }
  }
}

/**
 * Get all users count
 */
async function getUsersCount() {
  if (useMongo) {
    return await User.countDocuments();
  } else {
    return inMemoryUsers.length;
  }
}

module.exports = {
  connectToMongo,
  getUserByTelegramId,
  upsertUser,
  addAudit,
  listTopUsers,
  updateUserIQC,
  isUserBanned,
  banUser,
  unbanUser,
  getUsersCount
};
