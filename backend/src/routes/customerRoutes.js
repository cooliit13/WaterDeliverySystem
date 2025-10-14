import express from "express";
import {
  registerCustomer,
  authCustomer,
  getCustomerProfile,
  updateCustomerProfile,
  deleteCustomer,
  getAllCustomers,
  validateToken,
} from "../controllers/customerController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";



const router = express.Router();

// Public routes
router.post("/register", registerCustomer);
router.post("/login", authCustomer);

// Protected routes
router.get("/profile", authMiddleware, getCustomerProfile);
router.put("/profile", authMiddleware, updateCustomerProfile);
router.delete("/profile", authMiddleware, deleteCustomer);
router.get("/validate", authMiddleware, validateToken);


export default router;
