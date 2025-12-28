const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const requireAccess = async (req, res, next) => {
  if (!req.user.hasAccess()) {
    return res.status(403).json({ 
      message: 'Access denied. Subscription required.',
      needsUpgrade: true 
    });
  }
  next();
};

const requireAdmin = async (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

const requireEmailVerification = async (req, res, next) => {
  if (!req.user.emailVerified) {
    return res.status(403).json({ 
      message: 'Email verification required',
      needsVerification: true 
    });
  }
  next();
};

module.exports = { auth, requireAccess, requireAdmin, requireEmailVerification };