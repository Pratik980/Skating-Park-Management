import mongoose from 'mongoose';
import moment from 'moment-timezone';
import { convertToNepaliDate } from '../utils/nepaliDate.js';

const salesSchema = new mongoose.Schema({
  // Sale specific fields
  saleNo: {
    type: String,
    sparse: true
  },
  customerName: {
    type: String,
    trim: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sales'
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sales'
    },
    itemName: {
      type: String
    },
    quantity: {
      type: Number,
      min: 1
    },
    price: {
      type: Number
    },
    total: {
      type: Number
    }
  }],
  subtotal: {
    type: Number
  },
  discount: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number
  },
  currency: {
    type: String,
    default: 'NPR'
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Card', 'Digital Wallet', 'Bank Transfer', 'Credit'],
    default: 'Cash'
  },
  
  // Product specific fields
  productName: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    trim: true
  },
  size: {
    type: String,
    trim: true
  },
  costPrice: {
    type: Number
  },
  sellingPrice: {
    type: Number
  },
  stockQuantity: {
    type: Number,
    default: 0
  },
  supplier: {
    type: String,
    trim: true
  },
  barcode: {
    type: String,
    trim: true
  },
  expiryDate: {
    type: Date
  },
  minStockLevel: {
    type: Number,
    default: 5
  },
  
  // Customer specific fields
  phone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  customerType: {
    type: String,
    enum: ['Retail', 'Wholesale'],
    default: 'Retail'
  },
  pendingAmount: {
    type: Number,
    default: 0
  },
  
  // Common fields
  date: {
    englishDate: {
      type: Date,
      default: Date.now
    },
    nepaliDate: {
      type: String
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
  remarks: {
    type: String,
    maxlength: [500, 'Remarks cannot be more than 500 characters']
  },
  
  // Type identifiers
  isSale: {
    type: Boolean,
    default: false
  },
  isProduct: {
    type: Boolean,
    default: false
  },
  isCustomer: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Add pre-save hook to set englishDate, nepaliDate using correct Nepal time
salesSchema.pre('save', function (next) {
  if (!this.date) this.date = {};
  // Always set to real Kathmandu time
  const kathmanduDate = moment().tz('Asia/Kathmandu');
  this.date.englishDate = kathmanduDate.toDate();
  this.date.nepaliDate = convertToNepaliDate(this.date.englishDate);
  next();
});

// Generate sale number automatically before validation
salesSchema.pre('validate', async function(next) {
  if (this.isNew && this.isSale) {
    try {
      const SalesModel = mongoose.model('Sales');
      const count = await SalesModel.countDocuments({ isSale: true });
      const sequence = (count + 1).toString().padStart(3, '0');
      this.saleNo = sequence;
    } catch (err) {
      this.saleNo = (Date.now() + '').slice(-6);
    }
  }
  next();
});

// Calculate total amount before validation for sales
salesSchema.pre('validate', function(next) {
  if (this.isSale && this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((total, item) => total + item.total, 0);
    this.totalAmount = this.subtotal - (this.discount || 0);
  }
  next();
});

// Calculate item totals before validation
salesSchema.pre('validate', function(next) {
  if (this.isSale && this.items) {
    this.items.forEach(item => {
      item.total = item.quantity * item.price;
    });
  }
  next();
});

// Indexes for better performance
salesSchema.index({ branch: 1, isSale: 1, createdAt: -1 });
salesSchema.index({ branch: 1, isProduct: 1 });
salesSchema.index({ branch: 1, isCustomer: 1 });
salesSchema.index({ 'date.englishDate': 1 });
salesSchema.index({ barcode: 1 });

export default mongoose.model('Sales', salesSchema);