import mongoose from 'mongoose';

const sequenceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  value: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Static method to get next sequence value atomically
sequenceSchema.statics.getNext = async function(sequenceName) {
  const sequence = await this.findOneAndUpdate(
    { name: sequenceName },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );
  return sequence.value;
};

export default mongoose.model('Sequence', sequenceSchema);

