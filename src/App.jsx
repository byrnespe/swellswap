import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useState } from 'react';
import BottomNav from './components/BottomNav';
import Feed from './pages/Feed';
import Search from './pages/Search';
import PostBoard from './pages/PostBoard';
import Saved from './pages/Saved';
import Profile from './pages/Profile';
import BoardDetail from './pages/BoardDetail';
import Messages from './pages/Messages';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';
import Admin from './pages/Admin';
import { useAuth } from './context/AuthContext';
import { useSocket } from './hooks/useSocket';
import { usePush } from './hooks/usePush';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

function Layout() {
  const location = useLocation();
  const hideNav = ['/auth', '/onboarding', '/admin'].some(p => location.pathname.startsWith(p))
    || location.pathname.startsWith('/board/');
  useSocket();
  usePush();
  return (
    <div className="relative">
      <Routes>
        <Route path="/auth"       element={<Auth />} />
        <Route path="/onboarding" element={<Onboarding onDone={() => window.location.replace('/')} />} />
        <Route path="/"           element={<Feed />} />
        <Route path="/search"     element={<Search />} />
        <Route path="/post"       element={<ProtectedRoute><PostBoard /></ProtectedRoute>} />
        <Route path="/saved"      element={<ProtectedRoute><Saved /></ProtectedRoute>} />
        <Route path="/messages"   element={<ProtectedRoute><Messages /></ProtectedRoute>} />
        <Route path="/profile"    element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/admin"      element={<ProtectedRoute><Admin /></ProtectedRoute>} />
        <Route path="/board/:id"  element={<BoardDetail />} />
      </Routes>
      {!hideNav && <BottomNav />}
    </div>
  );
}

export default function App() {
  const [seenOnboarding] = useState(() => localStorage.getItem('onboarding_done') === 'true');

  const handleOnboardingDone = () => {
    localStorage.setItem('onboarding_done', 'true');
    window.location.replace('/');
  };

  if (!seenOnboarding) {
    return <Onboarding onDone={handleOnboardingDone} />;
  }

  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}
