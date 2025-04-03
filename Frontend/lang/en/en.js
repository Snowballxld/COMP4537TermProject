// ../lang/en/en.js
export const MESSAGES = {
    warning_400: "400 Bad Request, Invalid request",
    warning_401: "401 Unauthorized, please log in",
    warning_403: "403 Forbidden, you do not have permission to access this resource",
    warning_404: "404 Not Found , the requested resource could not be found",
    warning_500: "500 Internal Server Error, something went wrong on the server",
    warning_login: "Login failed. Please check your credentials and try again.",
    warning_login_success: "Login successful! Welcome ",
    warning_login_success_admin: "Login successful! Welcome Admin",
    warning_login_success_user: "Login successful! Welcome User",
    warning_login_success_redirect: "Redirecting to home page...",
    warning_user_not_found: "User not found.",
    warning_user_already_exists: "User already exists.",
    warning_generic: "An error occurred. Please try again later.",
    warning_invalid_credentials: "Invalid credentials. Please try again.",
    warning_invalid_email: "Please enter a valid email address.",
    warning_invalid_token: "Invalid token. Please log in again.",
    warning_error_fetching_users: "Error fetching users.",
    warning_no_user_logged_in: "No user logged in",
    warning_user_deleted: "User deleted successfully",
    warning_user_not_deleted: "Error deleting User",

    // Recording related messages
    recordingInitializing: "Initializing microphone...",
    recordingStarted: "Recording...",
    recordingStopped: "Finalizing recording...",
    recordingFinalizing: "Finalizing...",
    recordingError: "Error processing recording",
    microphoneAccessDenied: "Microphone access denied",
    recordingNotStarted: "Not currently recording",

    // Error related messages
    stopRecordingError: "400 Error stopping recording",
    uploadError: "400 Upload error:",
    uploadFailed: "400 Upload failed",
    timeoutError: "400 Request timed out",
    genericError: "400 Error occurred",

    // Transcription related messages
    transcribingAudio: "Transcribing audio...",
    transcriptionComplete: "Transcription complete",
    transcriptionResultNotFound: "No transcription returned",
    warningServerError: "Server error: ",
    warningNotFound: "Warning: ",

    // Upload/processing related messages
    uploadProcessing: "Processing...",
    fileSelected: "File selected for upload: ",
    fileNotSelected: "Please select an audio file first",
};
