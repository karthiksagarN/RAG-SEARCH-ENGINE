import React, { useState } from 'react';
import { Send } from 'lucide-react';

const ChatInput = ({ onSendMessage, disabled }) => {
    const [input, setInput] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (input.trim() && !disabled) {
            onSendMessage(input);
            setInput('');
        }
    };

    return (
        <form className="chat-input-form" onSubmit={handleSubmit}>
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                disabled={disabled}
            />
            <button type="submit" disabled={disabled || !input.trim()}>
                <Send size={20} />
            </button>
        </form>
    );
};

export default ChatInput;
