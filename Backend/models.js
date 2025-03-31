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

const apiSchema = new mongoose.Schema({
    api: { type: String, required: true, unique: true }, // Stores API path
    count: { type: Number, default: 0 }, // Stores API call count
    method: {type: String, required:true}
});

// Create the model
const APICount = mongoose.model("APICount", apiSchema);

module.exports = { User, ResetToken, APICount };
