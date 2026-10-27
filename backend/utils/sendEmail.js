const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();
const path = require("path");

// Read credentials from Render environment variables
const user = process.env.SMTP_USER || process.env.EMAIL_USER;
const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

if (!user || !pass) {
    console.error(
        "Email configuration missing. Set SMTP_USER and SMTP_PASS in Render."
    );
}

// Gmail transporter
// Using service: "gmail" lets Nodemailer configure Gmail's SMTP
// settings automatically.
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user,
        pass: pass ? pass.replace(/\s/g, "") : undefined,
    },

    // Timeouts prevent your API from hanging indefinitely
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
});

// Verify SMTP connection when the server starts
transporter.verify()
    .then(() => {
        console.log("Email SMTP connection successful");
    })
    .catch((error) => {
        console.error("Email SMTP connection failed:", {
            code: error.code,
            message: error.message,
        });
    });

const sendEmail = async (to, subject, html, options = {}) => {
    if (!user || !pass) {
        throw new Error(
            "Email credentials are not configured. Set SMTP_USER and SMTP_PASS in Render."
        );
    }

    try {
        const mailOptions = {
            from: `"Apna Basket" <${user}>`,
            to,
            subject,
            html,
            text: html.replace(/<[^>]*>/g, ""),
        };

        if (options.replyTo) {
            mailOptions.replyTo = options.replyTo;
        }

        const info = await transporter.sendMail(mailOptions);

        console.log("Verification email sent:", {
            messageId: info.messageId,
            to,
        });

        return info;
    } catch (error) {
        console.error("Error sending verification email:", {
            code: error.code,
            responseCode: error.responseCode,
            response: error.response,
            message: error.message,
        });

        throw new Error(
            `Email delivery failed${error.code ? ` (${error.code})` : ""}: ${error.message}`
        );
    }
};

module.exports = sendEmail;