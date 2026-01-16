import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Send, LogOut, Paperclip, Trash2 } from 'lucide-react';

const Chat = () => {
  const { user, logout } = useAuth();
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientId, setRecipientId] = useState(null);
  const [socket, setSocket] = useState(null);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [connections, setConnections] = useState([]); // New: Store connections
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Use a ref for recipientId to access it inside the socket listener without re-binding
  const recipientIdRef = useRef(recipientId);
  useEffect(() => {
    recipientIdRef.current = recipientId;
  }, [recipientId]);

  // Initialize Socket
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    console.log("[Chat] Initializing socket connection to:", backendUrl);
    const newSocket = io(backendUrl, {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log("[Socket] Connected with ID:", newSocket.id);
    });

    newSocket.on('new_message', (payload) => {
      console.log("[Socket] Event received:", payload);
      
      if (payload.type === 'NEW_MESSAGE') {
        const isFromCurrentRecipient = payload.message.sender_id === recipientIdRef.current;
        const isToCurrentRecipient = payload.message.receiver_id === recipientIdRef.current;
        
        if (isFromCurrentRecipient || isToCurrentRecipient) {
          setMessages((prev) => {
            if (prev.find(m => m.id === payload.message.id)) return prev;
            return [...prev, payload.message];
          });
        }
      } else if (payload.type === 'NEW_CONNECTION') {
        console.log("[Socket] New connection detected:", payload.connection);
        alert(`${payload.connection.email} connected with you!`); // Immediate feedback
        setConnections((prev) => {
          if (prev.find(c => c.connected_user_id === payload.connection.connected_user_id)) return prev;
          return [payload.connection, ...prev];
        });
      } else if (payload.type === 'DELETE_MESSAGE') {
        console.log("[Socket] Message deleted:", payload.messageId);
        setMessages((prev) => prev.filter(m => m.id !== payload.messageId));
      }
    });

    setSocket(newSocket);
    return () => {
      console.log("[Socket] Disconnecting...");
      newSocket.close();
    };
  }, []);

  // Fetch History when recipientId changes
  useEffect(() => {
    if (recipientId) {
      console.log("[Chat] Fetching history for recipient:", recipientId);
      const fetchHistory = async () => {
        try {
          const res = await api.get(`/messages/${recipientId}`);
          console.log("[Chat] History loaded:", res.data.data.length, "messages");
          setMessages(res.data.data);
        } catch (err) {
          console.error("[Chat] Failed to fetch history:", err);
        }
      };
      fetchHistory();
    }
  }, [recipientId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    console.log("[Chat] Uploading file:", selectedFile.name);
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      console.log("[Chat] File upload success:", res.data.data);
      setFile(res.data.data); // Stores the file metadata including id
    } catch (err) {
      console.error("[Chat] File upload failed:", err);
      alert("File upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!content.trim() && !file) return;
    if (!recipientId) return;

    console.log("[Chat] Sending message to:", recipientId);
    try {
      const res = await api.post('/messages', {
        receiver_id: recipientId,
        content: content || (file ? `Sent an attachment: ${file.original_name}` : ''),
        file_id: file?.id
      });
      console.log("[Chat] Message sent successfully:", res.data.data);
      setMessages((prev) => [...prev, res.data.data]);
      setContent('');
      setFile(null);
    } catch (err) {
      console.error("[Chat] Failed to send message:", err);
    }
  };

  // Fetch connections on mount
  useEffect(() => {
    fetchConnections();
  }, []);

  // Fetch all connections
  const fetchConnections = async () => {
    try {
      console.log("[Chat] Fetching connections...");
      const res = await api.get('/connections');
      console.log("[Chat] Connections loaded:", res.data.connections);
      setConnections(res.data.connections);
    } catch (err) {
      console.error("[Chat] Failed to fetch connections:", err);
    }
  };

  // Delete Message Logic
  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm("Are you sure you want to delete this message?")) return;

    try {
      console.log("[Chat] Deleting message:", messageId);
      await api.delete(`/messages/${messageId}`);
      // Optimistically update local state
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (err) {
      console.error("[Chat] Delete failed:", err);
      alert("Failed to delete message.");
    }
  };

  // Professional user search and connection creation
  const findUser = async () => {
    const email = prompt("Enter Recipient Email (e.g., test@gmail.com):");
    if (!email) return;

    try {
      console.log("[Chat] Searching for user:", email);
      const res = await api.get(`/auth/search?email=${email}`);
      const foundUser = res.data.user;
      console.log("[Chat] Found User:", foundUser);
      
      // Create bidirectional connection
      try {
        await api.post('/connections', { connected_user_id: foundUser.id });
        console.log("[Chat] Connection created successfully");
        alert(`Connected to ${foundUser.email}`);
        
        // Refresh connections list
        await fetchConnections();
      } catch (connErr) {
        if (connErr.response?.data?.message === "Connection already exists") {
          console.log("[Chat] Connection already exists");
          alert(`Already connected to ${foundUser.email}`);
        } else {
          throw connErr;
        }
      }
      
      // Set as current recipient
      setRecipientId(foundUser.id);
      setRecipientEmail(foundUser.email);
    } catch (err) {
      console.error("[Chat] Search failed:", err);
      alert(err.response?.data?.message || "User not found. Make sure they are registered.");
    }
  };

  return (
    <div className="flex h-screen w-full bg-white text-slate-800 overflow-hidden font-sans">
      {/* Sidebar - Desktop Only for simplicity */}
      <div className="hidden md:flex w-80 bg-slate-50 border-r border-slate-100 flex-col shadow-[1px_0_0_rgb(0,0,0,0.05)]">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center">
          <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
            Yatri<span className="text-emerald-500 text-2xl">.</span>
          </h1>
          <button onClick={logout} className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-red-500 transition-all">
            <LogOut size={18} />
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Conversations</p>
          <button 
            onClick={findUser}
            className="w-full bg-white border border-slate-200 border-dashed p-4 rounded-xl text-slate-500 hover:text-slate-900 hover:border-slate-400 transition-all text-sm font-bold flex items-center justify-center gap-2 mb-6"
          >
            <span className="text-lg">+</span> New Connection
          </button>

          <div className="space-y-2">
            {connections.map((conn) => (
              <button
                key={conn.connected_user_id}
                onClick={() => {
                  setRecipientId(conn.connected_user_id);
                  setRecipientEmail(conn.email);
                }}
                className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${
                  recipientId === conn.connected_user_id 
                    ? 'bg-emerald-50 border border-emerald-100 shadow-sm' 
                    : 'hover:bg-white border border-transparent hover:border-slate-100'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${
                  recipientId === conn.connected_user_id ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {conn.email[0].toUpperCase()}
                </div>
                <div className="flex-1 text-left truncate">
                  <p className={`text-sm font-bold truncate ${recipientId === conn.connected_user_id ? 'text-emerald-900' : 'text-slate-700'}`}>
                    {conn.email}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Active Connection</p>
                </div>
              </button>
            ))}
            {connections.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-10 font-medium italic">No active connections yet.</p>
            )}
          </div>
        </div>

        <div className="p-6 bg-slate-900 text-white mx-4 mb-4 rounded-2xl shadow-xl shadow-slate-200">
          <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">Active Profile</p>
          <p className="text-sm font-bold truncate mt-1">{user?.email || 'Loading...'}</p>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative bg-white">
        {recipientId ? (
          <>
            {/* Header */}
            <header className="p-6 border-b border-slate-50 flex items-center justify-between sticky top-0 z-10 bg-white/80 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600 uppercase">
                  {(recipientEmail || 'U')[0]}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">{recipientEmail || 'User Session'}</h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    <span className="text-[11px] font-bold text-emerald-600/80 uppercase tracking-tighter">Live E2EE Chat</span>
                  </div>
                </div>
              </div>
            </header>

            {/* Message List */}
            <main className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar bg-slate-50/20">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender_id === recipientId ? 'justify-start' : 'justify-end'}`}>
                  <div className={`group relative max-w-[85%] md:max-w-[65%] p-4 rounded-3xl shadow-sm ${
                    m.sender_id === recipientId 
                    ? 'bg-white text-slate-800 rounded-bl-none border border-slate-100' 
                    : 'bg-slate-900 text-white rounded-br-none'
                  }`}>
                    {m.content && <p className="text-[15px] leading-relaxed font-medium">{m.content}</p>}
                    
                    {/* Attachment Display */}
                    {(m.file_path || m.file?.file_path) && (
                      <div className={`mt-2 p-3 rounded-xl flex items-center gap-3 border ${
                        m.sender_id === recipientId ? 'bg-slate-50 border-slate-100' : 'bg-white/10 border-white/10'
                      }`}>
                        <Paperclip size={16} className={m.sender_id === recipientId ? 'text-slate-400' : 'text-slate-300'} />
                        <a 
                          href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/${m.file_path || m.file.file_path}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-xs font-bold hover:underline truncate max-w-[150px]"
                        >
                          {m.original_name || m.file?.original_name || 'View Attachment'}
                        </a>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-2 gap-4">
                      {m.sender_id !== recipientId && (
                        <button 
                          onClick={() => handleDeleteMessage(m.id)}
                          className="text-slate-400 hover:text-red-400 p-1 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                      <time className={`text-[10px] block font-bold ${
                        m.sender_id === recipientId ? 'text-slate-300' : 'text-slate-500'
                      }`}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </time>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </main>

            {/* Input Form */}
            <footer className="p-6 md:p-10 bg-white">
              {file && (
                <div className="max-w-4xl mx-auto mb-3 flex items-center justify-between bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-2">
                    <Paperclip size={14} /> {file.original_name}
                  </span>
                  <button onClick={() => setFile(null)} className="text-emerald-700 hover:text-emerald-900 text-xs font-black">✕</button>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100 focus-within:border-slate-300 focus-within:bg-white transition-all">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current.click()}
                  className={`p-3 transition-colors ${isUploading ? 'animate-pulse text-emerald-500' : 'text-slate-400 hover:text-slate-900'}`}
                >
                  <Paperclip size={20}/>
                </button>
                <input 
                  type="text" 
                  placeholder={isUploading ? "Uploading file..." : "Lock-it-in... Type a message"}
                  className="flex-1 bg-transparent border-none focus:outline-none px-2 text-sm font-semibold text-slate-800 placeholder:text-slate-400"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={isUploading}
                />
                <button 
                  disabled={isUploading}
                  className="p-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-md active:scale-95 group disabled:opacity-50"
                >
                  <Send size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </form>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-10 bg-slate-50/10">
            <div className="w-32 h-32 bg-white rounded-[40px] flex items-center justify-center border border-slate-100 shadow-2xl mb-10 rotate-3">
              <Send size={48} className="text-slate-100 fill-slate-50" />
            </div>
            <div className="text-center space-y-2 max-w-sm">
              <h3 className="text-2xl font-black text-slate-900">Encrypted Dashboard</h3>
              <p className="text-slate-400 font-medium text-sm leading-relaxed">
                Start a private conversation using a unique User ID. Your messages are powered by raw SQL queries and real-time sockets.
              </p>
              <button 
                onClick={findUser}
                className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-full font-bold text-sm hover:translate-y-[-2px] transition-all shadow-xl shadow-slate-200"
              >
                Browse Conversations
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
