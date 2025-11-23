
import React, { useRef, useEffect } from 'react';
import { FileText, Bot, User } from 'lucide-react';
import ChatInput from './ChatInput';

interface Chat {
    name: string;
    doc_count?: number;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    sources?: string[];
}

interface ChatAreaProps {
    activeChat: Chat | null;
    messages: Message[];
    onSendMessage: (text: string) => void;
    onUploadClick: () => void;
    isProcessing: boolean;
}

const ChatArea: React.FC<ChatAreaProps> = ({ activeChat, messages, onSendMessage, onUploadClick, isProcessing }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    if (!activeChat) {
        return (
            <div className="chat-area empty">
                <div className="empty-content">
                    <Bot size={64} />
                    <h2>Select a chat or create a new one</h2>
                    <p>Start chatting with your documents powered by RAG</p>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-area">
            <div className="chat-header">
                <div className="chat-title">
                    <h2>{activeChat.name}</h2>
                    <span className="doc-count">
                        <FileText size={14} /> {activeChat.doc_count || 0} docs
                    </span>
                </div>
                <button onClick={onUploadClick} className="upload-button">
                    Upload Documents
                </button>
            </div>

            <div className="messages-container">
                {messages.length === 0 ? (
                    <div className="empty-chat-state">
                        <p>No messages yet. Upload documents and start asking questions!</p>
                    </div>
                ) : (
                    messages.map((msg, index) => (
                        <div key={index} className={`message ${msg.role} `}>
                            <div className="message-avatar">
                                {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                            </div>
                            <div className="message-content">
                                <div className="message-text">{msg.content}</div>
                                {msg.sources && msg.sources.length > 0 && (
                                    <div className="message-sources">
                                        <h4>Sources:</h4>
                                        <ul>
                                            {msg.sources.map((source, idx) => (
                                                <li key={idx}>{source.substring(0, 100)}...</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
                {isProcessing && (
                    <div className="message assistant processing">
                        <div className="message-avatar"><Bot size={20} /></div>
                        <div className="typing-indicator">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <ChatInput onSendMessage={onSendMessage} disabled={isProcessing} />
        </div>
    );
};

export default ChatArea;
