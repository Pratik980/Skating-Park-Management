import express from 'express';
import Backup from '../models/Backup.js';
import Ticket from '../models/Ticket.js';
import Sales from '../models/Sales.js';
import Expense from '../models/Expense.js';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// @desc    Erase branch data (admin only)
// @route   DELETE /api/backup/erase-data
// @access  Private/Admin
router.delete('/erase-data', protect, authorize('admin'), async (req, res) => {
  const branchId = req.query.branchId || req.body?.branchId;
  const rawTypes = req.query.types ?? req.body?.types;

  let types = [];
  if (Array.isArray(rawTypes)) {
    types = rawTypes;
  } else if (typeof rawTypes === 'string') { 
    types = rawTypes.split(',').map(t => t.trim()).filter(Boolean);
  }

  if (!branchId || types.length === 0) {
    return res.status(400).json({ success: false, message: 'branchId and at least one type are required.' });
  }

  const results = {};
  try {
    const shouldDeleteAll = types.includes('all');
    const typesToDelete = shouldDeleteAll ? ['tickets', 'sales', 'expenses'] : types;

    if (typesToDelete.includes('tickets')) {
      const { deletedCount } = await Ticket.deleteMany({ branch: branchId });
      results.tickets = deletedCount;
    }
    if (typesToDelete.includes('sales')) {
      const { deletedCount } = await Sales.deleteMany({ branch: branchId, isSale: true });
      results.sales = deletedCount;
    }
    if (typesToDelete.includes('expenses')) {
      const { deletedCount } = await Expense.deleteMany({ branch: branchId });
      results.expenses = deletedCount;
    }
    return res.json({ success: true, message: 'Deletion complete', results });
  } catch (error) {
    console.error('Erase data error:', error);
    return res.status(500).json({ success: false, message: 'Error erasing data', error: error.message });
  }
});

// @desc    Create backup
// @route   POST /api/backup
// @access  Private/Admin
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { branch } = req.body;
    const branchId = branch || req.user.branch;

    // Get all data
    const tickets = await Ticket.find({ branch: branchId });
    const sales = await Sales.find({ branch: branchId });
    const expenses = await Expense.find({ branch: branchId });
    const users = await User.find({ branch: branchId }).select('-password');

    const backupData = {
      timestamp: new Date(),
      branch: branchId,
      data: {
        tickets,
        sales,
        expenses,
        users
      }
    };

    // Create backup directory if not exists
    const backupDir = path.join(__dirname, '../../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${branchId}-${timestamp}.json`;
    const filepath = path.join(backupDir, filename);

    // Write backup file
    fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));

    // Save backup record to database
    const backup = await Backup.create({
      filename,
      filepath,
      size: fs.statSync(filepath).size,
      branch: branchId,
      createdBy: req.user.id,
      dataCount: {
        tickets: tickets.length,
        sales: sales.length,
        expenses: expenses.length,
        users: users.length
      }
    });

    res.json({
      success: true,
      message: 'Backup created successfully',
      backup
    });
  } catch (error) {
    console.error('Create backup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating backup',
      error: error.message
    });
  }
});

// @desc    Get all backups
// @route   GET /api/backup
// @access  Private/Admin
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { branch } = req.query;
    
    let query = {};
    if (branch && branch !== 'all') {
      query.branch = branch;
    }

    const backups = await Backup.find(query)
      .populate('branch', 'branchName')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: backups.length,
      backups
    });
  } catch (error) {
    console.error('Get backups error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching backups',
      error: error.message
    });
  }
});

// @desc    Restore backup
// @route   POST /api/backup/restore/:id
// @access  Private/Admin
router.post('/restore/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const backup = await Backup.findById(req.params.id);

    if (!backup) {
      return res.status(404).json({
        success: false,
        message: 'Backup not found'
      });
    }

    // Read backup file
    const backupData = JSON.parse(fs.readFileSync(backup.filepath, 'utf8'));

    // Restore data (in a real application, you might want to handle this more carefully)
    if (backupData.data.tickets) {
      await Ticket.deleteMany({ branch: backupData.branch });
      await Ticket.insertMany(backupData.data.tickets);
    }

    if (backupData.data.sales) {
      await Sales.deleteMany({ branch: backupData.branch });
      await Sales.insertMany(backupData.data.sales);
    }

    if (backupData.data.expenses) {
      await Expense.deleteMany({ branch: backupData.branch });
      await Expense.insertMany(backupData.data.expenses);
    }

    res.json({
      success: true,
      message: 'Backup restored successfully'
    });
  } catch (error) {
    console.error('Restore backup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error restoring backup',
      error: error.message
    });
  }
});

// @desc    Delete backup
// @route   DELETE /api/backup/:id
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const backup = await Backup.findById(req.params.id);

    if (!backup) {
      return res.status(404).json({
        success: false,
        message: 'Backup not found'
      });
    }

    // Delete backup file
    if (fs.existsSync(backup.filepath)) {
      fs.unlinkSync(backup.filepath);
    }

    // Delete backup record
    await Backup.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Backup deleted successfully'
    });
  } catch (error) {
    console.error('Delete backup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting backup',
      error: error.message
    });
  }
});

// @desc    Download backup
// @route   GET /api/backup/download/:id
// @access  Private/Admin
router.get('/download/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const backup = await Backup.findById(req.params.id);

    if (!backup) {
      return res.status(404).json({
        success: false,
        message: 'Backup not found'
      });
    }

    if (!fs.existsSync(backup.filepath)) {
      return res.status(404).json({
        success: false,
        message: 'Backup file not found'
      });
    }

    res.download(backup.filepath);
  } catch (error) {
    console.error('Download backup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading backup',
      error: error.message
    });
  }
});

export default router;