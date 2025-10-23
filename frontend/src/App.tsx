import React, { useEffect, useRef, useState } from 'react';
import {
  apiCreateChat,
  apiListChats,
  apiDeleteChat,
  apiUploadFiles,
  apiQuery,
  Chat,
  QueryResponse,
} from './lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const STORAGE_KEY = 'rag_chat_messages';

const App: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ------------------------------------------------------------------ //
  // Load chats + persisted messages
  // ------------------------------------------------------------------ //
  useEffect(() => {
    const load = async () => {
      const { data } = await apiListChats();
      setChats(data);
      if (data.length && !selectedChat) setSelectedChat(data[0].chat_id);
    };
    load();

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setMessages(JSON.parse(stored));
  }, []);

  // ------------------------------------------------------------------ //
  // Auto-scroll
  // ------------------------------------------------------------------ //
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedChat]);

  // ------------------------------------------------------------------ //
  // Helpers
  // ------------------------------------------------------------------ //
  const persistMessages = (newMsg: Record<string, Message[]>) => {
    setMessages(newMsg);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newMsg));
  };

  const currentChatMessages = selectedChat ? messages[selectedChat] ?? [] : [];

  // ------------------------------------------------------------------ //
  // CRUD Chats
  // ------------------------------------------------------------------ //
  const createChat = async () => {
    if (!newChatName.trim()) return;
    const { data } = await apiCreateChat(newChatName);
    setChats((c) => [...c, data]);
    setSelectedChat(data.chat_id);
    setShowNewChat(false);
    setNewChatName('');
  };

  const deleteChat = async (id: string) => {
    await apiDeleteChat(id);
    setChats((c) => c.filter((x) => x.chat_id !== id));
    if (selectedChat === id) {
      const remaining = chats.filter((x) => x.chat_id !== id);
      setSelectedChat(remaining[0]?.chat_id ?? null);
    }
    const newMsg = { ...messages };
    delete newMsg[id];
    persistMessages(newMsg);
  };

  // ------------------------------------------------------------------ //
  // Upload
  // ------------------------------------------------------------------ //
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedChat || !e.target.files) return;
    const files = Array.from(e.target.files);
    await apiUploadFiles(selectedChat, files);
    alert('Files uploaded – you can now ask questions about them.');
  };

  // ------------------------------------------------------------------ //
  // Query
  // ------------------------------------------------------------------ //
  const sendMessage = async () => {
    if (!input.trim() || !selectedChat || loading) return;
    setLoading(true);

    // user message
    const userMsg: Message = { role: 'user', content: input };
    const updated = {
      ...messages,
      [selectedChat]: [...currentChatMessages, userMsg],
    };
    persistMessages(updated);
    setInput('');

    try {
      const { data }: { data: QueryResponse } = await apiQuery(selectedChat, input);
      const assistantMsg: Message = { role: 'assistant', content: data.answer };
      const final = {
        ...updated,
        [selectedChat]: [...updated[selectedChat], assistantMsg],
      };
      persistMessages(final);
    } catch (err: any) {
      const errMsg: Message = {
        role: 'assistant',
        content: `Error: ${err.response?.data?.detail ?? err.message}`,
      };
      const final = {
        ...updated,
        [selectedChat]: [...updated[selectedChat], errMsg],
      };
      persistMessages(final);
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------------ //
  // Clear history for current chat
  // ------------------------------------------------------------------ //
  const clearHistory = () => {
    if (!selectedChat) return;
    const newMsg = { ...messages };
    newMsg[selectedChat] = [];
    persistMessages(newMsg);
  };

  // ------------------------------------------------------------------ //
  // Render
  // ------------------------------------------------------------------ //
  return (
    <div className="flex h-screen">
      {/* ---------- Sidebar ---------- */}
      <aside className="w-72 bg-gray-900 text-gray-100 flex flex-col">
        <div className="p-4">
          <button
            onClick={() => setShowNewChat(true)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded"
          >
            + New Chat
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2">
          {chats.map((c) => (
            <div
              key={c.chat_id}
              className={`group flex items-center justify-between p-2 my-1 rounded cursor-pointer transition ${
                selectedChat === c.chat_id ? 'bg-gray-700' : 'hover:bg-gray-800'
              }`}
              onClick={() => setSelectedChat(c.chat_id)}
            >
              <span className="truncate flex-1">{c.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteChat(c.chat_id);
                }}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 ml-2"
                title="Delete"
              >
                X
              </button>
            </div>
          ))}
        </nav>
      </aside>

      {/* ---------- Main Area ---------- */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b p-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">
            {selectedChat
              ? chats.find((c) => c.chat_id === selectedChat)?.name ?? 'Chat'
              : 'Select a chat'}
          </h1>
          {selectedChat && (
            <div className="flex gap-2">
              <label className="cursor-pointer bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded">
                Upload
                <input
                  type="file"
                  multiple
                  accept=".pdf,.txt"
                  onChange={handleUpload}
                  className="hidden"
                />
              </label>
              <button
                onClick={clearHistory}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded"
              >
                Clear
              </button>
            </div>
          )}
        </header>

        {/* Messages */}
        <section className="flex-1 overflow-y-auto p-4 space-y-4 scroll-area">
          {currentChatMessages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xl px-4 py-2 rounded-lg ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-900'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg">
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </section>

        {/* Input */}
        <footer className="bg-white border-t p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask something..."
              disabled={!selectedChat || loading}
              className="flex-1 border rounded-l-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={sendMessage}
              disabled={!selectedChat || loading || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 rounded-r-md"
            >
              Send
            </button>
          </div>
        </footer>
      </main>

      {/* ---------- New-Chat Modal ---------- */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-lg font-semibold mb-4">New Chat</h2>
            <input
              autoFocus
              type="text"
              value={newChatName}
              onChange={(e) => setNewChatName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createChat()}
              placeholder="Chat name"
              className="w-full border rounded px-3 py-2 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowNewChat(false);
                  setNewChatName('');
                }}
                className="px-4 py-1 bg-gray-300 hover:bg-gray-400 rounded"
              >
                Cancel
              </button>
              <button
                onClick={createChat}
                disabled={!newChatName.trim()}
                className="px-4 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;