const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Helper to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
const signup = async (req, res) => {
  try {
    const { name, email, phoneNumber, password } = req.body;

    // Validate inputs
    if (!name || !email || !phoneNumber || !password) {
      return res.status(400).json({ message: 'Please provide all required fields (name, email, phoneNumber, password)' });
    }

    // Validate phoneNumber format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber.trim())) {
      return res.status(400).json({ message: 'Please provide a valid phone number in E.164 format (e.g. +94771234567)' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Normalize email
    const emailNormalized = email.trim().toLowerCase();

    // Prevent signing up with admin email
    const adminEmail = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.trim().toLowerCase() : null;
    if (adminEmail && emailNormalized === adminEmail) {
      return res.status(400).json({ message: 'Cannot register with this email address' });
    }

    // Check if user exists (by email or phone number)
    const userExists = await User.findOne({
      $or: [
        { email: emailNormalized },
        { phoneNumber: phoneNumber.trim() }
      ]
    });
    if (userExists) {
      if (userExists.email === emailNormalized) {
        return res.status(400).json({ message: 'User with this email already exists' });
      } else {
        return res.status(400).json({ message: 'User with this phone number already exists' });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: emailNormalized,
      phoneNumber: phoneNumber.trim(),
      password: hashedPassword,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/signin
// @access  Public
const signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const emailNormalized = email.trim().toLowerCase();
    const adminEmail = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.trim().toLowerCase() : null;
    const adminPassword = process.env.ADMIN_PASSWORD;

    // Handle Admin login using environment variables
    if (adminEmail && emailNormalized === adminEmail) {
      if (password !== adminPassword) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Find or create admin user in DB so that authMiddleware / protect works
      let user = await User.findOne({ email: adminEmail });
      if (!user) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);
        user = await User.create({
          name: 'Admin',
          email: adminEmail,
          phoneNumber: process.env.ADMIN_PHONE || '+10000000000',
          password: hashedPassword,
        });
      } else {
        // Sync password hash in DB if the environment variable password changed
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(adminPassword, salt);
          user.password = hashedPassword;
          await user.save();
        }
      }

      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        isAdmin: true,
        token: generateToken(user._id),
      });
    }

    // Find normal user
    const user = await User.findOne({ email: emailNormalized });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      isAdmin: false,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  signup,
  signin,
};
