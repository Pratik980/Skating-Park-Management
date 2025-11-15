import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Branch from '../models/Branch.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// @desc    Register admin/user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, role, branch, branchData } = req.body;

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
    const user = await User.create({
      name,
      email,
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
    const { email, password } = req.body;

    // Check if email and password provided
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check if user exists and password is correct
    const user = await User.findOne({ email }).select('+password').populate('branch');
    
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Update last login
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
    const { name, phone, email } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, phone, email },
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