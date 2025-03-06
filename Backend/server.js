const express = require('express');
const session = require('express-session');
const { MongoClient } = require('mongodb');
const app = express();

const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGO_URI;

let db;

// Connect to MongoDB
async function initMongoDB() {
    const client = new MongoClient(mongoUri);
    try {
        await client.connect();
        db = client.db('COMP4537TermProject');
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

// Start Express Server AFTER DB Connection
initMongoDB().then(() => {

    // Route to handle the home page
    app.get("/", (req, res) => {
        if (!req.session.isLoggedIn) {
            res.send("Welcome to the app! You are not logged in.");
        } else {
            res.send("Welcome back! You are logged in.");
        }
    });

    // Route to handle the profile page
    app.get("/profile", (req, res) => {
        if (!req.session.isLoggedIn) {
            return res.status(401).send("Session expired or not started. Please log in.");
        }
        res.send("This is your profile page. You are logged in.");
    });

    // Start the server
    app.listen(port, () => {
        console.log(`🚀 Server running on http://localhost:${port}`);
    });

});
