const sendEmail = require("../utils/sendEmail");

const escapeHtml = (value = "") =>
    String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Very small in-memory rate limit: 5 messages per IP every 15 minutes
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map();

const isRateLimited = (ip) => {
    const now = Date.now();
    const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
    if (recent.length >= MAX_PER_WINDOW) {
        hits.set(ip, recent);
        return true;
    }
    recent.push(now);
    hits.set(ip, recent);
    return false;
};

const sendContactMessage = async (req, res) => {
    try {
        const { name, email, phone, subject, message, website } = req.body || {};

        // Honeypot: real users never fill this hidden field. Pretend success for bots.
        if (website) {
            return res.status(200).json({ message: "Thank you! We'll get back to you soon." });
        }

        if (isRateLimited(req.ip)) {
            return res.status(429).json({ message: "Too many messages. Please try again in a few minutes." });
        }

        const cleanName = String(name || "").trim();
        const cleanEmail = String(email || "").trim();
        const cleanPhone = String(phone || "").trim();
        const cleanSubject = String(subject || "General enquiry").trim();
        const cleanMessage = String(message || "").trim();

        if (!cleanName || !cleanEmail || !cleanMessage) {
            return res.status(400).json({ message: "Name, email and message are required." });
        }
        if (!EMAIL_REGEX.test(cleanEmail)) {
            return res.status(400).json({ message: "Please enter a valid email address." });
        }
        if (cleanName.length > 100 || cleanSubject.length > 150 || cleanPhone.length > 20) {
            return res.status(400).json({ message: "One of the fields is too long." });
        }
        if (cleanMessage.length < 10 || cleanMessage.length > 2000) {
            return res.status(400).json({ message: "Message must be between 10 and 2000 characters." });
        }

        const inbox =
            process.env.CONTACT_EMAIL ||
            process.env.SMTP_USER ||
            process.env.EMAIL_USER ||
            process.env.GMAIL_USER;

        if (!inbox) {
            return res.status(500).json({ message: "Contact service is not configured. Please call or email us directly." });
        }

        const html = `
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
              <div style="background:#1f8a43;color:#fff;padding:18px 22px;">
                <h2 style="margin:0;font-size:20px;">New message - Apna Basket</h2>
              </div>
              <div style="padding:22px;color:#111827;font-size:15px;line-height:1.6;">
                <p style="margin:0 0 6px;"><strong>Subject:</strong> ${escapeHtml(cleanSubject)}</p>
                <p style="margin:0 0 6px;"><strong>Name:</strong> ${escapeHtml(cleanName)}</p>
                <p style="margin:0 0 6px;"><strong>Email:</strong> ${escapeHtml(cleanEmail)}</p>
                <p style="margin:0 0 14px;"><strong>Phone:</strong> ${escapeHtml(cleanPhone) || "Not provided"}</p>
                <p style="margin:0 0 6px;"><strong>Message:</strong></p>
                <p style="margin:0;white-space:pre-wrap;background:#f9fafb;padding:12px;border-radius:8px;">${escapeHtml(cleanMessage)}</p>
              </div>
            </div>`;

        await sendEmail(inbox, `[Apna Basket] ${cleanSubject} - ${cleanName}`, html, { replyTo: cleanEmail });

        res.status(200).json({ message: "Thank you! We'll get back to you soon." });
    } catch (error) {
        console.error("Contact message failed:", error.message);
        res.status(500).json({ message: "We couldn't send your message right now. Please call or email us directly." });
    }
};

module.exports = { sendContactMessage };
