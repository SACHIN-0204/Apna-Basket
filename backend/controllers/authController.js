const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

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
      existingUser.otp = generateOTP();
      existingUser.otpExpires = Date.now() + 10 * 60 * 1000;
      await existingUser.save();
      try {
        await sendVerificationEmail(existingUser, existingUser.otp);
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
    const otp = generateOTP();
    const otpExpires = Date.now() + 10 * 60 * 1000;

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      verified: false,
      otp,
      otpExpires
    });

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
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.verified) {
      return res.status(200).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
        message: 'Email already verified'
      });
    }

    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (user.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    user.verified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
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

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.verified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendVerificationEmail(user, otp);

    res.status(200).json({ message: 'A new OTP has been sent to your email.' });
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