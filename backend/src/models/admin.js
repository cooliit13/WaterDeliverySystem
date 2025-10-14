import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    position: {
      type: String,
      default: "System Administrator",
    },
    permissions: {
      type: [String],
      default: ["manage_users", "manage_orders", "manage_drivers", "manage_customers", "view_reports"],
    },
  },
  { timestamps: true }
);

export default mongoose.model("Admin", adminSchema);
