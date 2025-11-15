import express from 'express';
import Branch from '../models/Branch.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all branches (public for initial setup)
// @route   GET /api/branches
// @access  Public (for setup), Private (after setup)
router.get('/', async (req, res) => {
  try {
    // Check if this is the first user setup
    const User = (await import('../models/User.js')).default;
    const userCount = await User.countDocuments();
    
    // If no users exist, allow public access for setup
    if (userCount === 0) {
      const branches = await Branch.find({ isActive: true })
        .populate('createdBy', 'name email')
        .sort({ branchName: 1 });

      return res.json({
        success: true,
        count: branches.length,
        branches
      });
    }
    
    // If users exist, require authentication
    return protect(req, res, async () => {
      const filter = req.user.role === 'admin'
        ? {}
        : { _id: req.user.branch, isActive: true };

      const branches = await Branch.find(filter)
        .populate('createdBy', 'name email')
        .sort({ branchName: 1 });

      res.json({
        success: true,
        count: branches.length,
        branches
      });
    });
  } catch (error) {
    console.error('Get branches error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching branches',
      error: error.message
    });
  }
});

// Rest of the branches routes remain protected...
// [Keep other routes with protect middleware]

// @desc    Get single branch
// @route   GET /api/branches/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }

    res.json({
      success: true,
      branch
    });
  } catch (error) {
    console.error('Get branch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching branch',
      error: error.message
    });
  }
});

// @desc    Create branch
// @route   POST /api/branches
// @access  Private/Admin
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { branchName, location, contactNumber, email, manager, openingTime, closingTime } = req.body;

    const branchExists = await Branch.findOne({ branchName });
    if (branchExists) {
      return res.status(400).json({
        success: false,
        message: 'Branch already exists with this name'
      });
    }

    const branch = await Branch.create({
      branchName,
      location,
      contactNumber,
      email,
      manager,
      openingTime,
      closingTime,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Branch created successfully',
      branch
    });
  } catch (error) {
    console.error('Create branch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating branch',
      error: error.message
    });
  }
});

// @desc    Update branch
// @route   PUT /api/branches/:id
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { branchName, location, contactNumber, email, manager, openingTime, closingTime, isActive } = req.body;

    const branch = await Branch.findByIdAndUpdate(
      req.params.id,
      { branchName, location, contactNumber, email, manager, openingTime, closingTime, isActive },
      { new: true, runValidators: true }
    );

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }

    res.json({
      success: true,
      message: 'Branch updated successfully',
      branch
    });
  } catch (error) {
    console.error('Update branch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating branch',
      error: error.message
    });
  }
});

// @desc    Delete branch
// @route   DELETE /api/branches/:id
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }

    // Check if branch has associated data
    const User = (await import('../models/User.js')).default;
    const Ticket = (await import('../models/Ticket.js')).default;
    
    const userCount = await User.countDocuments({ branch: req.params.id });
    const ticketCount = await Ticket.countDocuments({ branch: req.params.id });

    if (userCount > 0 || ticketCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete branch with associated users or tickets'
      });
    }

    await Branch.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Branch deleted successfully'
    });
  } catch (error) {
    console.error('Delete branch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting branch',
      error: error.message
    });
  }
});

export default router;