import React, { useState, useRef } from 'react';
import { X, Upload, File } from 'lucide-react';

const UploadModal = ({ isOpen, onClose, onUpload, isUploading }) => {
    const [files, setFiles] = useState([]);
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (files.length > 0) {
            onUpload(files);
            setFiles([]);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                    <h3>Upload Documents</h3>
                    <button onClick={onClose} disabled={isUploading}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div
                            className="dropzone"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload size={32} />
                            <p>Click to select files (PDF, TXT)</p>
                            <input
                                type="file"
                                multiple
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                                accept=".pdf,.txt"
                            />
                        </div>
                        {files.length > 0 && (
                            <div className="file-list">
                                {files.map((file, index) => (
                                    <div key={index} className="file-item">
                                        <File size={14} />
                                        <span>{file.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="cancel-button" disabled={isUploading}>Cancel</button>
                        <button type="submit" className="upload-button" disabled={files.length === 0 || isUploading}>
                            {isUploading ? 'Uploading...' : 'Upload'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UploadModal;
