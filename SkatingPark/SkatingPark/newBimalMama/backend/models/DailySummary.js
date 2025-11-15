import mongoose from 'mongoose';

const dailySummarySchema = new mongoose.Schema({
  date: {
    englishDate: {
      type: Date,
      required: true
    },
    nepaliDate: {
      type: String,
      required: true
    }
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  totalTickets: {
    type: Number,
    default: 0
  },
  totalTicketSales: {
    type: Number,
    default: 0
  },
  totalOtherSales: {
    type: Number,
    default: 0
  },
  totalExpenses: {
    type: Number,
    default: 0
  },
  totalRevenue: {
    type: Number,
    default: 0
  },
  profitLoss: {
    type: Number,
    default: 0
  },
  tickets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket'
  }],
  sales: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sales'
  }],
  expenses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense'
  }]
}, {
  timestamps: true
});

// Calculate profit/loss before save
dailySummarySchema.pre('save', function(next) {
  this.totalRevenue = this.totalTicketSales + this.totalOtherSales;
  this.profitLoss = this.totalRevenue - this.totalExpenses;
  next();
});

export default mongoose.model('DailySummary', dailySummarySchema);