import express from 'express';
import Expense from '../models/Expense.js';
import { protect, authorize } from '../middleware/auth.js';
import { getCurrentNepaliDate } from '../utils/nepaliDate.js';

const router = express.Router();

// @desc    Get all expenses
// @route   GET /api/expenses
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { branch, date, category, staff, page = 1, limit = 50 } = req.query;

    // Force branch to req.user.branch (admins/staff only see their branch)
    let branchId = req.user.branch;
    let query = { branch: branchId };

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query['date.englishDate'] = {
        $gte: startDate,
        $lt: endDate
      };
    }
    if (category && category !== 'all') {
      query.category = category;
    }
    if (staff && staff !== 'all') {
      query.staff = staff;
    }

    const expenses = await Expense.find(query)
      .populate('branch', 'branchName location')
      .populate('staff', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Expense.countDocuments(query);

    res.json({
      success: true,
      count: expenses.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      expenses
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching expenses',
      error: error.message
    });
  }
});

// @desc    Get expense categories
// @route   GET /api/expenses/categories
// @access  Private
router.get('/categories', protect, async (req, res) => {
  try {
    const branchId = req.user.branch;
    
    const categories = await Expense.distinct('category', { branch: branchId });
    
    // Add common categories if they don't exist
    const commonCategories = ['Maintenance', 'Salary', 'Electricity', 'Rent', 'Supplies', 'Other'];
    const allCategories = [...new Set([...commonCategories, ...categories])];
    
    res.json({
      success: true,
      categories: allCategories.sort()
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
});

// @desc    Create expense
// @route   POST /api/expenses
// @access  Private (admin, expenses staff)
router.post('/', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { category, description, amount, receiptNo, vendor, paymentMethod, remarks, branch } = req.body;

    // Validate required fields
    if (!category || !category.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category is required'
      });
    }

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    const expenseData = {
      category: category.trim(),
      description: description ? description.trim() : '',
      amount: parseFloat(amount),
      receiptNo: receiptNo ? receiptNo.trim() : '',
      vendor: vendor ? vendor.trim() : '',
      paymentMethod: paymentMethod || 'Cash',
      remarks: remarks ? remarks.trim() : '',
      branch: branch || req.user.branch,
      staff: req.user.id,
      date: {
        englishDate: new Date(),
        nepaliDate: getCurrentNepaliDate()
      }
    };

    const expense = await Expense.create(expenseData);
    const populatedExpense = await Expense.findById(expense._id)
      .populate('branch', 'branchName location')
      .populate('staff', 'name email');

    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      expense: populatedExpense
    });
  } catch (error) {
    console.error('Create expense error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Expense number already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating expense',
      error: error.message
    });
  }
});

// @desc    Update expense
// @route   PUT /api/expenses/:id
// @access  Private (admin, expenses staff)
router.put('/:id', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { category, description, amount, receiptNo, vendor, paymentMethod, remarks } = req.body;

    let expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    if (req.user.role !== 'admin' && expense.staff.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this expense'
      });
    }

    const updateData = {
      ...(category && { category: category.trim() }),
      ...(description !== undefined && { description: description.trim() }),
      ...(amount && { amount: parseFloat(amount) }),
      ...(receiptNo !== undefined && { receiptNo: receiptNo.trim() }),
      ...(vendor !== undefined && { vendor: vendor.trim() }),
      ...(paymentMethod && { paymentMethod }),
      ...(remarks !== undefined && { remarks: remarks.trim() })
    };

    expense = await Expense.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('branch', 'branchName location')
     .populate('staff', 'name email');

    res.json({
      success: true,
      message: 'Expense updated successfully',
      expense
    });
  } catch (error) {
    console.error('Update expense error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error updating expense',
      error: error.message
    });
  }
});

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    await Expense.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting expense',
      error: error.message
    });
  }
});

// @desc    Get expense statistics
// @route   GET /api/expenses/stats/:branchId
// @access  Private
router.get('/stats/:branchId', protect, async (req, res) => {
  try {
    const { period = 'today' } = req.query;
    const branchId = req.params.branchId;
    
    let startDate, endDate;
    const now = new Date();

    switch (period) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        endDate = new Date();
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      default:
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
    }

    const query = {
      branch: branchId,
      'date.englishDate': {
        $gte: startDate,
        $lte: endDate
      }
    };

    const totalExpenses = await Expense.countDocuments(query);
    
    const amountStats = await Expense.aggregate([
      { $match: query },
      { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
    ]);
    
    const totalAmount = amountStats.length > 0 ? amountStats[0].totalAmount : 0;

    // Category distribution
    const categoryDistribution = await Expense.aggregate([
      { $match: query },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      stats: {
        totalExpenses,
        totalAmount,
        categoryDistribution,
        period
      }
    });
  } catch (error) {
    console.error('Get expense stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching expense statistics',
      error: error.message
    });
  }
});

export default router;