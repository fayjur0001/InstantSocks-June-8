"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPasswordResetEmail = sendPasswordResetEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
// transporter create
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // Gmail TLS
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
// send reset email
async function sendPasswordResetEmail(to, resetLink) {
    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to,
            subject: "Reset your password",
            html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#09090b;color:#f4f4f5;border-radius:12px">
          <h2 style="margin:0 0 12px;font-size:22px;color:#4ade80">Password Reset</h2>
          <p style="margin:0 0 24px;color:#a1a1aa;line-height:1.6">
            Click the button below to reset your password.
          </p>
          <a href="${resetLink}"
            style="display:inline-block;padding:12px 28px;background:#4ade80;color:#09090b;font-weight:600;border-radius:8px;text-decoration:none;font-size:15px">
            Reset Password
          </a>
          <p style="margin:24px 0 0;font-size:12px;color:#52525b">
            If you didn't request this, ignore this email.
          </p>
        </div>
      `,
        });
        console.log("✅ Email sent:", info.messageId);
    }
    catch (error) {
        console.error("❌ Email send failed:", error);
        throw error; // important
    }
}
