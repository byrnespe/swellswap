import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import BoardCard from '../components/BoardCard';
import { useAuth } from '../context/AuthContext';

export default function Saved() {
  const { token } = useAuth();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch('/api/boards/user/saved', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setBoards(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  return (
    <div className="pb-24 px-4 pt-14">
      <h1 className="text-white font-bold text-xl mb-1">Saved Boards</h1>
      <p className="text-slate-400 text-sm mb-6">Boards you've hearted</p>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1,2].map(i => <div key={i} className="bg-white/5 rounded-2xl h-48 animate-pulse" />)}
        </div>
      ) : boards.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {boards.map(b => <BoardCard key={b.id} board={b} />)}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <div className="bg-white/5 rounded-full p-6 mb-4">
            <Heart size={32} className="text-slate-600" />
          </div>
          <p className="font-medium text-slate-400">No saved boards yet</p>
          <p className="text-sm mt-1 text-center">Tap the ♥ on any board to save it here</p>
        </div>
      )}
    </div>
  );
}
