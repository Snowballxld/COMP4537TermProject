const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const app = express();
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const bodyParser = require("body-parser");

const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGO_URI;

// Serve static files
app.use(express.static(path.join(__dirname, '../Frontend/views'))); // Serve HTML files
app.use('/scripts', express.static(path.join(__dirname, '../Frontend/scripts'))); // Serve JavaScript files

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//------------------------------------------------
//Setup

// Initialize MongoDB connection
async function initMongoDB() {
    try {
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB!');
    } catch (err) {
        console.error("❌ Connection error:", err);
        process.exit(1);
    }
}

// Set up Session Middleware to Track Session Expiration
const MongoDBStore = require('connect-mongodb-session')(session);

const store = new MongoDBStore({
    uri: process.env.MONGO_URI,
    collection: 'sessions'
});

app.use(session({
    secret: process.env.SESSION_SECRET || 'defaultSecretKey',
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
        maxAge: 1 * 60 * 60 * 1000, // 1 hour
        httpOnly: true
    }
}));


// Middleware to make user available in all templates (must be after session middleware)
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// Middleware
app.use(cors({
    origin: "*", // Allow all origins (for development)
    methods: "GET,POST",
    allowedHeaders: "Content-Type"
}));

// Enable CORS for frontend requests
app.use(bodyParser.json()); // Parse JSON request bodies

//------------------------------------------------
//Routing

// Import routes
const signupRoute = require('./routes/signupRoute');
const loginRoute = require('./routes/loginRoute');
const transcribeRoute = require('./routes/transcribe');

app.use('/signup', signupRoute);
app.use('/login', loginRoute);
app.use('/transcribe', transcribeRoute);

// Route to handle the base page
app.get("/", (req, res) => {
    if (!req.session.isLoggedIn) {
        return res.sendFile(path.join(__dirname, '../Frontend/views', 'index.html'));
    } else {
        return res.sendFile(path.join(__dirname, '../Frontend/views', 'home.html'));
    }
});

// Route to handle the home page
app.get("/home", (req, res) => {
    if (!req.session.isLoggedIn) {
        return res.redirect('/index.html'); // If not logged in, go to index.html
    }
    return res.sendFile(path.join(__dirname, '../Frontend/views', 'home.html')); // Serve home.html if logged in
});

//------------------------------------------------
//request that aren't handled in the route files

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

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Handle signup requests, shouldn't this be in the signupRoute.js file?
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

app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Compare hashed password from the client with the hashed password in the database
        const hashedPasswordFromDB = user.password;
        const hashedPasswordFromClient = password; // The password sent from the client is already hashed

        if (hashedPasswordFromClient !== hashedPasswordFromDB) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        console.log("Logged In");
        // Set session data on successful login
        req.session.user = user;
        res.status(200).json({ message: "Login successful" });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "An error occurred. Please try again." });
    }
});

// Get user info if logged in
app.get("/api/user", (req, res) => {
    if (req.session.user) {
        // User is logged in
        res.json({ success: true, user: req.session.user });
    } else {
        // Not logged in
        res.json({ success: false, message: "No user logged in" });
    }
});

//------------------------------------------------

// Start Express Server AFTER DB Connection
initMongoDB().then(() => {
    // Start the server
    app.listen(port, () => {
        console.log(`🚀 Server running on http://localhost:${port}`);
    });
});