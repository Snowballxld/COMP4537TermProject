const MESSAGES = require('./lang/en/en.js');
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');
const { User, ResetToken, APICount } = require("./models");


const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');

const app = express();
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const fs = require('fs');

const ffmpeg = require('fluent-ffmpeg');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const wavDecoder = require('wav-decoder');


const swaggerDocument = JSON.parse(fs.readFileSync(path.join(__dirname, 'swagger.json'), 'utf8'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// I moved this up
app.use(cors({
    origin: "https://euphonious-creponne-2b667e.netlify.app",
    credentials: true, // Ensure cookies are sent
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    allowedHeaders: ["Content-Type", "Authorization", "Accept"]
}));


// I just added this
app.options("https://euphonious-creponne-2b667e.netlify.app", cors()); // Allows preflight requests for all routes

const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');

app.use(cookieParser());

// Routing for API Call
// const transcribeRoutes = require('./routes/transcribe');
// app.use('/transcribe', transcribeRoutes);
// const loginRoutes = require("./routes/loginRoute");
// app.use('/api/login', loginRoutes);
const forgotRoutes = require("./routes/forgotRoute");
app.use('/api/reset', forgotRoutes);

app.use('/api/doc', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    swaggerOptions: {
        authAction: {
            authorize: false // This removes the "Authorize" button

        }
    }
}));

// Serve static files from the Frontend folder
app.use(express.static(path.join(__dirname, '../Frontend')));

// Route to serve transcribe.html
app.get('/transcribe', (req, res) => {
    res.sendFile(path.join(__dirname, '../Frontend/views/transcribe.html'));
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



//---------- Middlewares ---------------//

//admin middleware
const isAdminMiddleware = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ success: false, message: MESSAGES.warning_401 });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.isAdmin) {
            return res.status(403).json({ success: false, message: MESSAGES.warning_403 });
        }
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: MESSAGES.warning_401 });
    }
};

// Handle signup requests
app.post("/api/signup", async (req, res) => {

    try {
        const { email, password } = req.body;
        const emailSite = email.split("@")[1];
        const isAdmin = (emailSite === "admin.com")
        console.log(emailSite);

        console.log("Received Signup Request:");
        console.log("email:", email);
        console.log("Hashed Password:", password);


        // Check if the user already exists in MongoDB
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: MESSAGES.warning_400 + " " + MESSAGES.warning_user_already_exists });
        }

        // Create a new user in the database
        const newUser = new User({
            email,
            password,
            isAdmin // Ensure password is hashed before storing in production
        });

        await newUser.save();

        const count = await APICount.findOne({ api: "/api/signup" });
        if (!count) {
            const newEntry = new APICount({
                api: "/api/signup",
                count: 1,
                method: "POST"
            });
            await newEntry.save();

        } else {
            count.count = count.count + 1;
            await count.save();
        }

        // console.log("User signed up successfully:", newUser); // we don't console log
        const token = jwt.sign(
            { email: newUser.email, isAdmin: newUser.isAdmin },
            JWT_SECRET,
            { expiresIn: "1h" }
        );
        // Set JWT as an HTTP-only cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            maxAge: 60 * 60 * 1000,
            sameSite: "None",
        });


        res.status(201).json({ message: MESSAGES.warning_login_success });

    } catch (error) {
        // console.error("Error during signup:", error); // we don't console log
        res.status(500).json({ message: MESSAGES.warning_500 });
    }
});

app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: MESSAGES.warning_401 + " " + MESSAGES.warning_user_not_found });
        }

        // Compare hashed password from the client with the hashed password in the database
        const hashedPasswordFromDB = user.password;
        const hashedPasswordFromClient = password;

        if (hashedPasswordFromClient !== hashedPasswordFromDB) {
            return res.status(401).json({ message: MESSAGES.warning_401 + " " + MESSAGES.warning_invalid_credentials });
        }
        // console.log("Logged In"); //no more console.log

        // Generate JWT token
        const token = jwt.sign(
            { email: user.email, isAdmin: user.isAdmin },
            JWT_SECRET,
            { expiresIn: "1h" }
        );
        // set jwt as an http cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            maxAge: 60 * 60 * 1000,
            sameSite: "None"
        });

        const count = await APICount.findOne({ api: "/api/login" });
        if (!count) {
            const newEntry = new APICount({
                api: "/api/login",
                count: 1,
                method: "POST"
            });
            await newEntry.save();

        } else {
            count.count = count.count + 1;
            await count.save();
        }
        if (user.isAdmin === "true") {
            res.status(200).json({ message: MESSAGES.warning_login_success, admin: "True" });

        } else {
            res.status(200).json({ message: MESSAGES.warning_login_success, admin: "False" });
        }
    } catch (error) {
        // console.error("Login error:", error); // we don't console log
        res.status(500).json({ message: MESSAGES.warning_generic });
    }
});

app.get("/api/user", async (req, res) => {
    const token = req.cookies.token;
    console.log("test1")
    if (!token) {
        console.log("test3")
        return res.json({ success: false, message: MESSAGES.warning_no_user_logged_in });
    }
    console.log("test2")
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({
            success: true,
            user: {
                email: decoded.email,
                isAdmin: decoded.isAdmin
            }
        });

        const count = await APICount.findOne({ api: "/api/user" });
        if (!count) {
            const newEntry = new APICount({
                api: "/api/user",
                count: 1,
                method: "GET"
            });
            await newEntry.save();

        } else {
            count.count = count.count + 1;
            await count.save();
        }

    } catch (err) {
        res.json({ success: false, message: MESSAGES.warning_invalid_token });
    }
});

// Get list of all users (Admin only)
app.get("/api/admin/users", isAdminMiddleware, async (req, res) => {
    try {
        const users = await User.find({}, "email apiUsage"); // Fetch only necessary fields
        const count = await APICount.findOne({ api: "/api/admin/users" });
        if (!count) {
            const newEntry = new APICount({
                api: "/api/admin/users",
                count: 1,
                method: "GET"
            });
            await newEntry.save();

        } else {
            count.count = count.count + 1;
            await count.save();
        }

        const apis = await APICount.find({}, "api method count"); // Fetch only necessary fields
        res.json({ success: true, users, apis });
    } catch (error) {
        res.status(500).json({ success: false, message: MESSAGES.warning_error_fetching_users });
    }
});

// Delete user (Admin only)
app.delete("/api/admin/delete/:id", isAdminMiddleware, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        const count = await APICount.findOne({ api: "/api/admin/delete/:id" });
        if (!count) {
            const newEntry = new APICount({
                api: "/api/admin/delete/:id",
                count: 1,
                method: "DELETE"
            });
            await newEntry.save();

        } else {
            count.count = count.count + 1;
            await count.save();
        }
        res.json({ success: true, message: MESSAGES.warning_user_deleted });
    } catch (error) {
        res.status(500).json({ success: false, message: warning_500 + " " + MESSAGES.warning_user_not_deleted });
    }
});








// Route to handle audio file upload and transcription
app.post('/transcribe/api/transcribe', upload.single('audio'), async (req, res) => {

    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' }); // Return error if no file was uploaded
    }

    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ error: "Unauthorized: No token provided" });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findOne({ email: decoded.email });
        console.log("user: ", user)
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Increment user's API usage in the database
        user.apiUsage = (user.apiUsage || 0) + 1;
        await user.save();

        // const updatedCount = await APICount.findOneAndUpdate(
        //     { api: "/transcribe/api/transcribe" },
        //     { $inc: { count: 1 } },
        //     { upsert: true, new: true, returnDocument: "after" }
        // );

        let warningMessage = null;
        console.log(updatedCount.count)
        if (1 > 20) {
            warningMessage = "Warning: You have exceeded 20 API requests.";
        }

        const transcription = await transcribeAudio(req.file.path); // Transcribe the uploaded file
        console.log(transcription)

        res.json({ text: transcription, warning: warningMessage });
    } catch (error) {
        console.error('Error during transcription:', error);
        res.status(500).json({ error: error.message }); // Handle errors
    }

});

// Load model once and reuse it
let transcriber = null;

async function loadModel() {
    if (!transcriber) {
        const transformers = await import('@xenova/transformers');
        const pipeline = transformers.pipeline;

        console.log('Loading Whisper-base from Hugging Face...');

        transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-base', {
            quantized: true,
            device: 'cpu',
        });

        console.log('Whisper-base loaded successfully');
    }
    return transcriber;
}

async function transcribeAudio(audioPath) {
    const transcriber = await loadModel();
    let wavPath = path.join(path.dirname(audioPath), 'converted.wav'); // Define wavPath before try block

    try {
        console.log("Processing audio:", audioPath);

        // Convert to WAV format with 16kHz, mono
        await convertToWav(audioPath, wavPath);

        // Read the converted WAV file
        const audioBuffer = fs.readFileSync(wavPath);

        // Decode WAV to PCM float array
        const decodedAudio = await wavDecoder.decode(audioBuffer);
        const float32Array = new Float32Array(decodedAudio.channelData[0]); // Extract first channel

        const result = await transcriber(float32Array, {
            language: "en",
            return_timestamps: false
        });

        console.log("Transcription result:", result.text);
        return result.text;
    } catch (error) {
        console.error("Transcription failed:", error);
        throw error;
    } finally {
        try {
            if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath); // Delete original file
            if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath); // Delete converted WAV file
        } catch (cleanupError) {
            console.error("Failed to delete files:", cleanupError);
        }
    }
}

// Function to convert any audio file to WAV
async function convertToWav(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .output(outputPath)
            .audioChannels(1) // Mono audio
            .audioFrequency(16000) // 16kHz sample rate
            .format('wav') // Ensure WAV format
            .on('end', resolve)
            .on('error', reject)
            .run();
    });
}





// Start Express Server AFTER DB Connection
initMongoDB().then(() => {
    // Start the server
    app.listen(port, () => {
        console.log(`🚀 Server running on http://localhost:${port}`);
    });
});