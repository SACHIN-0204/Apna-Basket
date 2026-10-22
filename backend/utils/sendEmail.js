const path = require('path');
const dotenv = require('dotenv');
const nodeMailer = require('nodemailer');

dotenv.config({ path: path.join(__dirname, '../.env') });

const sendEmail = async (to, subject, html, options = {}) => {
    const user = process.env.SMTP_USER || process.env.EMAIL_USER || process.env.GMAIL_USER;
    const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.GMAIL_PASS;
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT) || 587;

    if (!user || !pass) {
        throw new Error('Email credentials are not configured. Set SMTP_USER/SMTP_PASS or GMAIL_USER/GMAIL_PASS in backend/.env.');
    }

    try {
        const transporter = nodeMailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: {
                user,
                pass: pass.replace(/\s/g, '')
            }
        });

        await transporter.verify();

        const mailOptions = {
            from: user,
            to,
            subject,
            html,
            text: html.replace(/<[^>]*>/g, '')
        };

        if (options.replyTo) {
            mailOptions.replyTo = options.replyTo;
        }

        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending verification email:', {
            code: error.code,
            responseCode: error.responseCode,
            response: error.response,
            message: error.message
        });
        throw new Error(`Email delivery failed${error.code ? ` (${error.code})` : ''}: ${error.message}`);
    }
};

module.exports = sendEmail;
