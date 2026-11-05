const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const OTP_VALID_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

// crypto.randomInt is unpredictable; Math.random is not safe for security codes
const generateOTP = () => crypto.randomInt(100000, 1000000).toString();

// Only a hash of the OTP is stored, so a database leak does not expose live codes
const hashOtp = (otp) =>
  crypto.createHmac('sha256', process.env.JWT_SECRET || '').update(String(otp)).digest('hex');

const otpMatches = (storedHash, otp) => {
  const a = Buffer.from(String(storedHash || ''), 'utf8');
  const b = Buffer.from(hashOtp(otp), 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// Sets a fresh OTP on the user document (not saved here) and returns the plain code for the email
const issueOtp = (user) => {
  const otp = generateOTP();
  user.otp = hashOtp(otp);
  user.otpExpires = Date.now() + OTP_VALID_MS;
  user.otpAttempts = 0;
  return otp;
};

// const sendVerificationEmail = async (user, otp) => {
//   const message = `Hello ${user.username},\n\nThank you for registering with Apna Basket.\nYour OTP for email verification is: ${otp}\n\nThis OTP will expire in 10 minutes.`;

//   await sendEmail(user.email, 'Verify your email - Apna Basket', message);
// };


const sendVerificationEmail = async (user, otp) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Welcome to Apna Basket, ${user.username}!</h2>

        <p>Thank you for registering with Apna Basket.</p>

        <p>Your email verification OTP is:</p>

        <div style="
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          margin: 20px 0;
        ">
          ${otp}
        </div>

        <p>
          This OTP will expire in <strong>10 minutes</strong>.
        </p>

        <p>
          If you did not create this account, you can safely ignore this email.
        </p>

        <p>
          Thanks,<br>
          <strong>Apna Basket Team</strong>
        </p>
      </body>
    </html>
  `;

  await sendEmail(
    user.email,
    "Verify your email - Apna Basket",
    html
  );
};


const registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.verified) {
        return res.status(409).json({ message: 'User already exists' });
      }

      const salt = await bcrypt.genSalt(10);
      existingUser.username = username;
      existingUser.password = await bcrypt.hash(password, salt);
      const resendOtpCode = issueOtp(existingUser);
      await existingUser.save();
      try {
        await sendVerificationEmail(existingUser, resendOtpCode);
      } catch (emailError) {
        return res.status(503).json({
          message: 'Registration could not send the verification email. Configure SMTP_USER and SMTP_PASS on the backend (use a Gmail App Password), then try again.'
        });
      }

      return res.status(200).json({
        email: existingUser.email,
        pendingVerification: true,
        message: 'Your account is awaiting verification. A new OTP has been sent to your email.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = new User({
      username,
      email,
      password: hashedPassword,
      verified: false
    });
    const otp = issueOtp(user);
    await user.save();

    try {
      await sendVerificationEmail(user, otp);
    } catch (emailError) {
      await User.deleteOne({ _id: user._id });
      return res.status(503).json({
        message: 'Registration could not send the verification email. Configure SMTP_USER and SMTP_PASS on the backend (use a Gmail App Password), then try again.'
      });
    }

    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      pendingVerification: true,
      message: 'Account created successfully. Please verify your email with the OTP sent to your inbox.'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = email ? await User.findOne({ email }) : null;

    // Same answer for "no such user" and "already verified": never hand out a token
    // here without a correct OTP, and don't reveal which emails have accounts.
    if (!user || user.verified) {
      return res.status(400).json({ message: 'Invalid or expired OTP. Please request a new one or log in.' });
    }

    if (!user.otp || !user.otpExpires || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({ message: 'Too many wrong attempts. Please request a new OTP.' });
    }

    if (!otpMatches(user.otp, otp)) {
      await User.updateOne({ _id: user._id }, { $inc: { otpAttempts: 1 } });
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    user.verified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    user.otpAttempts = 0;
    await user.save();

    res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
      message: 'Email verified successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const resendOtp = async (req, res) => {
  const { email } = req.body;
  const genericReply = { message: 'If this account is waiting for verification, a new OTP has been sent to its email.' };

  try {
    const user = email ? await User.findOne({ email }) : null;

    // Same reply whether or not the account exists, so emails cannot be probed
    if (!user || user.verified) {
      return res.status(200).json(genericReply);
    }

    const otp = issueOtp(user);
    await user.save();

    try {
      await sendVerificationEmail(user, otp);
    } catch (emailError) {
      return res.status(503).json({
        message: 'Could not send the verification email right now. Please try again in a few minutes.'
      });
    }

    res.status(200).json(genericReply);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && (await bcrypt.compare(password, user.password))) {
      if (!user.verified) {
        return res.status(403).json({ message: 'Please verify your email before logging in.' });
      }

      res.status(200).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        token: generateToken(user._id),
        role: user.role
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const getUser = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.status(200).json(users);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  registerUser,
  verifyOtp,
  resendOtp,
  loginUser,
  getUser
};