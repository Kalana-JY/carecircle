const jwt = require('jsonwebtoken');
const User = require('../models/User');

const cleanEnv = (value) => String(value || '').replace(/\r/g, '').trim().replace(/^['"]|['"]$/g, '');

const isAdminUser = (user) => {
  if (!user?.email) return false;
  const email = user.email.toLowerCase();
  const adminEmail = cleanEnv(process.env.ADMIN_EMAIL).toLowerCase();
  return Boolean((adminEmail && email === adminEmail) || email.includes('admin'));
};

const attachUserFromToken = async (authorizationHeader) => {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authorizationHeader.split(' ')[1];
  if (!token) return null;

  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
  return User.findById(decoded.id).select('-password');
};

const protect = async (req, res, next) => {
  try {
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer')) {
      return res.status(401).json({ message: 'Not authorized, no token provided' });
    }

    const user = await attachUserFromToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    req.user = user;
    return next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

const optionalProtect = async (req, res, next) => {
  try {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      const user = await attachUserFromToken(req.headers.authorization);
      if (user) req.user = user;
    }
  } catch (error) {
    // Public resource routes still work when an expired/invalid token is sent
  }
  return next();
};

const adminOnly = (req, res, next) => {
  if (!isAdminUser(req.user)) {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  return next();
};

module.exports = { protect, optionalProtect, adminOnly, isAdminUser };
