import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import CreateChatModal from './CreateChatModal';
import UploadModal from './UploadModal';

const MainApp = () => {
    const [user, setUser] = useState(null);
    const [chats, setChats] = useState([]);
    const [activeChatId, setActiveChatId] = useState(null);
    const [messages, setMessages] = useState({}); // Map chat_id to messages array
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchUser();
        fetchChats();
    }, []);

    const fetchUser = async () => {
        try {
            const response = await api.get('/auth/me');
            setUser(response.data);
        } catch (error) {
            localStorage.removeItem('token');
            navigate('/auth');
        }
    };

    const fetchChats = async () => {
        try {
            const response = await api.get('/list_chats');
            setChats(response.data);
        } catch (error) {
            console.error("Error fetching chats:", error);
        }
    };

    const handleCreateChat = async (name) => {
        try {
            const response = await api.post('/create_chat', { name });
            setChats([...chats, response.data]);
            setActiveChatId(response.data.chat_id);
            setIsCreateModalOpen(false);
        } catch (error) {
            console.error("Error creating chat:", error);
        }
    };

    const handleDeleteChat = async (chatId) => {
        if (!window.confirm("Are you sure you want to delete this chat?")) return;
        try {
            await api.delete(`/delete_chat/${chatId}`);
            setChats(chats.filter(c => c.chat_id !== chatId));
            if (activeChatId === chatId) {
                setActiveChatId(null);
            }
        } catch (error) {
            console.error("Error deleting chat:", error);
        }
    };

    const handleUpload = async (files) => {
        if (!activeChatId) return;
        setIsUploading(true);
        const formData = new FormData();
        files.forEach(file => formData.append('files', file));

        try {
            await api.post(`/upload/${activeChatId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            // Refresh chat metadata to update doc count
            fetchChats();
            setIsUploadModalOpen(false);
            alert("Documents uploaded successfully!");
        } catch (error) {
            console.error("Error uploading files:", error);
            alert("Failed to upload files.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSendMessage = async (text) => {
        if (!activeChatId) return;

        const newMessage = { role: 'user', content: text };
        const currentMessages = messages[activeChatId] || [];

        setMessages({
            ...messages,
            [activeChatId]: [...currentMessages, newMessage]
        });

        setIsProcessing(true);
        try {
            const response = await api.post(`/query/${activeChatId}`, { query: text });
            const botMessage = {
                role: 'assistant',
                content: response.data.answer,
                sources: response.data.context_documents
            };

            setMessages(prev => ({
                ...prev,
                [activeChatId]: [...(prev[activeChatId] || []), botMessage]
            }));
        } catch (error) {
            console.error("Error sending message:", error);
            const errorMessage = {
                role: 'assistant',
                content: "Sorry, I encountered an error processing your request."
            };
            setMessages(prev => ({
                ...prev,
                [activeChatId]: [...(prev[activeChatId] || []), errorMessage]
            }));
        } finally {
            setIsProcessing(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/auth');
    };

    const activeChat = chats.find(c => c.chat_id === activeChatId);

    return (
        <div className="app-container">
            <Sidebar
                chats={chats}
                activeChatId={activeChatId}
                onSelectChat={setActiveChatId}
                onCreateChat={() => setIsCreateModalOpen(true)}
                onDeleteChat={handleDeleteChat}
                onLogout={handleLogout}
                user={user}
            />
            <ChatArea
                activeChat={activeChat}
                messages={messages[activeChatId] || []}
                onSendMessage={handleSendMessage}
                onUploadClick={() => setIsUploadModalOpen(true)}
                isProcessing={isProcessing}
            />
            <CreateChatModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreateChat}
            />
            <UploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onUpload={handleUpload}
                isUploading={isUploading}
            />
        </div>
    );
};

export default MainApp;
