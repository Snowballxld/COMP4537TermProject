// Recording variables
const site = "https://web-translator-j7nv7.ondigitalocean.app";
// const site = "";
let mediaRecorder;
let audioStream;
let audioChunks = [];
let isRecording = false;
const recordButton = document.getElementById('recordButton');
const recordingStatus = document.getElementById('recordingStatus');
const uploadButton = document.getElementById('uploadButton');
const audioFileInput = document.getElementById('audioFile');
const transcriptionOutput = document.getElementById('transcription');


// Initialize event listeners
recordButton.addEventListener('click', (event) => {
    event.preventDefault();
    toggleRecording().catch(error => console.error('Toggle recording error:', error));
});

uploadButton.addEventListener('click', (event) => {
    event.preventDefault();
    uploadAudio().catch(error => console.error('Upload error:', error));
});

// Toggle recording function
async function toggleRecording() {
    console.log(`Toggling recording. Current state: ${isRecording}`);
    if (isRecording) {
        await stopRecording();
    } else {
        await startRecording();
    }
}

// Start recording
async function startRecording() {
    console.log("Starting recording...");
    try {
        audioChunks = [];
        recordingStatus.textContent = MESSAGES.recordingInitializing;

        audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
                sampleRate: 44100,
                channelCount: 1
            }
        });
        console.log("Microphone access granted");

        mediaRecorder = new MediaRecorder(audioStream, {
            mimeType: 'audio/webm',
            audioBitsPerSecond: 64000
        });
        console.log("MediaRecorder created with settings:", {
            mimeType: 'audio/webm',
            audioBitsPerSecond: 64000
        });

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            console.log("MediaRecorder stopped");
            recordingStatus.textContent = MESSAGES.recordingStopped;

            try {
                console.log("Total chunks size:", audioChunks.reduce((sum, chunk) => sum + chunk.size, 0));

                await new Promise(resolve => setTimeout(resolve, 200)); // Extra buffer time

                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                console.log("Blob created:", audioBlob);

                const file = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
                console.log("File created:", file);

                await prepareAndSendAudio(file);
            } catch (error) {
                console.error('Final processing error:', error);
                recordingStatus.textContent = MESSAGES.recordingError;
            } finally {
                cleanupRecording();
            }
        };

        mediaRecorder.start(100); // Request data every 100ms
        console.log("MediaRecorder started");
        isRecording = true;
        recordButton.textContent = 'Stop Recording';
        recordButton.classList.add('recording');
        recordingStatus.textContent = MESSAGES.recordingStarted;

    } catch (error) {
        console.error('Recording start failed:', error);
        recordingStatus.textContent = MESSAGES.microphoneAccessDenied;
        cleanupRecording();
    }
}

// Stop recording
async function stopRecording() {
    console.log("Stopping recording...");
    if (!isRecording || !mediaRecorder) {
        console.log(MESSAGES.recordingNotStarted);
        return;
    }

    try {
        console.log("Requesting final data...");
        mediaRecorder.requestData();

        console.log("Waiting for final chunks...");
        await new Promise(resolve => setTimeout(resolve, 100));

        console.log("Stopping mediaRecorder...");
        if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }

        console.log("Stopping audio tracks...");
        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
        }

        isRecording = false;
        recordButton.textContent = 'Start Recording';
        recordButton.classList.remove('recording');
        recordingStatus.textContent = MESSAGES.recordingFinalizing;
        console.log("Recording stopped successfully");

    } catch (error) {
        console.error('Error stopping recording:', error);
        recordingStatus.textContent = MESSAGES.stopRecordingError;
        cleanupRecording();
    }
}

// Upload an audio file
async function uploadAudio() {
    const file = audioFileInput.files[0];
    if (!file) {
        console.log(MESSAGES.fileNotSelected);
        alert(MESSAGES.fileNotSelected);
        return;
    }

    console.log(MESSAGES.fileSelected, file.name, "Size:", file.size, "Type:", file.type);
    uploadButton.disabled = true;
    uploadButton.textContent = MESSAGES.uploadProcessing;
    transcriptionOutput.textContent = MESSAGES.transcribingAudio;

    try {
        await prepareAndSendAudio(file);
    } catch (error) {
        console.error(MESSAGES.uploadError, error);
        transcriptionOutput.textContent = MESSAGES.uploadFailed;
    } finally {
        uploadButton.disabled = false;
        uploadButton.textContent = 'Transcribe File';
    }
}

// Process and send audio to server
async function prepareAndSendAudio(file) {
    console.log("Preparing to send audio file...");
    console.log("File details:", {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
    });

    const formData = new FormData();
    formData.append('audio', file, file.name || 'recording.webm');
    console.log("FormData prepared");

    console.log("Starting fetch request to:", `${site}/transcribe/api/transcribe`);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.log(MESSAGES.timeoutError);
            controller.abort();
        }, 30000); // 30s timeout

        const response = await fetch(`${site}/transcribe/api/transcribe`, {
            method: 'POST',
            body: formData,
            signal: controller.signal,
            credentials: 'include'
        });

        clearTimeout(timeoutId);
        console.log("Fetch response received. Status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(MESSAGES.warningServerError, errorText);
            throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log("Transcription result:", result);

        if (result.warning) {
            alert(MESSAGES.warningNotFound + result.warning);
        }

        transcriptionOutput.textContent = result.text || MESSAGES.transcriptionResultNotFound;
        recordingStatus.textContent = MESSAGES.transcriptionComplete;

    } catch (error) {
        console.error(MESSAGES.uploadFailed, error);
        transcriptionOutput.textContent = error.name === 'AbortError'
            ? MESSAGES.timeoutError
            : MESSAGES.uploadFailed;
        recordingStatus.textContent = MESSAGES.genericError;
        throw error;
    }
}

// Cleanup function
function cleanupRecording() {
    console.log("Cleaning up recording...");
    if (audioStream) {
        console.log("Stopping audio stream tracks");
        audioStream.getTracks().forEach(track => {
            track.stop();
            console.log(`Track ${track.kind} stopped`);
        });
        audioStream = null;
    }
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        console.log("Stopping media recorder");
        mediaRecorder.stop();
    }
    audioChunks = [];
    isRecording = false;
    console.log("Cleanup complete");
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Check if the user is an admin
        const userResponse = await fetch(`${site}/api/user`, { credentials: "include" });
        const userData = await userResponse.json();
        console.log("Full userData:", userData);
        console.log(userData.user.isAdmin)
        console.log(userData.success)
    } catch (error) {
        console.error("Error:", error);
    }
});


