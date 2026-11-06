// Sends text messages (login codes and order updates).
// Choose a provider with SMS_PROVIDER:
//   console  - prints the message in the server log. Local development only.
//   twilio   - needs TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
//   msg91    - needs MSG91_AUTH_KEY and MSG91_OTP_TEMPLATE_ID (and MSG91_ORDER_TEMPLATE_ID for order updates)
//
// India note: commercial SMS must use DLT-registered templates. Twilio and MSG91 both
// document how to register them. Until that is done, use the provider's test mode.

const provider = () => (process.env.SMS_PROVIDER || "console").toLowerCase();

const isConfigured = () => {
    const p = provider();
    if (p === "console") return process.env.NODE_ENV !== "production";
    if (p === "twilio") return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);
    if (p === "msg91") return Boolean(process.env.MSG91_AUTH_KEY && process.env.MSG91_OTP_TEMPLATE_ID);
    return false;
};

const toE164 = (phone10) => `+91${phone10}`;

const sendViaTwilio = async (phone10, text) => {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ To: toE164(phone10), From: process.env.TWILIO_FROM, Body: text }),
    });
    if (!res.ok) throw new Error(`Twilio error ${res.status}: ${(await res.text()).slice(0, 200)}`);
};

// MSG91 sends from a pre-approved template, so the variables are passed instead of free text.
const sendViaMsg91 = async (phone10, text, { kind, vars }) => {
    const templateId = kind === "otp" ? process.env.MSG91_OTP_TEMPLATE_ID : process.env.MSG91_ORDER_TEMPLATE_ID;
    if (!templateId) throw new Error(`MSG91 template for "${kind}" is not configured`);
    const res = await fetch("https://control.msg91.com/api/v5/flow", {
        method: "POST",
        headers: { authkey: process.env.MSG91_AUTH_KEY, "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({
            template_id: templateId,
            short_url: "0",
            recipients: [{ mobiles: `91${phone10}`, ...vars }],
        }),
    });
    if (!res.ok) throw new Error(`MSG91 error ${res.status}: ${(await res.text()).slice(0, 200)}`);
};

/**
 * @param phone10  10-digit Indian mobile number
 * @param text     message body (used by console and Twilio)
 * @param opts     { kind: "otp" | "order", vars } vars are the template variables for MSG91
 */
const sendSms = async (phone10, text, opts = { kind: "order", vars: {} }) => {
    const p = provider();
    if (p === "console") {
        if (process.env.NODE_ENV === "production") throw new Error("SMS_PROVIDER=console is not allowed in production");
        console.log(`[SMS to ${phone10}] ${text}`);
        return;
    }
    if (p === "twilio") return sendViaTwilio(phone10, text);
    if (p === "msg91") return sendViaMsg91(phone10, text, opts);
    throw new Error(`Unknown SMS_PROVIDER "${p}"`);
};

module.exports = { sendSms, isConfigured };
