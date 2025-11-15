import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  expenseNo: {
    type: String,
    required: true,
    unique: true
  },
  category: {
    type: String,
    required: [true, 'Please select expense category'],
    trim: true,
    maxlength: [50, 'Category name cannot be more than 50 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot be more than 200 characters']
  },
  amount: {
    type: Number,
    required: [true, 'Please add expense amount'],
    min: [0, 'Amount cannot be negative']
  },
  currency: {
    type: String,
    default: 'NPR'
  },
  date: {
    englishDate: {
      type: Date,
      default: Date.now
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
  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiptNo: {
    type: String,
    trim: true
  },
  vendor: {
    type: String,
    trim: true,
    maxlength: [100, 'Vendor name cannot be more than 100 characters']
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Card', 'Bank Transfer'],
    default: 'Cash'
  },
  remarks: {
    type: String,
    maxlength: [500, 'Remarks cannot be more than 500 characters']
  }
}, {
  timestamps: true
});

// Generate expense number automatically before validation
expenseSchema.pre('validate', async function(next) {
  if (this.isNew) {
    try {
      const count = await mongoose.model('Expense').countDocuments();
      this.expenseNo = `EXP${(count + 1).toString().padStart(5, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Add index for better performance
expenseSchema.index({ branch: 1, createdAt: -1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ 'date.englishDate': -1 });

export default mongoose.model('Expense', expenseSchema);