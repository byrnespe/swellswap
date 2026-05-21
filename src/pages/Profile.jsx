import { useEffect, useState } from 'react';
import { Package, ArrowLeftRight, Settings, ChevronRight, MapPin, LogOut, Zap, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import BoardCard from '../components/BoardCard';
import BoostModal from '../components/BoostModal';

export default function Profile() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('menu');
  const [boostBoard, setBoostBoard] = useState(null);

  useEffect(() => {
    if (!token) return;
    fetch('/api/boards/user/listings', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setListings(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const handleLogout = () => { logout(); navigate('/auth'); };

  if (view === 'listings') {
    return (
      <div className="pb-24">
        <div className="px-4 pt-14 pb-4 border-b border-white/5 flex items-center gap-3">
          <button onClick={() => setView('menu')} className="text-slate-400 text-sm">← Back</button>
          <h1 className="text-white font-bold text-lg">My Listings</h1>
        </div>
        <div className="px-4 pt-4">
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1,2].map(i => <div key={i} className="bg-white/5 rounded-2xl h-48 animate-pulse" />)}
            </div>
          ) : listings.length > 0 ? (
            <div className="space-y-3">
              {listings.map(b => (
                <div key={b.id}>
                  <BoardCard board={b} />
                  {b.status === 'active' && (
                    <button
                      onClick={() => setBoostBoard(b)}
                      className="w-full mt-1.5 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-xs font-semibold"
                    >
                      <Zap size={12} />
                      {b.featured ? 'Already Featured' : 'Boost Listing'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-500">
              <p className="text-4xl mb-3">🏄</p>
              <p>No listings yet</p>
              <button onClick={() => navigate('/post')} className="mt-4 text-cyan-400 text-sm font-medium">List your first board →</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const activeListings = listings.filter(b => b.status === 'active').length;

  return (
    <div className="pb-24">
      <div className="px-4 pt-14 pb-6 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl"
            style={{ backgroundColor: user?.avatar_color || '#0ea5e9' }}
          >
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-white font-bold text-xl">{user?.username}</h1>
            <div className="flex items-center gap-1 mt-0.5 text-slate-400">
              <MapPin size={12} />
              <span className="text-xs">{user?.location || 'New Jersey Shore'}</span>
            </div>
            <p className="text-slate-500 text-xs mt-1">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: 'Active', value: activeListings },
            { label: 'Total Listed', value: listings.length },
            { label: 'Rating', value: '⭐ New' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-white font-bold text-lg">{value}</p>
              <p className="text-slate-500 text-[10px] mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-2">
        <button onClick={() => setView('listings')} className="w-full flex items-center gap-3 bg-white/5 rounded-xl p-4 active:bg-white/10 transition-colors">
          <div className="bg-cyan-500/10 rounded-lg p-2"><Package size={18} className="text-cyan-400" /></div>
          <div className="flex-1 text-left">
            <p className="text-white text-sm font-medium">My Listings</p>
            <p className="text-slate-500 text-xs">{activeListings} active boards</p>
          </div>
          <ChevronRight size={16} className="text-slate-600" />
        </button>

        <button onClick={() => navigate('/messages')} className="w-full flex items-center gap-3 bg-white/5 rounded-xl p-4 active:bg-white/10 transition-colors">
          <div className="bg-cyan-500/10 rounded-lg p-2"><ArrowLeftRight size={18} className="text-cyan-400" /></div>
          <div className="flex-1 text-left">
            <p className="text-white text-sm font-medium">Messages</p>
            <p className="text-slate-500 text-xs">View conversations</p>
          </div>
          <ChevronRight size={16} className="text-slate-600" />
        </button>

        <button className="w-full flex items-center gap-3 bg-white/5 rounded-xl p-4 active:bg-white/10 transition-colors">
          <div className="bg-cyan-500/10 rounded-lg p-2"><Settings size={18} className="text-cyan-400" /></div>
          <div className="flex-1 text-left">
            <p className="text-white text-sm font-medium">Settings</p>
            <p className="text-slate-500 text-xs">Account & notifications</p>
          </div>
          <ChevronRight size={16} className="text-slate-600" />
        </button>

        <button onClick={handleLogout} className="w-full flex items-center gap-3 bg-red-500/5 border border-red-500/10 rounded-xl p-4 active:bg-red-500/10 transition-colors mt-4">
          <div className="bg-red-500/10 rounded-lg p-2"><LogOut size={18} className="text-red-400" /></div>
          <div className="flex-1 text-left">
            <p className="text-red-400 text-sm font-medium">Sign Out</p>
          </div>
        </button>
      </div>

      {user?.role === 'admin' && (
        <div className="px-4 mt-2">
          <button onClick={() => navigate('/admin')} className="w-full flex items-center gap-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4">
            <div className="bg-cyan-500/20 rounded-lg p-2"><Shield size={18} className="text-cyan-400" /></div>
            <div className="flex-1 text-left">
              <p className="text-cyan-400 text-sm font-semibold">Admin Dashboard</p>
              <p className="text-slate-500 text-xs">Manage the platform</p>
            </div>
            <ChevronRight size={16} className="text-slate-600" />
          </button>
        </div>
      )}

      <div className="px-4 mt-4">
        <div className="bg-gradient-to-r from-cyan-600/20 to-blue-700/20 border border-cyan-500/20 rounded-2xl p-4 text-center">
          <p className="text-cyan-400 font-bold text-sm">🌊 SwellSwap NJ</p>
          <p className="text-slate-400 text-xs mt-1">The surf marketplace for the Jersey Shore</p>
        </div>
      </div>

      {boostBoard && <BoostModal board={boostBoard} onClose={() => setBoostBoard(null)} />}
    </div>
  );
}
