import mongoose from "mongoose";

const driverSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    contactNumber: {       
      type: String,
      required: true,
    },
    vehicleNumber: {          
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },
    vehicleType: {
      type: String,
      default: "motorcycle",
    },
    address: {
      type: String,
    },
    password: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Driver = mongoose.model("Driver", driverSchema);

export default Driver;