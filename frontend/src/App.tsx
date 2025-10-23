import React, { useEffect, useRef, useState } from "react";
import {
  apiCreateChat,
  apiListChats,
  apiDeleteChat,
  apiUploadFiles,
  apiQuery,
  Chat,
  QueryResponse,
} from "./lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STORAGE_KEY = "rag_chat_messages";

const App: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatName, setNewChatName] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chats
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedChat]);

  const persistMessages = (newMsg: Record<string, Message[]>) => {
    setMessages(newMsg);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newMsg));
  };

  const currentChatMessages = selectedChat ? messages[selectedChat] ?? [] : [];

  const createChat = async () => {
    if (!newChatName.trim()) return;
    const { data } = await apiCreateChat(newChatName);
    setChats((c) => [...c, data]);
    setSelectedChat(data.chat_id);
    setShowNewChat(false);
    setNewChatName("");
  };

  const deleteChat = async (id: string) => {
    await apiDeleteChat(id);
    setChats((c) => c.filter((x) => x.chat_id !== id));
    const newMsg = { ...messages };
    delete newMsg[id];
    persistMessages(newMsg);
    if (selectedChat === id) setSelectedChat(null);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedChat || !e.target.files) return;
    const files = Array.from(e.target.files);
    await apiUploadFiles(selectedChat, files);
    alert("✅ Files uploaded. You can now query them!");
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedChat || loading) return;
    setLoading(true);
    const userMsg: Message = { role: "user", content: input };
    const updated = {
      ...messages,
      [selectedChat]: [...currentChatMessages, userMsg],
    };
    persistMessages(updated);
    setInput("");

    try {
      const { data }: { data: QueryResponse } = await apiQuery(selectedChat, input);
      const assistantMsg: Message = { role: "assistant", content: data.answer };
      persistMessages({
        ...updated,
        [selectedChat]: [...updated[selectedChat], assistantMsg],
      });
    } catch (err: any) {
      const errMsg: Message = {
        role: "assistant",
        content: `⚠️ Error: ${err.response?.data?.detail ?? err.message}`,
      };
      persistMessages({
        ...updated,
        [selectedChat]: [...updated[selectedChat], errMsg],
      });
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    if (!selectedChat) return;
    const newMsg = { ...messages };
    newMsg[selectedChat] = [];
    persistMessages(newMsg);
  };

  return (
    <div className="flex h-screen bg-gray-100 text-gray-800">
      {/* Sidebar */}
      <aside className="w-72 bg-gradient-to-b from-gray-900 to-gray-800 text-white flex flex-col shadow-lg">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-lg font-semibold mb-2">🧠 Knowledge-Base RAG Search Engine</h1>
          <button
            onClick={() => setShowNewChat(true)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg transition"
          >
            + New Chat
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {chats.map((c) => (
            <div
              key={c.chat_id}
              className={`flex justify-between items-center p-2 rounded-lg cursor-pointer transition-all ${
                selectedChat === c.chat_id
                  ? "bg-indigo-600 text-white"
                  : "hover:bg-gray-700"
              }`}
              onClick={() => setSelectedChat(c.chat_id)}
            >
              <span className="truncate">{c.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteChat(c.chat_id);
                }}
                className="text-red-400 hover:text-red-300 text-sm"
                title="Delete chat"
              >
                ✖
              </button>
            </div>
          ))}
        </nav>
      </aside>

      {/* Chat Area */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b shadow-sm p-4 flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-xl font-bold">
            {selectedChat
              ? chats.find((c) => c.chat_id === selectedChat)?.name
              : "Select a chat to begin"}
          </h2>
          {selectedChat && (
            <div className="flex gap-2">
              <label className="cursor-pointer bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg">
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
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-lg"
              >
                Clear
              </button>
            </div>
          )}
        </header>

        {/* Chat Messages */}
        <section className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
          {currentChatMessages.map((m, i) => (
            <div
              key={i}
              className={`flex ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-xl px-4 py-2 rounded-2xl shadow-md ${
                  m.role === "user"
                    ? "bg-indigo-600 text-white rounded-br-none"
                    : "bg-white text-gray-800 rounded-bl-none"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="px-4 py-2 bg-white rounded-2xl shadow-md animate-pulse">
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </section>

        {/* Input */}
        <footer className="bg-white border-t p-4 shadow-inner">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask a question..."
              disabled={!selectedChat || loading}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <button
              onClick={sendMessage}
              disabled={!selectedChat || loading || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg transition"
            >
              Send
            </button>
          </div>
        </footer>
      </main>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 shadow-xl w-96">
            <h2 className="text-lg font-semibold mb-3">Create New Chat</h2>
            <input
              type="text"
              value={newChatName}
              onChange={(e) => setNewChatName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createChat()}
              placeholder="Enter chat name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowNewChat(false);
                  setNewChatName("");
                }}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={createChat}
                disabled={!newChatName.trim()}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
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
