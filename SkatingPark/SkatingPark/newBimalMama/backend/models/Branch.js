import mongoose from 'mongoose';

const branchSchema = new mongoose.Schema({
  branchName: {
    type: String,
    required: [true, 'Please add branch name'],
    unique: true,
    trim: true
  },
  location: {
    type: String,
    required: [true, 'Please add location']
  },
  contactNumber: {
    type: String,
    required: [true, 'Please add contact number']
  },
  email: {
    type: String,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  manager: {
    type: String,
    required: [true, 'Please add manager name']
  },
  openingTime: {
    type: String,
    default: '09:00'
  },
  closingTime: {
    type: String,
    default: '20:00'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false 
  }
}, {
  timestamps: true
});

export default mongoose.model('Branch', branchSchema);