import React from 'react';
import { MessageSquare, Plus, LogOut, Trash2 } from 'lucide-react';

const Sidebar = ({ chats, activeChatId, onSelectChat, onCreateChat, onDeleteChat, onLogout, user }: { chats: any[], activeChatId: string | null, onSelectChat: (id: any) => void, onCreateChat: () => void, onDeleteChat: (id: any) => void, onLogout: () => void, user: any }) => {
    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <div className="user-info">
                    <div className="avatar">{user?.username?.[0]?.toUpperCase()}</div>
                    <span className="username">{user?.username}</span>
                </div>
                <button onClick={onLogout} className="logout-button" title="Logout">
                    <LogOut size={18} />
                </button>
            </div>

            <button onClick={onCreateChat} className="new-chat-button">
                <Plus size={18} /> New Chat
            </button>

            <div className="chats-list">
                <h3>Your Chats</h3>
                {chats.length === 0 ? (
                    <div className="empty-state">No chats yet</div>
                ) : (
                    chats.map((chat) => (
                        <div
                            key={chat.chat_id}
                            className={`chat-item ${activeChatId === chat.chat_id ? 'active' : ''}`}
                            onClick={() => onSelectChat(chat.chat_id)}
                        >
                            <MessageSquare size={16} className="chat-icon" />
                            <span className="chat-name">{chat.name}</span>
                            <button
                                className="delete-chat-button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteChat(chat.chat_id);
                                }}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Sidebar;
