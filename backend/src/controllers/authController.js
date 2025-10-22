import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import User from "../models/User.js";
import { sendVerificationEmail } from "../utils/emailService.js";
import { OAuth2Client } from "google-auth-library";


// REGISTER USER (with verification)

export const registerUser = async (req, res) => {
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
      success: true,
      message: "Registration successful! Please check your email to verify your account.",
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        profileImage: newUser.profileImage,
      },
    });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// controllers/authController.js



export const googleLogin = async (req, res) => {
  try {
    const { email, fullName } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Missing email from Google login" });
    }

    // Check if the user already exists
    let user = await User.findOne({ email });

    // If not, create one automatically
    if (!user) {
      user = new User({
        fullName,
        email,
        password: null, // no password for Google users
        isVerified: true, // mark as verified since Google verified their email
      });
      await user.save();
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || "yourSecretKey",
      { expiresIn: "1h" }
    );

    // Return token and user info
    res.status(200).json({
      success: true,
      message: "Google login successful",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Google Login Error:", error);
    res.status(500).json({ message: "Server error during Google login" });
  }
};




// LOGIN USER (with reCAPTCHA)

export const loginUser = async (req, res) => {
  try {
    const { email, password, captchaToken } = req.body;

    // 🔹 Verify reCAPTCHA
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captchaToken}`;
    const captchaResponse = await fetch(verifyUrl, { method: "POST" });
    const captchaData = await captchaResponse.json();

    if (!captchaData.success) {
      return res.status(400).json({ message: "reCAPTCHA verification failed" });
    }

    // 🔹 Find user
    let user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // 🔹 Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res.status(401).json({ message: "Invalid credentials" });

    // 🔹 Re-fetch the user from MongoDB to ensure latest role
    user = await User.findById(user._id);

    // 🔹 Create JWT token (with role)
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || "yourSecretKey",
      { expiresIn: "1h" }
    );

    // 🔹 Send the full, current user object
    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage || null,
      },
      token,
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};




// FORGOT PASSWORD
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "No account with this email" });

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetToken = resetToken;
    user.resetTokenExpiration = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetLink = `http://localhost:5173/auth/reset-password/${resetToken}`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Password Reset Request",
      html: `<p>Click the link below to reset your password:</p>
             <a href="${resetLink}">${resetLink}</a>
             <p>This link expires in 1 hour.</p>`,
    });

    res.status(200).json({ message: "Password reset email sent" });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// RESET PASSWORD

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiration: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ message: "Invalid or expired token" });

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = undefined;
    user.resetTokenExpiration = undefined;
    await user.save();

    res.status(200).json({ message: "Password successfully reset" });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      return res.status(400).send("<h2>Invalid or expired verification link.</h2>");
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.send("<h2>Email verified successfully! You can now log in.</h2>");
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).send("<h2>Server error verifying email.</h2>");
  }
};
