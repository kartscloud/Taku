import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import DiscoverSwipe from './pages/DiscoverSwipe';
import DiscoverBrowse from './pages/DiscoverBrowse';
import Search from './pages/Search';
import Charts from './pages/Charts';
import MyList from './pages/MyList';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Auth from './pages/Auth';
import TabBar from './components/TabBar';
import TakuFab from './components/TakuFab';
import TakuChat from './components/TakuChat';
import { getAuth } from './utils/storage';

function AppInner() {
  const [chatOpen, setChatOpen] = useState(false);
  const [filters, setFilters] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const auth = getAuth();

  const handleAiAction = (action, args) => {
    switch (action) {
      case 'filter_discover':
        setFilters(args);
        navigate('/discover');
        return { success: true, message: 'Filters applied' };
      case 'reset_filters':
        setFilters(null);
        return { success: true, message: 'Filters reset' };
      case 'navigate':
        navigate(`/${args.screen}`);
        return { success: true, message: `Navigated to ${args.screen}` };
      default:
        return { success: true };
    }
  };

  if (!auth && location.pathname !== '/auth') {
    return <Navigate to="/auth" />;
  }

  const isWarmPage = ['/mylist', '/charts', '/profile', '/settings', '/auth'].includes(location.pathname);

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: isWarmPage ? 'var(--bg-warm)' : 'var(--bg-dark)',
      color: isWarmPage ? 'var(--text-warm)' : 'var(--text-dark)',
      transition: 'background 0.3s, color 0.3s',
    }}>
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/discover" element={<DiscoverSwipe filters={filters} setFilters={setFilters} />} />
          <Route path="/browse" element={<DiscoverBrowse />} />
          <Route path="/search" element={<Search />} />
          <Route path="/charts" element={<Charts />} />
          <Route path="/mylist" element={<MyList />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/discover" />} />
        </Routes>
      </div>
      {auth && location.pathname !== '/auth' && (
        <>
          <TabBar />
          <TakuFab onClick={() => setChatOpen(true)} />
          {chatOpen && (
            <TakuChat onClose={() => setChatOpen(false)} onAction={handleAiAction} />
          )}
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppInner />
    </HashRouter>
  );
}
