const path = require("path");
const express = require("express");
const router = express.Router();
//path is subject to change
const { User, ResetToken, APICount } = require("../models");
console.log("User Model:", User);
const bcrypt = require("bcrypt");
const nodemailer = require('nodemailer');
const cors = require('cors');
const crypto = require("crypto");


// router.use(cors({
//     origin: "*", // Allow all origins (for development)
//     methods: "GET,POST,PUT, DELETE,OPTIONS",
//     allowedHeaders: "Content-Type, Authorization",
//     credentials: true
// }));

// POST: Handle login
router.post("/", async (req, res) => {
    const { email } = req.body;
    try {


        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "No user found" });
        }

        // found user
        console.log(user)
        // GPT says it's better to create tokens like this instead of bcrypt
        const resetToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

        const resetPasswordToken = tokenHash;
        const resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 15 minutes
        const newToken = new ResetToken({
            email,
            token: resetPasswordToken,
            expiry: resetPasswordExpires // Ensure password is hashed before storing in production
        });

        await newToken.save();

        const count = await APICount.findOne({ api: "/api/reset" });
        if (!count) {
            const newEntry = new APICount({
                api: "/api/reset",
                count: 1,
                method: "POST"
            });
            await newEntry.save();

        } else {
            count.count = count.count + 1;
            await count.save();
        }

        // send email
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.TEST_EMAIL,
                pass: process.env.TEST_PASSWORD
            }
        });

        // generate url
        const resetPasswordBaseUrl = 'https://4537projectfrontend.netlify.app/views/resetPassword.html';
        const resetPasswordLink = `${resetPasswordBaseUrl}?email=${encodeURIComponent(email)}&token=${encodeURIComponent(resetToken)}`;

        // Define email options
        let mailOptions = {
            from: 'your-email@gmail.com',
            to: email,
            subject: 'Password Reset',
            text: 'Password reset link is below and will be active for 30 mins.\n' + resetPasswordLink
        };

        // Send email
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return res.status(401).json({ message: "Failed to send email" });

            } else {
                res.json({ message: "Email sent" });
                return;
            }
        });

    } catch (error) {
        console.error("Reset Password error:", error);
        res.status(500).json({ message: "An error occurred. Please try again." });
    }
});


router.put("/resetPassword", async (req, res) => {
    const { email, token, newPassword } = req.body;

    try {
        // Hash the token received in the request body
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

        // Find user and reset token
        const user = await User.findOne({ email });
        const resetToken = await ResetToken.findOne({ token: tokenHash, email: email });

        // Check if user exists
        if (!user) return res.status(400).json({ error: "Invalid user" });

        // Check if token is valid
        if (!resetToken) return res.status(401).json({ error: "Invalid token" });

        // Check if token has expired
        if (new Date() > resetToken.expiry) {
            return res.status(402).json({ message: "Token expired" });
        }

        user.password = newPassword;

        // Remove the reset token after successful password update
        await resetToken.deleteOne();

        // Save the updated user
        await user.save();

        const count = await APICount.findOne({ api: "/api/reset/resetPassword" });
        if (!count) {
            const newEntry = new APICount({
                api: "/api/reset/resetPassword",
                count: 1,
                method: "PUT"
            });
            await newEntry.save();

        } else {
            count.count = count.count + 1;
            await count.save();
        }

        return res.status(200).json({ message: "Password reset successful!" });
    } catch (error) {
        console.error("Error during password reset:", error);
        res.status(500).json({ message: "An error occurred. Please try again." });
    }
});


module.exports = router;
