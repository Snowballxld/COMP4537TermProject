const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');   
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5500;
const mongoUri = process.env.MONGO_URI;

app.use(cors({
    origin: "https://bejewelled-kulfi-2a0acf.netlify.app/views/", 
    credentials: true
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/login.html', (req, res) => {
    res.redirect('/login');
});
app.get('/signup.html', (req, res) => {
    res.redirect('/signup');
});

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

const signupRoute = require('./routes/signupRoute');
const loginRoute = require('./routes/loginRoute');

app.use('/signup', signupRoute);
app.use('/login', loginRoute);


app.get("/", (req, res) => {
    res.json({ message: "Backend API is running!" });
});

// Start Express Server AFTER DB Connection
initMongoDB().then(() => {
    // Start the server
    app.listen(port, () => {
        console.log(`🚀 Server running on http://localhost:${port}`);
    });

});
