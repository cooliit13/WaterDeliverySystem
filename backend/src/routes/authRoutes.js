import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import { sendVerificationEmail } from "../utils/emailService.js"; // your email sender
import passport from "passport";
import "../config/passport.js";
import { loginUser, registerUser, googleLogin } from "../controllers/authController.js";


const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register user and send verification email
 */

//  Google Login Route



router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Create user (not verified yet)
    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      verificationToken,
      isVerified: false,
    });

    await newUser.save();

    // Send verification email
    await sendVerificationEmail(email, verificationToken);

    res.status(201).json({
      message:
        "Registration successful! Please check your email to verify your account.",
    });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

/**
 * @route   GET /api/auth/verify/:token
 * @desc    Verify email via token
 */
router.get("/verify/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      return res
        .status(400)
        .send("<h2>Invalid or expired verification link.</h2>");
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.send(
      "<h2>Email verified successfully! You can now close this tab and login.</h2>"
    );
  } catch (error) {
    console.error("Verification Error:", error);
    res.status(500).send("<h2>Server error verifying email.</h2>");
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login only if email verified
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "User not found" });

    //  Block login if email not verified
    if (!user.isVerified) {
      return res
        .status(403)
        .json({ message: "Please verify your email before logging in." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
  { userId: user._id, role: user.role },
  process.env.JWT_SECRET || "yourSecretKey",
  { expiresIn: "1h" }
);

//  Updated login response
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
//  TEST EMAIL ROUTE — for debugging email sending
router.get("/test-email", async (req, res) => {
  try {
    const testRecipient = "your_actual_email@gmail.com";
    const testToken = "test-token";

    await sendVerificationEmail(testRecipient, testToken);

    res.send("✅ Test email sent! Check your inbox or spam folder.");
  } catch (error) {
    console.error("❌ Email Test Error:", error);
    res.status(500).send(`❌ Failed to send test email: ${error.message}`);
  }
});
/**
 * @route   POST /api/auth/logout
 * @desc    Logs user out (clears cookie or token)
 */
router.post("/logout", (req, res) => {
  try {
    res.clearCookie("token"); // optional if you’re using cookies
    return res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout Error:", error);
    res.status(500).json({ success: false, message: "Logout failed" });
  }
  
});
import { forgotPassword, resetPassword } from "../controllers/authController.js";

// Forgot Password - send reset link
router.post("/forgot-password", forgotPassword);

// Reset Password - verify token and update password
router.post("/reset-password/:token", resetPassword);
router.post("/google-login", googleLogin);





export default router;
