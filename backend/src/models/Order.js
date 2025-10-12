import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  items: [
    {
      productName: { type: String, required: true },
      waterType: { type: String, enum: ['distilled', 'mineral', 'alkaline', 'refilled'], required: true },
      size: { type: String, enum: ['500ml', '1L', '5L', 'gallon'], required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true },
      subtotal: { type: Number, required: true },
    },
  ],
  totalPrice: {
    type: Number,
    required: true,
  },
  deliveryAddress: {
    street: String,
    barangay: String,
    city: String,
    province: String,
  },
  deliveryDate: {
    type: Date,
    default: null,
  },
  assignedDriver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'out-for-delivery', 'delivered', 'cancelled'],
    default: 'pending',
  },
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);
