import { useState } from 'react';
import { Waves, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Auth() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: '', email: '', password: '', location: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = mode === 'login'
        ? { email: form.email, password: form.password }
        : { username: form.username, email: form.email, password: form.password, location: form.location };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="px-6 pt-16 pb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Waves size={28} className="text-cyan-400" />
          <span className="text-white font-bold text-2xl tracking-tight">SwellSwap</span>
        </div>
        <p className="text-slate-400 text-sm">
          {mode === 'login' ? 'Welcome back, surfer' : 'Join the NJ surf marketplace'}
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 px-6">
        <form onSubmit={submit} className="space-y-3">
          {mode === 'register' && (
            <input
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm placeholder-slate-500 outline-none focus:border-cyan-500/60"
              placeholder="Username"
              value={form.username}
              onChange={e => set('username', e.target.value)}
              autoComplete="username"
            />
          )}

          <input
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm placeholder-slate-500 outline-none focus:border-cyan-500/60"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            autoComplete="email"
          />

          <div className="relative">
            <input
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm placeholder-slate-500 outline-none focus:border-cyan-500/60 pr-12"
              placeholder="Password"
              type={showPass ? 'text' : 'password'}
              value={form.password}
              onChange={e => set('password', e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {mode === 'register' && (
            <input
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm placeholder-slate-500 outline-none focus:border-cyan-500/60"
              placeholder="Location (e.g. Belmar, NJ)"
              value={form.location}
              onChange={e => set('location', e.target.value)}
            />
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-500 text-white font-bold py-4 rounded-2xl text-sm shadow-lg shadow-cyan-500/25 disabled:opacity-50 mt-2"
          >
            {loading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="text-center mt-6">
          <span className="text-slate-500 text-sm">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          </span>
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            className="text-cyan-400 text-sm font-semibold"
          >
            {mode === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </div>

        <div className="mt-8 bg-white/5 rounded-2xl p-4 text-center">
          <p className="text-slate-400 text-xs leading-relaxed">
            🌊 The surfboard marketplace built for the Jersey Shore. Buy, sell, and trade boards with local surfers.
          </p>
        </div>
      </div>
    </div>
  );
}
