import { useState, useEffect } from 'react';
import { Waves, SlidersHorizontal, Bell } from 'lucide-react';
import BoardCard from '../components/BoardCard';
import { boardTypes } from '../data/boards';
import { useAuth } from '../context/AuthContext';

export default function Feed() {
  const { token } = useAuth();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('All');
  const [tradeOnly, setTradeOnly] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (activeType !== 'All') params.set('type', activeType);
    if (tradeOnly) params.set('trade', 'true');
    setLoading(true);
    fetch(`/api/boards?${params}`, token ? { headers: { Authorization: `Bearer ${token}` } } : {})
      .then(r => r.json())
      .then(data => { setBoards(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [activeType, tradeOnly, token]);

  return (
    <div className="pb-24">
      <div className="sticky top-0 z-40 bg-[#0a0f1e]/95 backdrop-blur-sm border-b border-white/5 px-4 pt-12 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Waves size={22} className="text-cyan-400" />
            <span className="text-white font-bold text-xl tracking-tight">SwellSwap</span>
          </div>
          <button className="relative">
            <Bell size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="bg-white/5 rounded-full px-3 py-1 text-xs text-slate-300">
            📍 New Jersey Shore — 25mi radius
          </div>
          <button className="flex items-center gap-1 text-xs text-cyan-400 font-medium">
            <SlidersHorizontal size={13} />
            Filter
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {boardTypes.map(type => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-colors flex-shrink-0 ${
                activeType === type ? 'bg-cyan-500 text-white' : 'bg-white/5 text-slate-400'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-slate-400 text-sm">
            <span className="text-white font-semibold">{boards.length}</span> boards nearby
          </p>
          <button
            onClick={() => setTradeOnly(!tradeOnly)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              tradeOnly ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'bg-transparent border-white/10 text-slate-400'
            }`}
          >
            🔄 Trade Only
          </button>
        </div>

        <div className="bg-gradient-to-r from-cyan-600 to-blue-700 rounded-2xl p-4 mb-4 relative overflow-hidden">
          <div className="absolute right-2 top-0 bottom-0 flex items-center text-6xl opacity-20">🏄</div>
          <p className="text-white/80 text-xs font-medium mb-1">NJ SHORE</p>
          <p className="text-white font-bold text-base">SwellSwap is live 🌊</p>
          <p className="text-white/70 text-xs mt-1">List your board, find your next quiver piece</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white/5 rounded-2xl h-48 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {boards.map(board => <BoardCard key={board.id} board={board} />)}
          </div>
        )}

        {!loading && boards.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <p className="text-4xl mb-3">🏄</p>
            <p className="font-medium">No boards yet</p>
            <p className="text-sm mt-1">Be the first to list one!</p>
          </div>
        )}
      </div>
    </div>
  );
}
