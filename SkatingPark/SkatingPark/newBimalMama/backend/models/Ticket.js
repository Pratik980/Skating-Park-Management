import mongoose from 'mongoose';

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

// Generate simple ticket number starting from 01
ticketSchema.pre('validate', async function(next) {
  if (this.isNew && !this.ticketNo) {
    try {
      const TicketModel = mongoose.model('Ticket');
      const totalCount = await TicketModel.countDocuments(); // all tickets ever
      const sequence = (totalCount + 1).toString().padStart(3, '0');
      this.ticketNo = sequence;
    } catch (err) {
      // fallback unique
      this.ticketNo = (Date.now() + '').slice(-6);
    }
  }
  next();
});

export default mongoose.model('Ticket', ticketSchema);