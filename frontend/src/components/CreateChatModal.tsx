import React, { useState } from 'react';
import { X } from 'lucide-react';

const CreateChatModal = ({ isOpen, onClose, onCreate }: { isOpen: boolean, onClose: () => void, onCreate: (name: string) => void }) => {
    const [chatName, setChatName] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (chatName.trim()) {
            onCreate(chatName);
            setChatName('');
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                    <h3>Create New Chat</h3>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <label>Chat Name</label>
                        <input
                            type="text"
                            value={chatName}
                            onChange={(e) => setChatName(e.target.value)}
                            placeholder="e.g., Project Alpha Research"
                            autoFocus
                            required
                        />
                    </div>
                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="cancel-button">Cancel</button>
                        <button type="submit" className="create-button">Create Chat</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateChatModal;
