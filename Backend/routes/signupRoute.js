const path = require('path');
const express = require('express');
const router = express.Router();
const User = require('./user');
const bcrypt = require('bcrypt');

// Route to handle signup form submissions
router.post('/', async (req, res) => {
    // Check if passwords match
    if (req.body.password !== req.body.confirmPassword) {
        console.log('Passwords do not match');
        return res.redirect('/signup.html?error=Passwords do not match');       
    }

    try {
        // Check if the email already exists
        const existingEmail = await User.findOne({ email: req.body.email });
        if (existingEmail) {
            console.log('Email already exists');
            return res.redirect('/signup.html?error=Email already exists');
        }

        // Create a new user with the provided information
        const user = new User({
            email: req.body.email,
            password: req.body.password,
        });
        await user.save();
         // Set the session flag and basic user info
        req.session.isLoggedIn = true;
        req.session.email = req.body.email;
        req.session.userId = user._id;

        res.json({ message: "Signup successful", isLoggedIn: true });
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ error: "An error occurred during signup" });
    }
});

module.exports = router;
