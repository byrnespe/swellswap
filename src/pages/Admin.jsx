import { useState, useEffect } from 'react';
import { Users, Package, MessageCircle, Zap, DollarSign, TrendingUp, Trash2, Shield, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';

function StatCard({ icon: Icon, label, value, sub, color = 'text-cyan-400' }) {
  return (
    <div className="bg-white/5 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={color} />
        <span className="text-slate-400 text-xs font-medium">{label}</span>
      </div>
      <p className="text-white font-bold text-2xl">{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

export default function Admin() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [boards, setBoards] = useState([]);
  const [users, setUsers] = useState([]);
  const [boosts, setBoosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch('/api/admin/stats', { headers }).then(r => {
      if (r.status === 403) { navigate('/'); return; }
      return r.json();
    }).then(d => { if (d) { setStats(d); setLoading(false); } });
  }, []);

  useEffect(() => {
    if (tab === 'boards' && boards.length === 0) {
      fetch('/api/admin/boards', { headers }).then(r => r.json()).then(setBoards);
    }
    if (tab === 'users' && users.length === 0) {
      fetch('/api/admin/users', { headers }).then(r => r.json()).then(setUsers);
    }
    if (tab === 'revenue' && boosts.length === 0) {
      fetch('/api/admin/boosts', { headers }).then(r => r.json()).then(setBoosts);
    }
  }, [tab]);

  const removeBoard = async (id) => {
    await fetch(`/api/admin/boards/${id}`, { method: 'DELETE', headers });
    setBoards(b => b.filter(x => x.id !== id));
    toast('Listing removed', 'success');
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const tabs = [
    { key: 'stats',   label: 'Overview' },
    { key: 'boards',  label: 'Listings' },
    { key: 'users',   label: 'Users' },
    { key: 'revenue', label: 'Revenue' },
  ];

  return (
    <div className="pb-8 min-h-screen">
      <div className="px-4 pt-12 pb-4 border-b border-white/5 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="text-slate-400">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-white font-bold text-lg flex items-center gap-2">
            <Shield size={18} className="text-cyan-400" /> Admin Dashboard
          </h1>
          <p className="text-slate-500 text-xs">SwellSwap control panel</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 px-4">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'text-cyan-400 border-cyan-400' : 'text-slate-500 border-transparent'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4">
        {/* STATS */}
        {tab === 'stats' && stats && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={Users}        label="Total Users"    value={stats.totalUsers}    sub={`+${stats.newUsersToday} today`} />
              <StatCard icon={Package}      label="Total Boards"   value={stats.totalBoards}   sub={`${stats.activeBoards} active`} color="text-violet-400" />
              <StatCard icon={MessageCircle} label="Messages Sent" value={stats.totalMessages} color="text-emerald-400" />
              <StatCard icon={Zap}          label="Boosts Sold"    value={stats.totalBoosts}   color="text-yellow-400" />
            </div>
            <div className="bg-gradient-to-r from-cyan-600/20 to-blue-700/20 border border-cyan-500/20 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign size={18} className="text-cyan-400" />
                <span className="text-slate-400 text-sm font-medium">Total Revenue</span>
              </div>
              <p className="text-white font-bold text-4xl">${((stats.revenue || 0) / 100).toFixed(2)}</p>
              <p className="text-slate-500 text-xs mt-1">From featured listing boosts</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-4">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Today's Activity</p>
              <div className="flex justify-between">
                <div className="text-center">
                  <p className="text-white font-bold text-xl">{stats.newUsersToday}</p>
                  <p className="text-slate-500 text-xs">New Users</p>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-xl">{stats.newBoardsToday}</p>
                  <p className="text-slate-500 text-xs">New Listings</p>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-xl">{stats.activeBoards}</p>
                  <p className="text-slate-500 text-xs">Active Listings</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BOARDS */}
        {tab === 'boards' && (
          <div className="space-y-2">
            {boards.length === 0 && <p className="text-slate-500 text-center py-8">No listings yet</p>}
            {boards.map(b => (
              <div key={b.id} className="bg-white/5 rounded-xl p-3 flex items-center gap-3">
                <img src={b.image_url || 'https://images.unsplash.com/photo-1530870110042-98b2cb110834?w=80&q=60'} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{b.title}</p>
                  <p className="text-slate-500 text-xs">{b.seller_name} · ${b.price} · {b.status}</p>
                  {b.featured && <span className="text-yellow-400 text-[10px] font-bold">⚡ FEATURED</span>}
                </div>
                <button onClick={() => removeBoard(b.id)} className="text-red-400/60 hover:text-red-400 p-1">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* USERS */}
        {tab === 'users' && (
          <div className="space-y-2">
            {users.length === 0 && <p className="text-slate-500 text-center py-8">No users yet</p>}
            {users.map(u => (
              <div key={u.id} className="bg-white/5 rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-sm" style={{ backgroundColor: u.avatar_color || '#0ea5e9' }}>
                  {u.username?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-white text-sm font-medium">{u.username}</p>
                    {u.role === 'admin' && <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded font-bold">ADMIN</span>}
                  </div>
                  <p className="text-slate-500 text-xs truncate">{u.email}</p>
                  <p className="text-slate-600 text-xs">{u.board_count} boards · {u.message_count} messages</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* REVENUE */}
        {tab === 'revenue' && (
          <div className="space-y-2">
            {boosts.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Zap size={32} className="mx-auto mb-3 opacity-30" />
                <p>No boosts sold yet</p>
                <p className="text-xs mt-1">Revenue will appear here when users boost their listings</p>
              </div>
            )}
            {boosts.map(b => (
              <div key={b.id} className="bg-white/5 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">{b.username}</p>
                  <p className="text-slate-500 text-xs">{b.board_title} · {b.tier} · {b.days}d</p>
                </div>
                <p className="text-emerald-400 font-bold">${(b.amount / 100).toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
