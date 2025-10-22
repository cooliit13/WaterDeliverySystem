import nodemailer from "nodemailer";

/**
 * General-purpose email sender
 * @param {string} to - recipient email
 * @param {string} subject - subject line
 * @param {string} html - HTML message content
 */
const sendEmail = async (to, subject, html) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // your Gmail
        pass: process.env.EMAIL_PASS, // App password (not your real Gmail password)
      },
    });

    const mailOptions = {
      from: `"Water Delivery System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log(` Email sent to ${to}`);
  } catch (error) {
    console.error(" Email sending failed:", error.message);
    throw new Error("Failed to send email");
  }
};


export const sendVerificationEmail = async (email, token) => {
  
  const verificationLink = `http://localhost:5173/auth/verify/${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color: #007bff;">Welcome to Water Delivery System 💧</h2>
      <p>Thanks for signing up! Please verify your email by clicking the button below:</p>
      <a href="${verificationLink}" 
         style="display:inline-block;background:#007bff;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;">
         Verify Email
      </a>
      <p>If the button doesn’t work, copy this link and paste it into your browser:</p>
      <p style="color:#007bff;">${verificationLink}</p>
      <p>This link will expire in 24 hours.</p>
    </div>
  `;

  await sendEmail(email, "Verify your Water Delivery Account", html);
};

//send password reset email
export const sendPasswordResetEmail = async (email, token) => {
  // Send users back to frontend reset page
  const resetLink = `http://localhost:5173/auth/reset-password/${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color:#007bff;">Password Reset Request 🔒</h2>
      <p>We received a request to reset your password. Click the button below to set a new password:</p>
      <a href="${resetLink}" 
         style="display:inline-block;background:#007bff;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;">
         Reset Password
      </a>
      <p>If the button doesn’t work, copy and paste this link into your browser:</p>
      <p style="color:#007bff;">${resetLink}</p>
      <p>This link will expire in 1 hour for your security.</p>
      <hr/>
      <p style="font-size:12px;color:#888;">If you didn’t request this, please ignore this email.</p>
    </div>
  `;

  await sendEmail(email, "Reset Your Water Delivery Password", html);
};
export const sendPasswordResetSuccessEmail = async (email) => {
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color:#007bff;">Password Successfully Changed ✅</h2>
      <p>Your Water Delivery account password was recently updated.</p>
      <p>If this wasn’t you, please reset your password immediately.</p>
    </div>
  `;
  await sendEmail(email, "Your Water Delivery Password Has Been Changed", html);
};


export default sendEmail;
