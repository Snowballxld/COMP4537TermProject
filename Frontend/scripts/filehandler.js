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
    console.log("Record button clicked");
    toggleRecording().catch(error => console.error('Toggle recording error:', error));
});

uploadButton.addEventListener('click', (event) => {
    event.preventDefault();
    console.log("Upload button clicked");
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
        recordingStatus.textContent = 'Initializing microphone...';

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
            recordingStatus.textContent = 'Finalizing recording...';

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
                recordingStatus.textContent = 'Error processing recording';
            } finally {
                cleanupRecording();
            }
        };

        mediaRecorder.start(100); // Request data every 100ms
        console.log("MediaRecorder started");
        isRecording = true;
        recordButton.textContent = 'Stop Recording';
        recordButton.classList.add('recording');
        recordingStatus.textContent = 'Recording...';

    } catch (error) {
        console.error('Recording start failed:', error);
        recordingStatus.textContent = 'Microphone access denied';
        cleanupRecording();
    }
}

// Stop recording
async function stopRecording() {
    console.log("Stopping recording...");
    if (!isRecording || !mediaRecorder) {
        console.log("Not currently recording");
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
        recordingStatus.textContent = 'Finalizing...';
        console.log("Recording stopped successfully");

    } catch (error) {
        console.error('Error stopping recording:', error);
        recordingStatus.textContent = 'Error stopping recording';
        cleanupRecording();
    }
}

// Upload an audio file
async function uploadAudio() {
    const file = audioFileInput.files[0];
    if (!file) {
        console.log("No file selected");
        alert('Please select an audio file first');
        return;
    }

    console.log("Uploading file:", file.name, "Size:", file.size, "Type:", file.type);
    uploadButton.disabled = true;
    uploadButton.textContent = 'Processing...';
    transcriptionOutput.textContent = 'Transcribing audio...';

    try {
        await prepareAndSendAudio(file);
    } catch (error) {
        console.error('Upload error:', error);
        transcriptionOutput.textContent = 'Error: Failed to transcribe audio';
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
            console.log("Request timeout triggered");
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
            console.error("Server error response:", errorText);
            throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log("Transcription result:", result);
        transcriptionOutput.textContent = result.text || 'No transcription returned';
        recordingStatus.textContent = 'Transcription complete';

    } catch (error) {
        console.error('Upload failed:', error);
        transcriptionOutput.textContent = error.name === 'AbortError'
            ? 'Request timed out'
            : 'Upload failed';
        recordingStatus.textContent = 'Error occurred';
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