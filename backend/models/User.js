const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username : {
        type : String,
        required : true
    },
    email : {
        type : String,
        required : true,
        unique : true
    },
    password : {
        type : String,
        required : true
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
    // Stores a HASH of the OTP, never the code itself
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
