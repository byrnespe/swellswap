import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, PlusCircle, MessageCircle, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const tabs = [
  { path: '/', icon: Home, label: 'Feed' },
  { path: '/search', icon: Search, label: 'Search' },
  { path: '/post', icon: PlusCircle, label: 'Sell' },
  { path: '/messages', icon: MessageCircle, label: 'Messages' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!token) return;
    const check = () => fetch('/api/messages/unread', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setUnread(d.count || 0)).catch(() => {});
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, [token]);

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-[#0d1426] border-t border-white/10 flex z-50">
      {tabs.map(({ path, icon: Icon, label }) => {
        const active = location.pathname === path;
        const isSell = path === '/post';
        const isMessages = path === '/messages';
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors ${
              isSell ? '' : active ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {isSell ? (
              <div className="bg-cyan-500 rounded-full p-1.5 -mt-5 shadow-lg shadow-cyan-500/30">
                <Icon size={22} className="text-white" />
              </div>
            ) : (
              <div className="relative">
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                {isMessages && unread > 0 && (
                  <span className="absolute -top-1 -right-1 bg-cyan-500 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </div>
            )}
            <span className={`text-[10px] font-medium ${isSell ? 'text-cyan-400 mt-1' : ''}`}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
