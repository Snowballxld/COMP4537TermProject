const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const wavDecoder = require('wav-decoder');
const path = require('path');
const multer = require('multer');
const router = express.Router();
const { User, ResetToken, APICount } = require("../models");
const upload = multer({ dest: 'uploads/' });
const crypto = require('crypto');
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');

// Route to handle audio file upload and transcription
router.post('/api/transcribe', upload.single('audio'), async (req, res) => {

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

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Increment user's API usage in the database
        user.apiUsage += 1;
        await user.save();

        const updatedCount = await APICount.findOneAndUpdate(
            { api: "/transcribe/api/transcribe" },
            { $inc: { count: 1 } },
            { upsert: true, new: true, returnDocument: "after" }
        );

        let warningMessage = null;
        console.log(updatedCount.count)
        if (user.apiUsage > 20) {
            warningMessage = "Warning: You have exceeded 20 API requests.";
        }

        const transcription = await transcribeAudio(req.file.path); // Transcribe the uploaded file
        console.log(transcription)

        res.json({ text: transcription, warning: warningMessage });
    } catch (error) {
        console.error('Error during transcription:', error);
        res.status(500).json({ error: 'Error during transcription' }); // Handle errors
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

module.exports = router;