import express from 'express';
import mongoose from 'mongoose';
import DailySummary from '../models/DailySummary.js';
import Ticket from '../models/Ticket.js';
import Sales from '../models/Sales.js';
import Expense from '../models/Expense.js';
import { protect } from '../middleware/auth.js';
import { getCurrentNepaliDate } from '../utils/nepaliDate.js';

const router = express.Router();

// @desc    Get daily summary
// @route   GET /api/summary/daily/:branchId
// @access  Private
router.get('/daily/:branchId', protect, async (req, res) => {
  try {
    const { date } = req.query;
    const branchId = req.user.branch; // force to user branch
    
    const targetDate = date ? new Date(date) : new Date();
    const startDate = new Date(targetDate.setHours(0, 0, 0, 0));
    const endDate = new Date(targetDate.setHours(23, 59, 59, 999));

    // Always fetch fresh data from database (don't rely on cached DailySummary)
    const tickets = await Ticket.find({
      branch: branchId,
      'date.englishDate': {
        $gte: startDate,
        $lte: endDate
      }
    });

    const sales = await Sales.find({
      branch: branchId,
      isSale: true, // Only count actual sales, not expenses
      'date.englishDate': {
        $gte: startDate,
        $lte: endDate
      }
    });

    const expenses = await Expense.find({
      branch: branchId,
      'date.englishDate': {
        $gte: startDate,
        $lte: endDate
      }
    });

    // Calculate totals from actual database records
    const totalTicketSales = tickets.reduce((sum, ticket) => sum + (ticket.fee || 0), 0);
    const totalOtherSales = sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const totalRevenue = totalTicketSales + totalOtherSales;
    const profitLoss = totalRevenue - totalExpenses;

    // Get or create daily summary for reference
    let summary = await DailySummary.findOne({
      branch: branchId,
      'date.englishDate': {
        $gte: startDate,
        $lte: endDate
      }
    });

    if (summary) {
      // Update existing summary with fresh calculations
      summary.totalTickets = tickets.length;
      summary.totalTicketSales = totalTicketSales;
      summary.totalOtherSales = totalOtherSales;
      summary.totalExpenses = totalExpenses;
      summary.totalRevenue = totalRevenue;
      summary.profitLoss = profitLoss;
      summary.tickets = tickets.map(ticket => ticket._id);
      summary.sales = sales.map(sale => sale._id);
      summary.expenses = expenses.map(expense => expense._id);
      await summary.save();
    } else {
      // Create new summary
      summary = await DailySummary.create({
        date: {
          englishDate: startDate,
          nepaliDate: getCurrentNepaliDate()
        },
        branch: branchId,
        totalTickets: tickets.length,
        totalTicketSales,
        totalOtherSales,
        totalExpenses,
        totalRevenue,
        profitLoss,
        tickets: tickets.map(ticket => ticket._id),
        sales: sales.map(sale => sale._id),
        expenses: expenses.map(expense => expense._id)
      });
    }

    // Populate for response
    await summary.populate('tickets sales expenses');

    res.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Get daily summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching daily summary',
      error: error.message
    });
  }
});

// @desc    Get summary by date range
// @route   GET /api/summary/range/:branchId
// @access  Private
router.get('/range/:branchId', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const branchId = req.user.branch; // force to user branch

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide startDate and endDate'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const summaries = await DailySummary.find({
      branch: branchId,
      'date.englishDate': {
        $gte: start,
        $lte: end
      }
    }).sort({ 'date.englishDate': 1 });

    // Calculate totals
    const totals = {
      totalTickets: 0,
      totalTicketSales: 0,
      totalOtherSales: 0,
      totalExpenses: 0,
      totalRevenue: 0,
      totalProfitLoss: 0
    };

    summaries.forEach(summary => {
      totals.totalTickets += summary.totalTickets;
      totals.totalTicketSales += summary.totalTicketSales;
      totals.totalOtherSales += summary.totalOtherSales;
      totals.totalExpenses += summary.totalExpenses;
      totals.totalRevenue += summary.totalRevenue;
      totals.totalProfitLoss += summary.profitLoss;
    });

    res.json({
      success: true,
      summaries,
      totals,
      period: {
        startDate: start,
        endDate: end
      }
    });
  } catch (error) {
    console.error('Get range summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching range summary',
      error: error.message
    });
  }
});

// @desc    Get dashboard statistics
// @route   GET /api/summary/dashboard/:branchId
// @access  Private
router.get('/dashboard/:branchId', protect, async (req, res) => {
  try {
    const branchId = req.user.branch;
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));

    // Timeline: Group tickets by day for the last 10 days
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 9);
    tenDaysAgo.setHours(0,0,0,0);
    const timelineAgg = await Ticket.aggregate([
      { $match: { branch: new mongoose.Types.ObjectId(branchId), 'date.englishDate': { $gte: tenDaysAgo } } },
      { $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$date.englishDate" } },
        tickets: { $sum: 1 },
        revenue: { $sum: "$fee" },
        refundedAmount: { $sum: "$refundAmount" }
      }},
      { $sort: { _id: 1 } }
    ]);
    const timeline = timelineAgg.map(e => ({
      label: e._id,
      tickets: e.tickets,
      revenue: e.revenue,
      refundedAmount: e.refundedAmount,
    }));

    // Type breakdown (from today only)
    const typeCountsAgg = await Ticket.aggregate([
      { $match: { branch: new mongoose.Types.ObjectId(branchId), 'date.englishDate': { $gte: startOfToday, $lte: endOfToday } } },
      { $group: { _id: "$ticketType", count: { $sum: 1 } } }
    ]);
    const typeCounts = {};
    typeCountsAgg.forEach(t => { typeCounts[t._id] = t.count; });

    // Top customers (last 30 days, group by name)
    const thirtyAgo = new Date();
    thirtyAgo.setDate(thirtyAgo.getDate() - 29);
    thirtyAgo.setHours(0,0,0,0);
    const customersAgg = await Ticket.aggregate([
      { $match: { branch: new mongoose.Types.ObjectId(branchId), 'date.englishDate': { $gte: thirtyAgo } } },
      { $group: {
        _id: "$name",
        tickets: { $sum: 1 }
      }},
      { $sort: { tickets: -1 } },
      { $limit: 10 }
    ]);
    const customers = customersAgg.map(c => ({ name: c._id, tickets: c.tickets }));

    // Checked-in: tickets with status 'playing'
    const checkedIn = await Ticket.countDocuments({ branch: branchId, status: 'playing' });

    // Today's stats
    const todayTickets = await Ticket.countDocuments({ branch: branchId, 'date.englishDate': { $gte: startOfToday, $lte: endOfToday } });
    const todaySales = await Sales.countDocuments({ branch: branchId, isSale: true, 'date.englishDate': { $gte: startOfToday, $lte: endOfToday } });
    const todayExpenses = await Expense.countDocuments({ branch: branchId, 'date.englishDate': { $gte: startOfToday, $lte: endOfToday } });

    // Totals
    const totalTickets = await Ticket.countDocuments({ branch: branchId });
    const totalSales = await Sales.countDocuments({ branch: branchId, isSale: true });
    const totalExpenses = await Expense.countDocuments({ branch: branchId });
    const ticketRevenue = await Ticket.aggregate([
      { $match: { branch: new mongoose.Types.ObjectId(branchId) } },
      { $group: { _id: null, total: { $sum: '$fee' } } }
    ]);
    const salesRevenue = await Sales.aggregate([
      { $match: { branch: new mongoose.Types.ObjectId(branchId), isSale: true } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const expensesTotal = await Expense.aggregate([
      { $match: { branch: new mongoose.Types.ObjectId(branchId) } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalRevenue = (ticketRevenue[0]?.total || 0) + (salesRevenue[0]?.total || 0);
    const totalExpensesAmount = expensesTotal[0]?.total || 0;
    const netProfit = totalRevenue - totalExpensesAmount;

    res.json({
      success: true,
      dashboard: {
        today: {
          tickets: todayTickets,
          sales: todaySales,
          expenses: todayExpenses
        },
        totals: {
          tickets: totalTickets,
          sales: totalSales,
          expenses: totalExpenses,
          revenue: totalRevenue,
          expensesAmount: totalExpensesAmount,
          netProfit: netProfit
        },
        timeline,
        typeCounts,
        customers,
        checkedIn
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message
    });
  }
});

export default router;