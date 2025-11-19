import mongoose from 'mongoose';
import { getCurrentNepaliDate, convertToNepaliDate } from '../utils/nepaliDate.js';
import moment from 'moment-timezone';

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

// Generate unique random ticket number (6 digits)
ticketSchema.pre('validate', async function(next) {
  if (this.isNew && !this.ticketNo) {
    try {
      const TicketModel = mongoose.model('Ticket');
      let ticketNo;
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 10; // Prevent infinite loop
      
      // Generate random 6-digit number and check for uniqueness
      while (!isUnique && attempts < maxAttempts) {
        // Generate random 6-digit number (100000 to 999999)
        ticketNo = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Check if this ticket number already exists
        const existing = await TicketModel.findOne({ ticketNo });
        if (!existing) {
          isUnique = true;
        }
        attempts++;
      }
      
      if (isUnique) {
        this.ticketNo = ticketNo;
      } else {
        // Fallback: use timestamp-based unique number if all random attempts failed
        const timestamp = Date.now().toString();
        this.ticketNo = timestamp.slice(-8);
      }
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
    // Get current time in Nepal, not server/UTC
    const kathmanduNow = moment().tz("Asia/Kathmandu");
    // Always set both englishDate and time to Nepal time
    if (!this.date) {
      this.date = {};
    }
    this.date.englishDate = kathmanduNow.toDate();
    // Always convert English date to Nepali date (ensures accuracy)
    this.date.nepaliDate = convertToNepaliDate(this.date.englishDate);
    if (!this.time) {
      this.time = kathmanduNow.format("HH:mm:ss");
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