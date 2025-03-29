const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isAdmin: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

const resetTokenSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    token: { type: String, required: true },
    expiry: { type: Date, default: Date.now, expires: '1d' }
});
const ResetToken = mongoose.model('resetToken', resetTokenSchema);

module.exports = { User, ResetToken };
