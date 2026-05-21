import { useState } from 'react';
import { X, Zap, Star, Rocket, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';

const TIERS = [
  { key: 'starter', icon: Zap,    label: 'Starter', price: '$2.99', days: 3,  color: 'text-cyan-400',   bg: 'bg-cyan-400/10   border-cyan-400/20',   active: 'border-cyan-400   bg-cyan-400/20' },
  { key: 'pro',     icon: Star,   label: 'Pro',     price: '$5.99', days: 7,  color: 'text-violet-400', bg: 'bg-violet-400/10 border-violet-400/20', active: 'border-violet-400 bg-violet-400/20' },
  { key: 'max',     icon: Rocket, label: 'Max',     price: '$9.99', days: 14, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', active: 'border-yellow-400 bg-yellow-400/20' },
];

export default function BoostModal({ board, onClose }) {
  const { token } = useAuth();
  const toast = useToast();
  const [selected, setSelected] = useState('pro');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const boost = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/boost/boards/${board.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tier: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDone(true);
      toast('Listing boosted! 🚀 Your board is now featured at the top.', 'success');
    } catch (err) {
      toast(err.message || 'Boost failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[480px] mx-auto bg-[#0d1426] rounded-t-3xl border-t border-white/10 p-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500">
          <X size={20} />
        </button>

        {done ? (
          <div className="text-center py-6">
            <div className="bg-emerald-500/20 rounded-full p-4 w-fit mx-auto mb-4">
              <CheckCircle size={36} className="text-emerald-400" />
            </div>
            <h2 className="text-white font-bold text-xl">You're Featured! 🚀</h2>
            <p className="text-slate-400 text-sm mt-2">Your board now appears at the top of the feed for surfers near you.</p>
            <button onClick={onClose} className="mt-6 w-full bg-cyan-500 text-white font-bold py-3.5 rounded-2xl">Done</button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-1">
              <Rocket size={18} className="text-cyan-400" />
              <h2 className="text-white font-bold text-lg">Boost Listing</h2>
            </div>
            <p className="text-slate-400 text-sm mb-5">Pin your board to the top of the feed so more surfers see it.</p>

            <div className="space-y-3 mb-6">
              {TIERS.map(({ key, icon: Icon, label, price, days, color, bg, active }) => (
                <button
                  key={key}
                  onClick={() => setSelected(key)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${selected === key ? active : `bg-white/5 border-white/8`}`}
                >
                  <div className={`rounded-xl p-2 ${bg}`}>
                    <Icon size={20} className={color} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-bold text-sm ${selected === key ? 'text-white' : 'text-slate-300'}`}>{label}</p>
                    <p className="text-slate-500 text-xs">{days} days at the top</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${selected === key ? 'text-white' : 'text-slate-300'}`}>{price}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="bg-white/5 rounded-xl p-3 mb-5 text-xs text-slate-400 text-center">
              🔒 Demo mode — no real payment required
            </div>

            <button
              onClick={boost}
              disabled={loading}
              className="w-full bg-cyan-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-cyan-500/25 disabled:opacity-60"
            >
              {loading ? 'Boosting...' : `Boost for ${TIERS.find(t => t.key === selected)?.price}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
