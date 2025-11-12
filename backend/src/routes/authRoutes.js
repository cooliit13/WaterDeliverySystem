import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import { sendVerificationEmail } from "../utils/emailService.js";
import passport from "passport";
import "../config/passport.js";
import {
  loginUser,
  registerUser,
  googleLogin,
  forgotPassword,
  resetPassword,
  verifyEmail,
} from "../controllers/authController.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ----------------------------------------------
   ✅  Create uploads folder if not existing
------------------------------------------------*/
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

/* ----------------------------------------------
   ✅  Multer setup (must be before using upload)
------------------------------------------------*/
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

/* ----------------------------------------------
   ✅ Register route
------------------------------------------------*/
router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      verificationToken,
      isVerified: false,
    });

    await newUser.save();
    await sendVerificationEmail(email, verificationToken);

    res.status(201).json({
      message: "Registration successful! Please check your email to verify your account.",
    });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

/* ----------------------------------------------
   ✅ Verify Email
------------------------------------------------*/
router.get("/verify/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      return res.status(400).send("<h2>Invalid or expired verification link.</h2>");
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.send("<h2>Email verified successfully! You can now close this tab and login.</h2>");
  } catch (error) {
    console.error("Verification Error:", error);
    res.status(500).send("<h2>Server error verifying email.</h2>");
  }
});

/* ----------------------------------------------
   ✅ Login route
------------------------------------------------*/
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.isVerified) {
      return res.status(403).json({ message: "Please verify your email before logging in." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || "yourSecretKey",
      { expiresIn: "1h" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
      },
      token,
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

/* ----------------------------------------------
   ✅ Forgot + Reset Password
------------------------------------------------*/
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

/* ----------------------------------------------
   ✅ Google Login
------------------------------------------------*/
router.post("/google-login", googleLogin);

/* ----------------------------------------------
   ✅ Logout
------------------------------------------------*/
/* ----------------------------------------------
   ✅ Logout (Fully clears session + client state)
------------------------------------------------*/
router.post("/logout", (req, res) => {
  try {
    // 🔥 Clear both token cookie (if any) AND disable caching
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    // Prevent browser from caching the dashboard page
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");

    return res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout Error:", error);
    return res.status(500).json({ success: false, message: "Logout failed" });
  }
});

/* ----------------------------------------------
   ✅ Admin-only Upload Route
------------------------------------------------*/
router.post(
  "/admin/products/upload-image",
  authMiddleware,
  upload.single("image"),
  async (req, res) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Access denied. Admins only." });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, message: "No image uploaded" });
      }

      const imageUrl = `/uploads/${req.file.filename}`;
      return res.status(200).json({
        success: true,
        message: "Image uploaded successfully",
        result: { url: imageUrl },
      });
    } catch (error) {
      console.error("❌ Upload Error:", error.message);
      return res.status(500).json({ success: false, message: "Server error during image upload" });
    }
  }
);

/* ----------------------------------------------
   ✅ Public Route - Get All Uploaded Images
   (for customer dashboard display)
------------------------------------------------*/
router.get("/common/feature/get", async (req, res) => {
  try {
    const uploadsDir = path.join(process.cwd(), "uploads");
    const files = fs.readdirSync(uploadsDir);

    const imageUrls = files.map((file) => `/uploads/${file}`);

    res.status(200).json({
      success: true,
      message: "Images fetched successfully",
      images: imageUrls,
    });
  } catch (error) {
    console.error("❌ Fetch Images Error:", error.message);
    res.status(500).json({ success: false, message: "Server error fetching images" });
  }
});
/* ----------------------------------------------
   ✅ Check Auth (Fix for frontend 404)
------------------------------------------------*/
/* ----------------------------------------------
   ✅ Fixed Check Auth (Universal for all roles)
------------------------------------------------*/
router.get("/check-auth", authMiddleware, async (req, res) => {
  try {
    // 🔥 Support both { id } and { userId } from token
    const userId = req.user.id || req.user.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.error("Check Auth Error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ----------------------------------------------
   ✅ Check Auth (used by frontend auto-login)
------------------------------------------------*/
router.get("/check-auth", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Check Auth Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
