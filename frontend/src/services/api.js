import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE;

// uploads a CSV or Excel file to the backend and returns the saved file path
const uploadFile = async (file, signal) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(API_BASE + "/api/upload/", formData, { signal });
    return response.data;
};

// sends a message to the agent and returns summary + chart_spec
const sendMessage = async (message, filePath, mode, signal) => {
    const response = await axios.post(API_BASE + "/api/chat/", {
        message,
        file_path: filePath,
        mode: mode
    }, { signal });
    return response.data;
};

export { uploadFile, sendMessage };