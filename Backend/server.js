const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors({
    origin: "*", // Allow all origins (for development)
    methods: "GET,POST",
    allowedHeaders: "Content-Type"
}));

 // Enable CORS for frontend requests
app.use(bodyParser.json()); // Parse JSON request bodies

// Handle signup requests
app.post("/api/signup", (req, res) => {
    const { username, password } = req.body;

    console.log("Received Signup Request:");
    console.log("Username:", username);
    console.log("Hashed Password:", password);

    // Send response
    res.json({ message: "Signup data received successfully!" });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
