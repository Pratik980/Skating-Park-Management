import mongoose from 'mongoose';

const backupSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  filepath: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  backupDate: {
    type: Date,
    default: Date.now
  },
  dataCount: {
    tickets: { type: Number, default: 0 },
    sales: { type: Number, default: 0 },
    expenses: { type: Number, default: 0 },
    users: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

export default mongoose.model('Backup', backupSchema);