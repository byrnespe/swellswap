import { Heart, MapPin, ArrowLeftRight, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const conditionColors = {
  Excellent: 'text-emerald-400 bg-emerald-400/10',
  Good:      'text-cyan-400   bg-cyan-400/10',
  Fair:      'text-yellow-400 bg-yellow-400/10',
  Rough:     'text-red-400    bg-red-400/10',
};

function resolveImage(url) {
  if (!url) return 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=500&q=80';
  if (url.startsWith('http')) return url;
  // In production (served from same origin) use relative path; in dev, Vite proxies /uploads
  return url;
}

export default function BoardCard({ board }) {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [saved, setSaved] = useState(board.saved);

  const toggleSave = async (e) => {
    e.stopPropagation();
    if (!token) { navigate('/auth'); return; }
    setSaved(!saved);
    await fetch(`/api/boards/${board.id}/save`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  };

  return (
    <div
      className="bg-[#0d1426] rounded-2xl overflow-hidden border border-white/5 active:scale-[0.97] transition-transform cursor-pointer"
      onClick={() => navigate(`/board/${board.id}`)}
    >
      <div className="relative">
        <img src={resolveImage(board.image_url)} alt={board.title} className="w-full h-44 object-cover" />
        <button className="absolute top-2.5 right-2.5 bg-black/40 backdrop-blur-sm rounded-full p-1.5" onClick={toggleSave}>
          <Heart size={14} className={saved ? 'text-red-400 fill-red-400' : 'text-white'} />
        </button>
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
          {board.featured && (
            <div className="bg-yellow-400/20 backdrop-blur-sm border border-yellow-400/40 rounded-full px-2 py-0.5 flex items-center gap-1">
              <Zap size={9} className="text-yellow-400" />
              <span className="text-yellow-400 text-[9px] font-bold">FEATURED</span>
            </div>
          )}
          {board.trade && (
            <div className="bg-cyan-500/20 backdrop-blur-sm border border-cyan-500/40 rounded-full px-2 py-0.5 flex items-center gap-1">
              <ArrowLeftRight size={9} className="text-cyan-400" />
              <span className="text-cyan-400 text-[9px] font-bold">TRADE</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-white text-sm leading-tight truncate">{board.title}</h3>
            <p className="text-slate-400 text-xs mt-0.5 truncate">{board.length || board.type} · {board.fins || board.condition}</p>
          </div>
          <span className="text-cyan-400 font-bold text-sm whitespace-nowrap">${board.price}</span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1 text-slate-500">
            <MapPin size={10} />
            <span className="text-xs truncate max-w-[90px]">{board.location}</span>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${conditionColors[board.condition] || 'text-slate-400 bg-white/5'}`}>
            {board.condition}
          </span>
        </div>
      </div>
    </div>
  );
}
