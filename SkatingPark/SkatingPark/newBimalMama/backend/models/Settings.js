import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: [true, 'Please add company name'],
    default: 'बेलका स्केट पार्क एण्ड गेमिङ जोन'
  },
  companyAddress: {
    type: String,
    required: [true, 'Please add company address'],
    default: 'बेलका न.पा.–९ (कुमारी बैंक छेउ) रामपुर'
  },
  contactNumbers: [{
    type: String
  }],
  email: {
    type: String
  },
  panNumber: {
    type: String
  },
  regNo: {
    type: String,
    trim: true,
    default: ''
  },
  logo: {
    type: String
  },
  defaultCurrency: {
    type: String,
    default: 'NPR'
  },
  defaultLanguage: {
    type: String,
    enum: ['en', 'np', 'hi'],
    default: 'en'
  },
  conversionRate: {
    type: Number,
    default: 1.6
  },
  nepaliDateFormat: {
    type: String,
    default: '2082-07-24'
  },
  ticketRules: [{
    type: String
  }],
  country: {
    type: String,
    default: 'Nepal'
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
  }
}, {
  timestamps: true
});

export default mongoose.model('Settings', settingsSchema);