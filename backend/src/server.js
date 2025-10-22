import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import userRoutes from './routes/userRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import authRoutes from './routes/authRoutes.js';
import session from "express-session";
import passport from "passport";


dotenv.config();
connectDB();

const app = express();

// Middleware order matters
app.use(cors({
  origin: "http://localhost:5173", 
  credentials: true,
}));
app.use(session({
  secret: "yourSecretKey",
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());

//  API Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
// Test endpoint to verify backend connectivity
app.get("/api/test", (req, res) => {
  res.json({ message: "✅ Backend is running and reachable from frontend!" });
});

//  Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
