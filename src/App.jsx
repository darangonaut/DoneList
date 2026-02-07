import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { auth, googleProvider, db } from './firebase';
import { 
  signInWithRedirect, 
  getRedirectResult, 
  onAuthStateChanged, 
  signOut,
} from 'firebase/auth';
import { 
  onSnapshot,
  doc, 
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { AppProvider, useApp } from './context/AppContext';

// Core Components (Always needed)
import { LandingPage } from './components/LandingPage';

// Heavy Components (Lazy Loaded)
const Dashboard = React.lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));
const BackgroundBlobs = React.lazy(() => import('./components/BackgroundBlobs').then(module => ({ default: module.BackgroundBlobs })));
const SettingsModal = React.lazy(() => import('./components/SettingsModal').then(module => ({ default: module.SettingsModal })));
const ReflectionModal = React.lazy(() => import('./components/ReflectionModal').then(module => ({ default: module.ReflectionModal })));
const VictoryCard = React.lazy(() => import('./components/VictoryCard').then(module => ({ default: module.VictoryCard })));
const AIInsightModal = React.lazy(() => import('./components/AIInsightModal').then(module => ({ default: module.AIInsightModal })));

const ModalLoading = () => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-apple-bg/20 backdrop-blur-sm">
    <div className="bg-apple-card/80 backdrop-blur-xl border border-apple-border px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
      <div className="w-2 h-2 rounded-full bg-[var(--accent-color)] animate-ping" />
      <span className="text-sm font-semibold text-apple-text tracking-wide">Načítavam...</span>
    </div>
  </div>
);

function AppContent({ user, loading, handleLogin, handleLogout }) {
  const { lang, t, accentColor } = useApp();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [reflectionType, setReflectionType] = useState(null); 
  const [sharingLog, setSharingLog] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const handleUpdateAvailable = () => setUpdateAvailable(true);
    window.addEventListener('pwa-update-available', handleUpdateAvailable);
    return () => window.removeEventListener('pwa-update-available', handleUpdateAvailable);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-apple-bg flex flex-col items-center justify-center transition-colors duration-500">
        <div className="w-16 h-16 rounded-2xl bg-[var(--accent-color)] shadow-xl flex items-center justify-center text-white text-3xl font-bold">D</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-apple-bg transition-colors duration-500 selection:bg-[var(--accent-color)] selection:text-white relative">
      <main>
        {!user ? (
          <LandingPage handleLogin={handleLogin} />
        ) : (
          <Suspense fallback={<ModalLoading />}>
            <div className="min-h-screen bg-apple-bg transition-colors duration-500">
              <BackgroundBlobs />
              <Dashboard 
                user={user} 
                setIsSettingsOpen={setIsSettingsOpen} 
                setReflectionType={setReflectionType}
                setIsAIModalOpen={setIsAIModalOpen}
                onShare={(log) => setSharingLog(log)}
              />

              <Suspense fallback={<ModalLoading />}>
                <SettingsModal 
                  isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} user={user} 
                  handleLogout={() => { setIsSettingsOpen(false); handleLogout(); }}
                  updateAvailable={updateAvailable} onUpdate={() => window.manualPwaUpdate()}
                />
                <ReflectionModal 
                  isOpen={!!reflectionType} type={reflectionType} 
                  onClose={() => setReflectionType(null)}
                />
                <VictoryCard isOpen={!!sharingLog} log={sharingLog} onClose={() => setSharingLog(null)} />
                <AIInsightModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} />
              </Suspense>
            </div>
          </Suspense>
        )}
      </main>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialSettings, setInitialSettings] = useState(() => ({
    lang: localStorage.getItem('lang') || (navigator.language.startsWith('sk') ? 'sk-SK' : 'en-US'),
    accentColor: localStorage.getItem('cached_accent') || '#F97316',
    hapticEnabled: localStorage.getItem('haptic_enabled') !== 'false',
    dailyGoal: Math.max(parseInt(localStorage.getItem('daily_goal')) || 3, 3),
    showStreak: localStorage.getItem('show_streak') !== 'false',
    showHeatmap: localStorage.getItem('show_heatmap') !== 'false',
    showBadge: localStorage.getItem('show_badge') !== 'false'
  }));

  const handleLogin = async () => {
    setLoading(true);
    try {
      setTimeout(() => { if (loading) setLoading(false); }, 10000);
      await signInWithRedirect(auth, googleProvider);
    } catch (e) {
      console.error("Login Error", e);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    signOut(auth);
    localStorage.removeItem('cached_stats');
    localStorage.removeItem('cached_tags');
  };

  useEffect(() => {
    getRedirectResult(auth).catch(e => console.error("Redirect check error:", e));

    const authUnsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        const sRef = doc(db, 'userStats', u.uid);
        onSnapshot(sRef, (s) => {
          if (s.exists()) {
            setInitialSettings(prev => ({ ...prev, ...s.data() }));
          }
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const timer = setTimeout(() => setLoading(false), 5000);
    return () => { authUnsub(); clearTimeout(timer); };
  }, []);

  return (
    <AppProvider initialSettings={initialSettings} user={user}>
      <AppContent user={user} loading={loading} handleLogin={handleLogin} handleLogout={handleLogout} />
    </AppProvider>
  );
}

export default App;