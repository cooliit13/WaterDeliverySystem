import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  fullName: {
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
    sparse: true,
  },
  verificationToken: { 
    type: String, 
  },
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  password: {
    type: String,
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

  //  Profile image field
  profileImage: {
    type: String,
    default: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
  },

  //  NEW: Google OAuth tokens for Calendar integration
  googleTokens: {
    access_token: String,
    refresh_token: String,
    scope: String,
    token_type: String,
    expiry_date: Number,
  },

}, { timestamps: true });

export default mongoose.model('User', userSchema);
