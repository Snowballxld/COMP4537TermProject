const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const wavDecoder = require('wav-decoder');
const os = require('os');
const path = require('path');
const multer = require('multer');
const router = express.Router();
const { User, APICount } = require("../models");

// Set up multer for file upload
const upload = multer({ dest: 'uploads/' });

const { exec } = require('child_process');
router.get('/test-ffmpeg', (req, res) => {
    exec('ffmpeg -version', (err, stdout, stderr) => {
        if (err) {
            console.error('FFmpeg test failed:', err);
            return res.status(500).send('FFmpeg not installed');
        }
        // Corrected the response syntax
        res.send(`<pre>FFmpeg installed:\n${stdout}</pre>`);
    });
});

// Route to handle audio file upload and transcription
router.post('/api/transcribe', upload.single('audio'), async (req, res) => {


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


    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' }); // Return error if no file was uploaded
    }

    try {
        const transcription = await transcribeAudio(req.file.path); // Transcribe the uploaded file
        console.log(transcription)
        res.json({ text: transcription }); // Send transcription result back
    } catch (error) {
        console.error('Error during transcription:', error);
        res.status(500).json({ error: 'Error during transcription' }); // Handle errors
    }
});

// Load model once and reuse it
let transcriber;
let pipeline;

async function loadModel() {
    if (!pipeline) {
        const transformers = await import('@xenova/transformers');
        pipeline = transformers.pipeline;

        // Set the environment variable to use local cache
        process.env.HF_HOME = path.join(process.cwd(), 'models');

        transcriber = await pipeline('automatic-speech-recognition', 'whisper-small', {
            cache_dir: process.env.HF_HOME // Ensure model is loaded from local storage
        });

    }
    return transcriber;
}

// Main transcription function
async function transcribeAudio(audioPath) {
    const transcriber = await loadModel();
    const tempDir = path.join(os.tmpdir(), `temp-audio-${Date.now()}`);
    fs.mkdirSync(tempDir);

    try {
        // Split into smaller chunks (10 seconds each)
        await splitAudio(audioPath, tempDir, 10);
        const chunkFiles = fs.readdirSync(tempDir)
            .map(file => path.join(tempDir, file))
            .sort();

        const allTranscriptions = [];

        for (const chunkFile of chunkFiles) {
            try {
                const chunkData = fs.readFileSync(chunkFile);
                const decodedAudio = await wavDecoder.decode(chunkData);

                const result = await transcriber(decodedAudio.channelData[0], {
                    language: "en", // Force output in English
                    return_timestamps: false
                });


                allTranscriptions.push(result.text);
            } finally {
                fs.unlinkSync(chunkFile);
                if (global.gc) global.gc();  // Manually trigger garbage collection
            }
        }

        return allTranscriptions.join(' ');
    } catch (error) {
        console.error('Transcription failed:', error);
        throw error;
    } finally {
        // Cleanup
        try {
            fs.unlinkSync(audioPath);
            fs.rmdirSync(tempDir);
        } catch (cleanupError) {
            console.error('Cleanup failed:', cleanupError);
        }
    }
}

async function splitAudio(audioPath, outputDir, chunkSeconds = 10) {
    return new Promise((resolve, reject) => {
        ffmpeg(audioPath)
            .audioChannels(1)
            .audioFrequency(16000)
            .outputOptions([
                '-f', 'segment',
                '-segment_time', chunkSeconds.toString(),
                '-c:a', 'pcm_s16le',  // 16-bit WAV format
                '-ar', '16000',
                '-ac', '1'
            ])
            .output(path.join(outputDir, 'chunk-%03d.wav'))
            .on('end', resolve)
            .on('error', reject)
            .run();
    });
}

module.exports = router;