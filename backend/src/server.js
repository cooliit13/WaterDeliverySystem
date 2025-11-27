// server.js
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
import productRoutes from "./routes/productRoutes.js";
import commonRoutes from "./routes/commonRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import addressRoutes from "./routes/addressRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import driverRoutes from "./routes/driverRoutes.js";
import calendarRoutes from './routes/calendarRoutes.js';
import deliveryRoutes from "./routes/deliveryRoutes.js";
import posRoutes from "./routes/posRoutes.js";
import adminDashboardRoutes from "./routes/adminDashboardRoutes.js";
import productStockRoutes from "./routes/productStockRoutes.js";
import adminRatingsRouter from "./routes/AdminRatings.js";
import adminUserRoutes from "./routes/adminUserRoutes.js";
import http from "http";
import { Server as IOServer } from "socket.io";

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
app.use(express.urlencoded({ extended: true }));

//  API Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin/products", productRoutes);
app.use("/api/shop/products", productRoutes);
app.use("/uploads", express.static("uploads"));
app.use("/api/common", commonRoutes);
app.use("/api/shop/cart", cartRoutes);
app.use("/api/shop/address", addressRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/driver", driverRoutes);
app.use('/api/google', calendarRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/driver", deliveryRoutes);
app.use("/api/admin/pos", posRoutes);
app.use("/api/admin/dashboard", adminDashboardRoutes);
app.use("/api/admin/products", productStockRoutes);
app.use("/api/admin/ratings", adminRatingsRouter);
app.use("/api/admin", adminUserRoutes);
// Test endpoint to verify backend connectivity
app.get("/api/test", (req, res) => {
  res.json({ message: "✅ Backend is running and reachable from frontend!" });
});

// ---------- Socket.IO setup (minimal, added) ----------
const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);

// Create socket.io server, allow same frontend origin
const io = new IOServer(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Map userId (string) -> Set(socketId)
const userSockets = new Map();

io.on("connection", (socket) => {
  // simple identify: client emits 'identify' with userId after connect
  socket.on("identify", (userId) => {
    if (!userId) return;
    socket.userId = String(userId);
    const prev = userSockets.get(socket.userId) || new Set();
    prev.add(socket.id);
    userSockets.set(socket.userId, prev);
  });

  // allow a client to join a specific order room (optional)
  socket.on("joinOrderRoom", (orderId) => {
    if (!orderId) return;
    socket.join(`order_${orderId}`);
  });

  socket.on("disconnect", () => {
    if (!socket.userId) return;
    const set = userSockets.get(socket.userId);
    if (!set) return;
    set.delete(socket.id);
    if (set.size === 0) userSockets.delete(socket.userId);
    else userSockets.set(socket.userId, set);
  });
});

// Helper route (lightweight) to notify user about order status updates.
// Minimal: accepts { orderId, status, userId, extra } and emits "order:status:update"
app.post("/api/admin/orders/notify", (req, res) => {
  try {
    const { orderId, status, userId, extra } = req.body;
    if (!orderId || !status || !userId) {
      return res.status(400).json({ error: "orderId, status and userId are required" });
    }

    const payload = {
      orderId,
      status,
      updatedAt: new Date().toISOString(),
      ...(extra || {}),
    };

    // Emit to all sockets for that user
    const sidSet = userSockets.get(String(userId));
    if (sidSet) {
      for (const sid of sidSet) {
        io.to(sid).emit("order:status:update", payload);
      }
    }

    // Also emit to a room named for the order (optional)
    io.to(`order_${orderId}`).emit("order:status:update", payload);

    return res.json({ success: true, emittedTo: sidSet ? Array.from(sidSet) : [], payload });
  } catch (err) {
    console.error("Notify endpoint error:", err);
    return res.status(500).json({ error: "Failed to notify" });
  }
});
// ---------- end Socket.IO setup ----------

//  Start Server (use httpServer for socket.io)
httpServer.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
