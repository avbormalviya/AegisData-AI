import { useState } from "react"
import { uploadFile } from "../services/api"
import { IoCloudUpload } from "react-icons/io5"

export const FileUpload = ({ onUploadSuccess }) => {
    const [files, setFiles] = useState([])
    const [uploading, setUploading] = useState(false)

    const handleUpload = async () => {
        if (files.length === 0) return alert("Please select a file first")
        setUploading(true)
        try {
            const uploadedPaths = []
            for (const file of files) {
                const data = await uploadFile(file)
                uploadedPaths.push(data.file_path)
            }
            onUploadSuccess(uploadedPaths, files)
            setFiles([])
        } catch (error) {
            console.error("Upload failed:", error)
            alert("Failed to upload one or more files. Please try again.")
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="upload-bar">
            <label htmlFor="file-upload-input" className="file-label">
                <IoCloudUpload size={20} />
                <span className="file-label-text">
                    {files.length > 0 
                        ? (files.length === 1 ? files[0].name : `${files.length} files selected`) 
                        : "Select CSV / Excel"}
                </span>
            </label>
            <input
                id="file-upload-input"
                type="file"
                multiple
                accept=".csv,.xlsx"
                onChange={(e) => setFiles(Array.from(e.target.files))}
                className="file-input"
            />
            <button onClick={handleUpload} disabled={uploading || files.length === 0} className="upload-btn">
                {uploading ? "Uploading..." : "Upload"}
            </button>
        </div>
    )
}