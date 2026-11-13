// Checks the environment. In production a bad configuration stops the server from starting
// (a clear message in the Render log beats a half-working shop); in development it only warns.
const isProd = () => process.env.NODE_ENV === "production";

const checkEnv = (env = process.env) => {
    const errors = [];
    const warnings = [];
    const need = (key, why) => { if (!env[key]) errors.push(`${key} is missing (${why})`); };
    const want = (key, why) => { if (!env[key]) warnings.push(`${key} is not set (${why})`); };
    const prod = env.NODE_ENV === "production";

    need("JWT_SECRET", "signs login tokens and OTP hashes");
    if (env.JWT_SECRET && env.JWT_SECRET.length < 32) errors.push("JWT_SECRET must be at least 32 characters");
    if (env.JWT_SECRET && /super_secret|changeme|secret_key|^password|integration-secret/i.test(env.JWT_SECRET)) {
        errors.push("JWT_SECRET looks like a placeholder; generate a random one");
    }

    if (prod) {
        need("MONGO_URI", "production database");
        if (env.MONGO_URI && /127\.0\.0\.1|localhost/.test(env.MONGO_URI)) errors.push("MONGO_URI points at localhost in production");
        need("FRONTEND_URL", "CORS origin, e.g. https://www.yourdomain.com");
        if (env.DISABLE_RATE_LIMIT === "true") errors.push("DISABLE_RATE_LIMIT must not be true in production");
        if (env.SEED_ALLOW_PRODUCTION === "true") warnings.push("SEED_ALLOW_PRODUCTION=true: remove it once you are done seeding");
    } else {
        want("MONGO_URI", "falls back to a local MongoDB");
    }

    need("RAZORPAY_KEY_ID", "online payments");
    need("RAZORPAY_KEY_SECRET", "online payments");
    want("RAZORPAY_WEBHOOK_SECRET", "confirms payments completed after the browser tab closed");
    if (prod && env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_ID.startsWith("rzp_test_")) {
        warnings.push("RAZORPAY_KEY_ID is a TEST key: real customers cannot pay");
    }

    if (!(env.SMTP_USER || env.EMAIL_USER) || !(env.SMTP_PASS || env.EMAIL_PASS)) {
        errors.push("SMTP_USER / SMTP_PASS are missing (email registration OTPs and order emails cannot be sent)");
    }
    for (const k of ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]) need(k, "product image uploads");

    const sms = (env.SMS_PROVIDER || "console").toLowerCase();
    if (prod && sms === "console") warnings.push("SMS_PROVIDER=console: phone login is DISABLED in production. Set SMS_PROVIDER=msg91 or twilio");
    if (sms === "twilio" && !(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM)) errors.push("SMS_PROVIDER=twilio but TWILIO_* values are missing");
    if (sms === "msg91" && !(env.MSG91_AUTH_KEY && env.MSG91_OTP_TEMPLATE_ID)) errors.push("SMS_PROVIDER=msg91 but MSG91_* values are missing");

    return { errors, warnings };
};

const assertEnv = () => {
    const { errors, warnings } = checkEnv();
    warnings.forEach((w) => console.warn(`[env] warning: ${w}`));
    errors.forEach((e) => console.error(`[env] ${isProd() ? "error" : "warning"}: ${e}`));
    if (errors.length && isProd()) {
        console.error("Refusing to start in production with an invalid environment.");
        process.exit(1);
    }
};

module.exports = { checkEnv, assertEnv };
