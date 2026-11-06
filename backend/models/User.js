const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
    {
        label: { type: String, enum: ['Home', 'Work', 'Other'], default: 'Home' },
        fullName: { type: String, required: true, trim: true, maxlength: 100 },
        phone: { type: String, default: '' },
        street: { type: String, required: true, trim: true, maxlength: 250 },
        city: { type: String, required: true, trim: true, maxlength: 100 },
        state: { type: String, required: true, trim: true, maxlength: 100 },
        zipCode: { type: String, required: true, trim: true },
        isDefault: { type: Boolean, default: false },
    },
    { timestamps: true }
);

const userSchema = new mongoose.Schema({
    username : {
        type : String,
        default : 'Customer'
    },
    // Email and password are optional: customers can sign in with a verified phone number only.
    // sparse + unique lets many phone-only customers exist without an email.
    email : {
        type : String,
        unique : true,
        sparse : true,
        trim : true
    },
    password : {
        type : String
    },
    phone : {
        type : String,
        unique : true,
        sparse : true
    },
    addresses : {
        type : [addressSchema],
        default : []
    },
    lastLoginAt : {
        type : Date
    },
    role : {
        type : String,
        enum : ['user', 'admin'],
        default : 'user'
    },
    verified : {
        type : Boolean,
        default : false
    },
    // Stores a HASH of the email OTP, never the code itself
    otp : {
        type : String,
        default : null
    },
    otpExpires : {
        type : Date,
        default : null
    },
    // Wrong guesses for the current OTP. Locked at MAX_OTP_ATTEMPTS until a new OTP is sent.
    otpAttempts : {
        type : Number,
        default : 0
    }
});

module.exports = mongoose.model('User', userSchema);
