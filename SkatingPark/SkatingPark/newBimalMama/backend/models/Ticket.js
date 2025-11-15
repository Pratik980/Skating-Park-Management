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
    let attempts = 0;
    const maxAttempts = 15;
    
    while (attempts < maxAttempts) {
      try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);

        const query = {
          branch: this.branch,
          'date.englishDate': {
            $gte: startOfDay,
            $lt: endOfDay
          }
        };

        // Get the highest sequence number for today to avoid gaps
        const lastTicket = await mongoose.model('Ticket').findOne(query)
          .sort({ ticketNo: -1 })
          .select('ticketNo');
        
        let sequence = 1;
        if (lastTicket && lastTicket.ticketNo) {
          const parts = lastTicket.ticketNo.split('-');
          if (parts.length > 1) {
            const lastSeq = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(lastSeq)) {
              sequence = lastSeq + 1;
            }
          }
        }
        
        const dateStr = startOfDay.toISOString().slice(0, 10).replace(/-/g, '');
        let proposedTicketNo = `${dateStr}-${sequence.toString().padStart(3, '0')}`;
        
        // Check if this ticket number already exists (race condition check)
        const existingTicket = await mongoose.model('Ticket').findOne({ 
          ticketNo: proposedTicketNo,
          branch: this.branch
        });
        
        if (!existingTicket) {
          this.ticketNo = proposedTicketNo;
          break;
        } else {
          // If duplicate found, try with incremented sequence
          attempts++;
          sequence++;
          
          if (attempts >= maxAttempts) {
            // Fallback: use timestamp to ensure absolute uniqueness
            const timestamp = Date.now().toString().slice(-8);
            this.ticketNo = `${dateStr}-${timestamp}`;
            break;
          }
          // Wait before retrying to avoid immediate collision
          await new Promise(resolve => setTimeout(resolve, 20 + (attempts * 10)));
        }
      } catch (error) {
        // Fallback ticket number with timestamp
        const timestamp = Date.now().toString().slice(-8);
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        this.ticketNo = `${dateStr}-${timestamp}`;
        break;
      }
    }
  }
  next();
});

export default mongoose.model('Ticket', ticketSchema);