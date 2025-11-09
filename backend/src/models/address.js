import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User"
  },

  address: {
    type: String,
    required: true
  },

  city: {
    type: String,
    required: true
  },

  phone: {
    type: String,
    required: true
  },

  pincode: {
    type: String,
    required: true
  },

  notes: {
    type: String,
    default: ""
  }
}, { timestamps: true });

export default mongoose.model("Address", addressSchema);
