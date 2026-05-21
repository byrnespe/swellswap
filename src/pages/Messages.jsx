import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';

function timeAgo(ts) {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function Avatar({ name, color, size = 8 }) {
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ backgroundColor: color || '#0ea5e9', fontSize: size * 2 }}
    >
      {name?.charAt(0).toUpperCase()}
    </div>
  );
}

function ConversationList({ convos, onSelect, userId }) {
  return (
    <div className="pb-24">
      <div className="px-4 pt-14 pb-4 border-b border-white/5">
        <h1 className="text-white font-bold text-xl">Messages</h1>
      </div>
      {convos.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <div className="bg-white/5 rounded-full p-6 w-fit mx-auto mb-4">
            <MessageCircle size={32} className="text-slate-600" />
          </div>
          <p className="font-medium text-slate-400">No messages yet</p>
          <p className="text-sm mt-1">Message a seller to start a conversation</p>
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {convos.map(c => {
            const otherName = c.buyer_id === userId ? c.seller_name : c.buyer_name;
            const otherColor = c.buyer_id === userId ? c.seller_color : c.buyer_color;
            return (
              <button
                key={c.id}
                onClick={() => onSelect(c)}
                className="w-full flex items-center gap-3 px-4 py-4 hover:bg-white/5 active:bg-white/10 transition-colors"
              >
                <div className="relative">
                  <Avatar name={otherName} color={otherColor} size={10} />
                  {c.unread_count > 0 && (
                    <span className="absolute -top-1 -right-1 bg-cyan-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {c.unread_count}
                    </span>
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-semibold text-sm">{otherName}</p>
                    {c.last_message_at && <p className="text-slate-500 text-xs">{timeAgo(c.last_message_at)}</p>}
                  </div>
                  <p className="text-slate-500 text-xs truncate mt-0.5">{c.board_title} · ${c.board_price}</p>
                  {c.last_message && (
                    <p className={`text-xs truncate mt-0.5 ${c.unread_count > 0 ? 'text-cyan-400 font-medium' : 'text-slate-500'}`}>
                      {c.last_message}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChatView({ convo, onBack, userId, token, socket }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);

  const otherName = convo.buyer_id === userId ? convo.seller_name : convo.buyer_name;
  const otherColor = convo.buyer_id === userId ? convo.seller_color : convo.buyer_color;

  useEffect(() => {
    fetch(`/api/messages/conversations/${convo.id}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(setMessages);
  }, [convo.id, token]);

  useEffect(() => {
    if (!socket) return;
    const handler = (msg) => {
      if (msg.conversation_id === convo.id) {
        setMessages(prev => [...prev, msg]);
      }
    };
    const typingHandler = ({ userId: uid, isTyping }) => {
      if (uid !== userId) setTyping(isTyping);
    };
    socket.on('new_message', handler);
    socket.on('user_typing', typingHandler);
    return () => { socket.off('new_message', handler); socket.off('user_typing', typingHandler); };
  }, [socket, convo.id, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const sendMessage = () => {
    if (!input.trim() || !socket) return;
    socket.emit('send_message', { conversation_id: convo.id, content: input.trim() });
    setInput('');
    socket.emit('typing', { conversation_id: convo.id, isTyping: false });
  };

  const handleInput = (val) => {
    setInput(val);
    if (!socket) return;
    socket.emit('typing', { conversation_id: convo.id, isTyping: val.length > 0 });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('typing', { conversation_id: convo.id, isTyping: false });
    }, 2000);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4 border-b border-white/5 bg-[#0a0f1e]">
        <button onClick={onBack} className="text-slate-400 mr-1">
          <ArrowLeft size={20} />
        </button>
        <Avatar name={otherName} color={otherColor} size={9} />
        <div>
          <p className="text-white font-semibold text-sm">{otherName}</p>
          <p className="text-slate-500 text-xs truncate max-w-[200px]">{convo.board_title}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map(msg => {
          const isMe = msg.sender_id === userId;
          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
              {!isMe && <Avatar name={msg.sender_name} color={msg.sender_color} size={7} />}
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                isMe
                  ? 'bg-cyan-500 text-white rounded-br-sm'
                  : 'bg-white/10 text-slate-100 rounded-bl-sm'
              }`}>
                <p>{msg.content}</p>
                <p className={`text-[10px] mt-1 ${isMe ? 'text-cyan-200' : 'text-slate-500'}`}>
                  {timeAgo(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        {typing && (
          <div className="flex items-end gap-2">
            <Avatar name={otherName} color={otherColor} size={7} />
            <div className="bg-white/10 px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-4 border-t border-white/5 bg-[#0a0f1e]">
        <div className="flex items-center gap-2">
          <input
            className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-3 text-white text-sm placeholder-slate-500 outline-none focus:border-cyan-500/50"
            placeholder="Message..."
            value={input}
            onChange={e => handleInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="bg-cyan-500 rounded-full p-3 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/25"
          >
            <Send size={16} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Messages() {
  const { user, token } = useAuth();
  const socket = useSocket();
  const [convos, setConvos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!token) return;
    fetch('/api/messages/conversations', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => {
        setConvos(Array.isArray(data) ? data : []);
        setUnread(data.reduce?.((sum, c) => sum + (c.unread_count || 0), 0) || 0);
      });
  }, [token]);

  useEffect(() => {
    if (!socket) return;
    const handler = (msg) => {
      setConvos(prev => prev.map(c =>
        c.id === msg.conversation_id
          ? { ...c, last_message: msg.content, last_message_at: msg.created_at, unread_count: selected?.id === c.id ? 0 : (c.unread_count || 0) + (msg.sender_id !== user?.id ? 1 : 0) }
          : c
      ));
    };
    socket.on('new_message', handler);
    return () => socket.off('new_message', handler);
  }, [socket, selected, user]);

  if (selected) {
    return <ChatView convo={selected} onBack={() => setSelected(null)} userId={user?.id} token={token} socket={socket} />;
  }

  return <ConversationList convos={convos} onSelect={setSelected} userId={user?.id} />;
}
