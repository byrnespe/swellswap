import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Share2, MapPin, ArrowLeftRight, Star, Eye, MessageCircle, ShieldCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const conditionColors = {
  Excellent: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  Good: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  Fair: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  Rough: 'text-red-400 bg-red-400/10 border-red-400/20',
};

function timeAgo(ts) {
  const diff = Date.now() / 1000 - ts;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function BoardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [messaging, setMessaging] = useState(false);

  useEffect(() => {
    fetch(`/api/boards/${id}`, token ? { headers: { Authorization: `Bearer ${token}` } } : {})
      .then(r => r.json())
      .then(data => { setBoard(data); setSaved(data.saved || false); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id, token]);

  const toggleSave = async () => {
    if (!user) return navigate('/auth');
    const res = await fetch(`/api/boards/${id}/save`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setSaved(data.saved);
  };

  const handleMessage = async () => {
    if (!user) return navigate('/auth');
    if (messaging) return;
    setMessaging(true);
    try {
      const res = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ board_id: id }),
      });
      const data = await res.json();
      if (data.id) navigate('/messages');
    } catch {}
    setMessaging(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!board || board.error) return (
    <div className="flex flex-col items-center justify-center h-screen text-slate-400 gap-3">
      <p>Board not found</p>
      <button onClick={() => navigate('/')} className="text-cyan-400 text-sm">← Back to feed</button>
    </div>
  );

  const isOwner = user?.id === board.user_id;

  return (
    <div className="pb-32">
      <div className="relative">
        <img
          src={board.image_url || 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=500&q=80'}
          alt={board.title}
          className="w-full h-64 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1e] via-transparent to-transparent" />

        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pt-12">
          <button onClick={() => navigate(-1)} className="bg-black/40 backdrop-blur-sm rounded-full p-2">
            <ArrowLeft size={18} className="text-white" />
          </button>
          <div className="flex gap-2">
            <button className="bg-black/40 backdrop-blur-sm rounded-full p-2">
              <Share2 size={18} className="text-white" />
            </button>
            <button onClick={toggleSave} className="bg-black/40 backdrop-blur-sm rounded-full p-2">
              <Heart size={18} className={saved ? 'text-red-400 fill-red-400' : 'text-white'} />
            </button>
          </div>
        </div>

        {board.trade && (
          <div className="absolute bottom-4 left-4 bg-cyan-500/20 backdrop-blur-sm border border-cyan-500/40 rounded-full px-3 py-1 flex items-center gap-1.5">
            <ArrowLeftRight size={12} className="text-cyan-400" />
            <span className="text-cyan-400 text-xs font-semibold">OPEN TO TRADES</span>
          </div>
        )}
      </div>

      <div className="px-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-white font-bold text-xl leading-tight">{board.title}</h1>
            <p className="text-slate-400 text-sm mt-1">{board.brand} · {board.type}</p>
          </div>
          <span className="text-cyan-400 font-bold text-2xl">${board.price}</span>
        </div>

        <div className="flex gap-2 mt-3 flex-wrap">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${conditionColors[board.condition] || 'text-slate-400 bg-white/5 border-white/10'}`}>
            {board.condition}
          </span>
          {board.length && <span className="text-xs text-slate-400 bg-white/5 px-2.5 py-1 rounded-full">{board.length}</span>}
          {board.volume && <span className="text-xs text-slate-400 bg-white/5 px-2.5 py-1 rounded-full">{board.volume}</span>}
          {board.fins && <span className="text-xs text-slate-400 bg-white/5 px-2.5 py-1 rounded-full">{board.fins} Fins</span>}
        </div>

        {(board.length || board.width || board.thickness || board.volume || board.fins || board.type) && (
          <div className="bg-white/5 rounded-2xl p-4 mt-4 grid grid-cols-3 gap-3">
            {[
              { label: 'Length', value: board.length },
              { label: 'Width', value: board.width },
              { label: 'Thickness', value: board.thickness },
              { label: 'Volume', value: board.volume },
              { label: 'Fins', value: board.fins },
              { label: 'Type', value: board.type },
            ].filter(s => s.value).map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-slate-500 text-[10px] uppercase tracking-wider">{label}</p>
                <p className="text-white font-semibold text-sm mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        )}

        {board.description && (
          <div className="mt-4">
            <h2 className="text-white font-semibold text-sm mb-2">Description</h2>
            <p className="text-slate-400 text-sm leading-relaxed">{board.description}</p>
          </div>
        )}

        <div className="flex items-center gap-2 mt-4 text-slate-400">
          <MapPin size={14} />
          <span className="text-sm">{board.location}</span>
        </div>

        <div className="bg-white/5 rounded-2xl p-4 mt-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: board.seller_color || '#0ea5e9' }}
            >
              {board.seller_name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{board.seller_name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Star size={11} className="text-yellow-400 fill-yellow-400" />
                <span className="text-slate-400 text-xs">{board.seller_listings || 0} active listings</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck size={14} />
            <span className="text-xs font-medium">Verified</span>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3 text-slate-500 text-xs">
          <div className="flex items-center gap-1"><Eye size={12} /> {board.views} views</div>
          <span>Posted {timeAgo(board.created_at)}</span>
        </div>
      </div>

      {!isOwner && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] p-4 bg-[#0a0f1e]/95 backdrop-blur-sm border-t border-white/5">
          <div className="flex gap-3">
            {board.trade && (
              <button
                onClick={handleMessage}
                className="flex-1 bg-white/5 border border-cyan-500/30 text-cyan-400 font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm"
              >
                <ArrowLeftRight size={16} />
                Offer Trade
              </button>
            )}
            <button
              onClick={handleMessage}
              disabled={messaging}
              className="flex-1 bg-cyan-500 text-white font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm shadow-lg shadow-cyan-500/25 disabled:opacity-60"
            >
              <MessageCircle size={16} />
              {messaging ? 'Opening...' : 'Message Seller'}
            </button>
          </div>
        </div>
      )}

      {isOwner && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] p-4 bg-[#0a0f1e]/95 backdrop-blur-sm border-t border-white/5">
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-2xl p-3 text-center">
            <p className="text-cyan-400 text-sm font-medium">This is your listing</p>
          </div>
        </div>
      )}
    </div>
  );
}
