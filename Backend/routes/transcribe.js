const express = require('express');
const { pipeline } = require('@huggingface/transformers');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const wavDecoder = require('wav-decoder');
const os = require('os');
const path = require('path');
const multer = require('multer');
const router = express.Router();
const { User, ResetToken, APICount } = require("../models");
const cors = require('cors');



router.use(cors({
    origin: "https://4537projectfrontend.netlify.app",
    credentials: true, // Ensure cookies are sent
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// Constants
const CHUNK_DURATION = 30; // Split audio into 30-second chunks
const MODEL_PATH = path.join(process.cwd(), '/models/whisper-small'); // Ensure correct model path

// Set up multer for file upload
const upload = multer({ dest: 'uploads/' });

// Route to handle audio file upload and transcription
router.post('/api/transcribe', upload.single('audio'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' }); // Return error if no file was uploaded
    }


    const count = await APICount.findOne({ api: "/transcribe/api/transcribe" });
    if (!count) {
        const newEntry = new APICount({
            api: "/transcribe/api/transcribe",
            count: 1,
            method: "POST"
        });
        await newEntry.save();

    } else {
        count.count = count.count + 1;
        await count.save();
    }

    async () => {
        try {
            const response = await fetch(`${site}/api/user`, {
                method: "GET",
                credentials: "include"
            });

            if (!response.ok) {
                console.warn("Not authenticated, redirecting to login...");
                window.location.href = "/views/login.html";
            }

            const user = await User.findOne({ email: `${response.user.email}` });
            if (user.apiUsage) {
                user.apiUsage = user.apiUsage + 1;
            } else {
                user.apiUsage = 1;
            }
            await user.save();

        } catch (error) {
            console.error("Error checking authentication:", error);
            window.location.href = "/views/login.html";
        }
    };

    try {
        const transcription = await transcribeAudio(req.file.path); // Transcribe the uploaded file
        console.log(transcription)
        res.json({ text: transcription }); // Send transcription result back`
    } catch (error) {
        console.error('Error during transcription:', error);
        res.status(500).json({ error: 'Error during transcription' }); // Handle errors
    }
});

// Load model once and reuse it
let transcriber;
async function loadModel() {
    if (!transcriber) {
        transcriber = await pipeline('automatic-speech-recognition', MODEL_PATH);
    }
    return transcriber;
}

// Main transcription function
async function transcribeAudio(audioPath) {
    const transcriber = await loadModel();
    const tempDir = path.join(os.tmpdir(), `temp-audio-${Date.now()}`);
    fs.mkdirSync(tempDir);

    try {
        await splitAudio(audioPath, tempDir);
        const chunkFiles = fs.readdirSync(tempDir).map(file => path.join(tempDir, file));

        const allTranscriptions = [];
        for (const chunkFile of chunkFiles) {
            allTranscriptions.push(await transcribeChunk(transcriber, chunkFile));
            fs.unlinkSync(chunkFile); // Delete chunk after transcription
        }

        fs.unlinkSync(audioPath); // Delete the uploaded file after processing
        fs.rmdirSync(tempDir); // Remove the temp directory

        return allTranscriptions.join(' '); // Combine all transcriptions
    } catch (error) {
        console.error('Error during transcription:', error);
        return 'Error processing audio file.';
    }
}

// Function to split audio into chunks
async function splitAudio(audioPath, tempDir) {
    return new Promise((resolve, reject) => {
        ffmpeg(audioPath)
            .audioChannels(1)
            .audioFrequency(16000)
            .outputOptions(['-f', 'segment', '-segment_time', CHUNK_DURATION.toString(), '-reset_timestamps', '1'])
            .output(path.join(tempDir, 'chunk-%03d.wav'))
            .on('end', resolve)
            .on('error', reject)
            .run();
    });
}

// Function to transcribe each chunk of audio
async function transcribeChunk(transcriber, chunkFile) {
    const chunkData = fs.readFileSync(chunkFile);
    const decodedAudio = await wavDecoder.decode(chunkData);

    const result = await transcriber(decodedAudio.channelData[0], {
        task: 'translate',
        language: 'en',
        return_timestamps: true,
    });

    return result.chunks ? result.chunks.map(chunk => chunk.text).join(' ') : result.text;
}

module.exports = router;