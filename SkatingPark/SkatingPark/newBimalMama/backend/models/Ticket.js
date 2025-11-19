import mongoose from 'mongoose';
import Sequence from './Sequence.js';
import { getCurrentNepaliDate, convertToNepaliDate } from '../utils/nepaliDate.js';

const ticketSchema = new mongoose.Schema({
  ticketNo: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: [true, 'Please add customer name'],
    trim: true
  },
  contactNumber: {
    type: String,
    trim: true
  },
  playerNames: [{
    type: String,
    trim: true
  }],
  numberOfPeople: {
    type: Number,
    min: 1,
    default: 1
  },
  ticketType: {
    type: String,
    enum: ['Adult', 'Child', 'Group', 'Custom'],
    required: [true, 'Please select ticket type']
  },
  fee: {
    type: Number,
    required: [true, 'Please add ticket fee']
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  perPersonFee: {
    type: Number,
    default: 0
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
  time: {
    type: String,
    required: true
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
  isRefunded: {
    type: Boolean,
    default: false
  },
  refundReason: {
    type: String
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  refundedPlayers: [{
    type: String,
    trim: true
  }],
  playerStatus: {
    totalPlayers: {
      type: Number,
      default: 1
    },
    playedPlayers: {
      type: Number,
      default: 0
    },
    waitingPlayers: {
      type: Number,
      default: 0
    },
    refundedPlayersCount: {
      type: Number,
      default: 0
    }
  },
  status: {
    type: String,
    enum: ['booked', 'playing', 'completed', 'cancelled'],
    default: 'booked'
  },
  qrCode: {
    type: String
  },
  printed: {
    type: Boolean,
    default: false
  },
  groupInfo: {
    groupName: {
      type: String,
      trim: true
    },
    groupNumber: {
      type: String,
      trim: true
    },
    groupPrice: {
      type: Number,
      default: 0
    },
    totalMembers: {
      type: Number,
      default: 0
    }
  },
  refundDetails: {
    refundName: {
      type: String,
      trim: true
    },
    refundMethod: {
      type: String,
      enum: ['cash', 'online', 'bank', 'wallet', 'other'],
      default: 'cash'
    },
    refundedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    paymentReference: {
      type: String,
      trim: true
    }
  },
  extraTimeEntries: [{
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    minutes: {
      type: Number,
      required: true
    },
    amount: {
      type: Number,
      default: 0
    },
    label: {
      type: String
    },
    notes: {
      type: String,
      trim: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  totalExtraMinutes: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Generate unique sequential ticket number
ticketSchema.pre('validate', async function(next) {
  if (this.isNew && !this.ticketNo) {
    try {
      // Get next sequence number atomically (ensures uniqueness)
      const sequenceValue = await Sequence.getNext('ticketNo');
      // Format as 6-digit number (e.g., 000001, 000002, etc.)
      this.ticketNo = sequenceValue.toString().padStart(6, '0');
    } catch (err) {
      console.error('Error generating ticket number:', err);
      // Fallback: use timestamp-based unique number
      const timestamp = Date.now().toString();
      this.ticketNo = timestamp.slice(-8);
    }
  }
  next();
});

// Ensure dates and times are always set to real current date/time for new tickets
ticketSchema.pre('save', function(next) {
  // Only set date/time for new tickets (not updates)
  if (this.isNew) {
    const now = new Date();
    
    // Always use real current date and time for new tickets
    if (!this.date) {
      this.date = {};
    }
    // Set to current real date/time
    this.date.englishDate = now;
    
    // Always convert English date to Nepali date (ensures accuracy)
    this.date.nepaliDate = convertToNepaliDate(this.date.englishDate);
    
    // Always set time to current real time for new tickets
    if (!this.time) {
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');
      this.time = `${hours}:${minutes}:${seconds}`;
    }
  } else {
    // For updates, ensure Nepali date is synced with English date if English date changed
    if (this.isModified('date.englishDate') && this.date?.englishDate) {
      this.date.nepaliDate = convertToNepaliDate(this.date.englishDate);
    }
  }
  
  next();
});

export default mongoose.model('Ticket', ticketSchema);