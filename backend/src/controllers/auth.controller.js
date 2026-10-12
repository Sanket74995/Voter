const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');
const { hashPassword, comparePassword } = require('../utils/crypto');
const { logAudit } = require('../audit/auditLogger');

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      voterId: user.voterId,
      email: user.email,
      role: user.role,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
};

/**
 * Register a new user
 */
const register = async (req, res, next) => {
  try {
    const { voterId, fullName, email, password, role, phoneNumber } = req.body;

    if (!voterId || !fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide voterId, fullName, email, and password.',
      });
    }

    const existingVoterId = await User.findOne({ voterId: voterId.toUpperCase() });
    if (existingVoterId) {
      return res.status(409).json({
        success: false,
        error: 'Voter ID is already registered.',
      });
    }

    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        error: 'Email address is already registered.',
      });
    }

    const passwordHash = await hashPassword(password);
    const assignedRole = ['admin', 'party_rep'].includes(role) ? role : 'voter';

    const user = await User.create({
      voterId: voterId.toUpperCase(),
      fullName,
      email: email.toLowerCase(),
      passwordHash,
      role: assignedRole,
      phoneNumber,
      status: 'active',
    });

    await logAudit({
      action: 'USER_REGISTERED',
      performedBy: user.voterId,
      targetType: 'SYSTEM',
      targetId: user._id,
      details: { role: user.role, email: user.email },
      req,
    });

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      data: {
        token,
        user: {
          id: user._id,
          voterId: user.voterId,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          status: user.status,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login existing user
 */
const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body; // identifier can be email or voterId

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide identifier (email or Voter ID) and password.',
      });
    }

    const cleanId = identifier.trim();
    const user = await User.findOne({
      $or: [
        { email: cleanId.toLowerCase() },
        { voterId: cleanId.toUpperCase() },
      ],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials.',
      });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      await logAudit({
        action: 'FAILED_LOGIN_ATTEMPT',
        performedBy: user.voterId,
        targetType: 'SYSTEM',
        status: 'FAILURE',
        details: { reason: 'Incorrect password' },
        req,
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid credentials.',
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: `Account is ${user.status}. Please contact administrator.`,
      });
    }

    const token = generateToken(user);

    await logAudit({
      action: 'USER_LOGIN_SUCCESS',
      performedBy: user.voterId,
      targetType: 'SYSTEM',
      targetId: user._id,
      details: { role: user.role },
      req,
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: {
          id: user._id,
          voterId: user.voterId,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          status: user.status,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user profile
 */
const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
};

/**
 * Logout
 */
const logout = async (req, res) => {
  if (req.user) {
    await logAudit({
      action: 'USER_LOGOUT',
      performedBy: req.user.voterId,
      targetType: 'SYSTEM',
      targetId: req.user._id,
      req,
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
};

module.exports = {
  register,
  login,
  getMe,
  logout,
};
