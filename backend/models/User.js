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
    otp : {
        type : String,
        default : null
    },
    otpExpires : {
        type : Date,
        default : null
    }
});

module.exports = mongoose.model('User', userSchema);