import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE;
// const API_BASE = "http://localhost:8000";

// uploads a CSV or Excel file to the backend and returns the saved file path
const uploadFile = async (file, signal) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(API_BASE + "/api/upload/", formData, { signal });
    return response.data;
};

// sends a message to the agent and returns reponse from agent 
const sendMessage = async (message, filePath, history, signal) => {
    const response = await axios.post(API_BASE + "/api/chat/", {
        message,
        file_path: filePath,
        history
    }, { signal });

    return response.data;
};

export { uploadFile, sendMessage };