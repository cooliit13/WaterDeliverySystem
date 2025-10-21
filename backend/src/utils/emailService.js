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
        pass: process.env.EMAIL_PASS, // App password
      },
    });

    const mailOptions = {
      from: `"Water Delivery System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`📩 Email sent to ${to}`);
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
    throw new Error("Failed to send email");
  }
};

/**
 * Sends a verification email to new users.
 * @param {string} email - recipient's email
 * @param {string} token - verification token
 */
export const sendVerificationEmail = async (email, token) => {
  const verificationLink = `http://localhost:5000/api/auth/verify/${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Welcome to Water Delivery System 💧</h2>
      <p>Please verify your email by clicking the button below:</p>
      <a href="${verificationLink}" 
         style="display:inline-block; background:#007bff;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;">
         Verify Email
      </a>
      <p>If the button doesn’t work, copy and paste this link into your browser:</p>
      <p>${verificationLink}</p>
      <p>This link will expire in 24 hours.</p>
    </div>
  `;

  await sendEmail(email, "Verify your Water Delivery Account", html);
};

export default sendEmail;
