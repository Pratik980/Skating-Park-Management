import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Branch from '../models/Branch.js';
import { protect } from '../middleware/auth.js';
import { sendPasswordResetCode } from '../utils/emailService.js';

const router = express.Router();

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

const sanitizeUsername = (value = '') => {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '');
};

const buildUsernameSuggestions = (payload = {}) => {
  const { username, email, name } = payload;
  const suggestions = [];

  if (username) suggestions.push(username);
  if (email) {
    const handle = email.split('@')[0];
    suggestions.push(handle);
  }
  if (name) {
    suggestions.push(name.replace(/\s+/g, ''));
  }

  suggestions.push(`user${Date.now()}`);
  return suggestions.map(sanitizeUsername).filter(Boolean);
};

const assignUniqueUsername = async (payload) => {
  const candidates = buildUsernameSuggestions(payload);
  for (const base of candidates) {
    let candidate = base;
    let suffix = 1;
    while (await User.findOne({ username: candidate })) {
      candidate = `${base}${suffix}`;
      suffix += 1;
    }
    return candidate;
  }
  return `user${Date.now()}`;
};

const generateResetCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const findUserByIdentifier = async (identifier) => {
  if (!identifier) return null;
  const normalized = identifier.toString().trim().toLowerCase();
  const conditions = [];

  if (normalized.includes('@')) {
    conditions.push({ email: normalized });
  } else {
    conditions.push({ username: normalized });
    conditions.push({ email: normalized });
  }

  return User.findOne({ $or: conditions }).select('+password').populate('branch');
};

// @desc    Register admin/user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, role, branch, branchData, username } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    let branchId = branch;
    let createdBranch = null;

    // If branchData is provided, create a new branch
    if (branchData && !branchId) {
      createdBranch = await Branch.create({
        branchName: branchData.branchName,
        location: branchData.location,
        contactNumber: branchData.contactNumber,
        email: branchData.email || '',
        manager: branchData.manager || name,
        openingTime: branchData.openingTime || '09:00',
        closingTime: branchData.closingTime || '20:00'
        // createdBy will be set after user creation
      });
      
      branchId = createdBranch._id;
      console.log('✅ New branch created:', createdBranch.branchName);
    }
    // If no branch provided and this is the first user (admin), create a default branch
    else if (!branchId) {
      const userCount = await User.countDocuments();
      if (userCount === 0) {
        // This is the first user - create a default branch
        createdBranch = await Branch.create({
          branchName: branchData?.branchName || 'Main Branch',
          location: branchData?.location || 'बेलका न.पा.–९ (कुमारी बैंक छेउ) रामपुर',
          contactNumber: branchData?.contactNumber || '9812345678',
          manager: branchData?.manager || name,
          openingTime: branchData?.openingTime || '09:00',
          closingTime: branchData?.closingTime || '20:00'
        });
        
        branchId = createdBranch._id;
        console.log('✅ Default branch created for first admin:', createdBranch.branchName);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Branch is required for registration'
        });
      }
    }

    // Check if branch exists (if using existing branch)
    if (branchId && !branchData) {
      const branchExists = await Branch.findById(branchId);
      if (!branchExists) {
        return res.status(400).json({
          success: false,
          message: 'Selected branch does not exist'
        });
      }
    }

    // Create user
    const normalizedUsername = await assignUniqueUsername({ username, email, name });

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      username: normalizedUsername,
      password,
      phone,
      role: role || 'admin',
      branch: branchId
    });

    // Update the branch's createdBy field if we created a new branch
    if (createdBranch) {
      await Branch.findByIdAndUpdate(branchId, { createdBy: user._id });
    }

    if (user) {
      const token = generateToken(user._id);
      
      // Populate branch details for response
      const userWithBranch = await User.findById(user._id).populate('branch');
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        token,
        user: {
          id: userWithBranch._id,
          name: userWithBranch.name,
          email: userWithBranch.email,
          username: userWithBranch.username,
          role: userWithBranch.role,
          branch: userWithBranch.branch,
          phone: userWithBranch.phone
        }
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error in registration',
      error: error.message
    });
  }
});

// Rest of the auth routes remain the same...
// [Keep the login, me, update-profile, change-password, check-setup routes]

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, username, identifier, password } = req.body;
    const loginIdentifier = identifier || email || username;

    if (!loginIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email/username and password'
      });
    }

    const user = await findUserByIdentifier(loginIdentifier);

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    await user.updateLastLogin();

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        branch: user.branch,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error in login process',
      error: error.message
    });
  }
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('branch');
    
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        branch: user.branch,
        phone: user.phone,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user data',
      error: error.message
    });
  }
});

// @desc    Update user profile
// @route   PUT /api/auth/update-profile
// @access  Private
router.put('/update-profile', protect, async (req, res) => {
  try {
    const { name, phone, email, username } = req.body;
    let usernameToSet = username;

    if (usernameToSet) {
      usernameToSet = sanitizeUsername(usernameToSet);
      if (!usernameToSet) {
        return res.status(400).json({
          success: false,
          message: 'Invalid username'
        });
      }

      const existing = await User.findOne({ username: usernameToSet, _id: { $ne: req.user.id } });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Username already taken'
        });
      }
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, phone, email, username: usernameToSet },
      { new: true, runValidators: true }
    ).select('-password').populate('branch');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user.id).select('+password');
    
    // Check current password
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    user.password = newPassword;
    await user.save();
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: error.message
    });
  }
});

// @desc    Change password without active session (login screen)
// @route   POST /api/auth/change-password-public
// @access  Public (requires current password)
router.post('/change-password-public', async (req, res) => {
  try {
    const { identifier, email, username, currentPassword, newPassword } = req.body;
    const loginIdentifier = identifier || email || username;

    if (!loginIdentifier || !currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Identifier, current password, and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    const user = await findUserByIdentifier(loginIdentifier);

    if (!user || !(await user.matchPassword(currentPassword))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully. Please login with your new password.'
    });
  } catch (error) {
    console.error('Public change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating password',
      error: error.message
    });
  }
});

// @desc    Send password reset code via email
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists for this email, a verification code has been sent.'
      });
    }

    const code = generateResetCode();
    user.resetPasswordCode = code;
    user.resetPasswordCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    await sendPasswordResetCode({
      to: user.email,
      name: user.name,
      code
    });

    res.json({
      success: true,
      message: 'Verification code sent to your email.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to send verification code. Please try again later.',
      error: error.message
    });
  }
});

// @desc    Verify password reset code
// @route   POST /api/auth/verify-reset-code
// @access  Public
router.post('/verify-reset-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code are required'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (
      !user ||
      !user.resetPasswordCode ||
      user.resetPasswordCode !== code ||
      !user.resetPasswordCodeExpires ||
      user.resetPasswordCodeExpires < new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    res.json({
      success: true,
      message: 'Verification code is valid.'
    });
  } catch (error) {
    console.error('Verify reset code error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to verify code. Please try again later.',
      error: error.message
    });
  }
});

// @desc    Reset password using verification code
// @route   POST /api/auth/reset-password
// @access  Public
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, verification code, and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (
      !user ||
      !user.resetPasswordCode ||
      user.resetPasswordCode !== code ||
      !user.resetPasswordCodeExpires ||
      user.resetPasswordCodeExpires < new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    user.password = newPassword;
    user.resetPasswordCode = undefined;
    user.resetPasswordCodeExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully. Please log in with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to reset password. Please try again later.',
      error: error.message
    });
  }
});

// @desc    Check if system is setup (has any users)
// @route   GET /api/auth/check-setup
// @access  Public
router.get('/check-setup', async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const branchCount = await Branch.countDocuments();
    
    res.json({
      success: true,
      data: {
        hasUsers: userCount > 0,
        hasBranches: branchCount > 0,
        userCount,
        branchCount
      }
    });
  } catch (error) {
    console.error('Check setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking system setup',
      error: error.message
    });
  }
});

export default router;