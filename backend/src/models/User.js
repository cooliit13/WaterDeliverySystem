import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type : String,
    required: true,
    unique: true,
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple docs with null googleId
  },
  verificationToken: { 
    type: String, 
  },
  password: {
    type: String,
    required: true,
  },
  resetToken: { 
    type: String, 
  },
  resetTokenExpiration: {
    type: Date
  },
    role: {
    type: String,
    enum: ['customer', 'admin'],
    default: 'customer',
  },
}, { timestamps: true });

export default mongoose.model('User', userSchema);