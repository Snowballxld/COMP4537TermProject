const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const app = express();
const cors = require('cors');
require('dotenv').config();
const path = require('path');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGO_URI;

app.use(cors({
    origin: "*", // Allow all origins (for development)
    methods: "GET,POST",
    allowedHeaders: "Content-Type"
}));

// Check if MONGO_URI is loaded correctly
console.log("Mongo URI:", mongoUri);
if (!mongoUri) {
    console.error("❌ MONGO_URI is not defined in the .env file.");
    process.exit(1); // Exit if Mongo URI is missing
}

async function initMongoDB() {
    try {
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB!');
    } catch (err) {
        console.error("❌ Connection error:", err);
        process.exit(1); // Exit if MongoDB connection fails
    }
}

// Set up Session Middleware to Track Session Expiration
app.use(session({
    secret: process.env.SESSION_SECRET || 'defaultSecretKey',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1 * 60 * 60 * 1000, // Session expires in 1 hour (1 hour * 60 minutes * 60 seconds * 1000 ms)
        httpOnly: true
    }
}));

// Middleware to make user available in all templates (must be after session middleware)
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// MongoDB Schema for User
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

// Handle signup requests
app.post("/api/signup", async (req, res) => {
    const { email, password } = req.body;

    console.log("Received Signup Request:");
    console.log("email:", email);
    console.log("Hashed Password:", password);

    try {
        // Check if the user already exists in MongoDB
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists." });
        }

        // Create a new user in the database
        const newUser = new User({
            email,
            password // Ensure password is hashed before storing in production
        });

        await newUser.save();
        console.log("User signed up successfully:", newUser);
        res.status(201).json({ message: "Signup successful!" });
    } catch (error) {
        console.error("Error during signup:", error);
        res.status(500).json({ message: "An error occurred. Please try again." });
    }
});

// Start Express Server AFTER DB Connection
initMongoDB().then(() => {
    // Start the server
    app.listen(port, () => {
        console.log(`🚀 Server running on http://localhost:${port}`);
    });
});
