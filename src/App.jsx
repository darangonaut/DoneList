import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { auth, googleProvider, db } from './firebase';
import { 
  signInWithRedirect, 
  getRedirectResult, 
  onAuthStateChanged, 
  signOut,
} from 'firebase/auth';
import { 
  collection, 
  getDocs,
  query, 
  where, 
  onSnapshot,
  doc, 
  writeBatch
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { AppProvider, useApp } from './context/AppContext';
import { useLogs } from './hooks/useLogs';
import { getLocalDateKey, getTagColor } from './utils/stats';

// Components
const BackgroundBlobs = React.lazy(() => import('./components/BackgroundBlobs').then(module => ({ default: module.BackgroundBlobs })));
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';

// Lazy Loaded Components
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
  const [inputText, setInputText] = useState('');
  const [feedback, setFeedback] = useState('');
  
  const { 
    lang, t, accentColor, hapticEnabled, dailyGoal, showStreak, showHeatmap, triggerHaptic 
  } = useApp();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [activeTagFilter, setActiveTagFilter] = useState(null);
  const [reflectionType, setReflectionType] = useState(null); 
  const [sharingLog, setSharingLog] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const inputRef = useRef(null);

  const { 
    logs, streak, heatmapData, memoryLog, 
    addLog, deleteLog, updateLog, selectTopWin, dailyStats, dailyTags 
  } = useLogs(user, activeTagFilter);

  const todayLogs = useMemo(() => {
    const today = new Date().toDateString();
    return logs.filter(log => {
      if (!log.timestamp) return true;
      return new Date(log.timestamp.seconds * 1000).toDateString() === today;
    });
  }, [logs]);

  const candidates = useMemo(() => {
    if (reflectionType === 'daily') return todayLogs;
    if (reflectionType === 'weekly') {
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      return logs.filter(l => l.isTopWin && l.timestamp && new Date(l.timestamp.seconds * 1000) > weekAgo);
    }
    if (reflectionType === 'monthly') {
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
      return logs.filter(l => l.isWeeklyTop && l.timestamp && new Date(l.timestamp.seconds * 1000) >= monthStart);
    }
    return [];
  }, [logs, todayLogs, reflectionType]);

  const hasDailyTop = useMemo(() => logs.some(l => l.isTopWin && new Date(l.timestamp?.seconds * 1000).toDateString() === new Date().toDateString()), [logs]);
  const hasWeeklyTop = useMemo(() => {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    return logs.some(l => l.isWeeklyTop && l.timestamp && new Date(l.timestamp.seconds * 1000) > weekAgo);
  }, [logs]);
  const hasMonthlyTop = useMemo(() => {
    const monthStart = new Date(); monthStart.setDate(1);
    return logs.some(l => l.isMonthlyTop && l.timestamp && new Date(l.timestamp.seconds * 1000) >= monthStart);
  }, [logs]);

  const isSunday = new Date().getDay() === 0;
  const isLastDayOfMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() === d.getDate();
  };
  const isEvening = new Date().getHours() >= 10;

  const exportData = () => {
    const data = {
      user: { name: user.displayName, email: user.email },
      settings: { accentColor, dailyGoal, showStreak, showHeatmap, hapticEnabled },
      stats: dailyStats,
      tags: dailyTags,
      logs: logs.map(l => ({ text: l.text, date: l.timestamp?.toDate(), special: { daily: l.isTopWin, weekly: l.isWeeklyTop, monthly: l.isMonthlyTop } }))
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `donelist-export-${getLocalDateKey()}.json`;
    link.click();
  };

  const deleteAllData = async () => {
    if (!window.confirm(t.deleteWarning)) return;
    try {
      const q = query(collection(db, 'logs'), where('userId', '==', user.uid));
      const sn = await getDocs(q);
      const batch = writeBatch(db);
      sn.docs.forEach(d => batch.delete(d.ref));
      batch.delete(doc(db, 'userStats', user.uid));
      await batch.commit();
      setFeedback('História bola vymazaná. Čistý štít! ✨');
      setTimeout(() => setFeedback(''), 4000);
    } catch (e) { console.error(e); }
  };

  const handleAddLog = async (e) => {
    if (e) e.preventDefault();
    const result = await addLog(inputText);
    if (result?.feedback) {
      setFeedback(result.feedback);
      setInputText('');
      setIsInputExpanded(false);
      setTimeout(() => setFeedback(''), 4000);
    }
  };

  const handleSelectTopWin = async (logId) => {
    const success = await selectTopWin(logId, reflectionType);
    if (success) {
      const confColors = reflectionType === 'daily' ? ['#FFD700'] : reflectionType === 'weekly' ? ['#60A5FA'] : ['#A855F7'];
      const message = reflectionType === 'daily' ? t.reflectionDone : reflectionType === 'weekly' ? t.weeklyDone : t.monthlyDone;
      setReflectionType(null);
      import('canvas-confetti').then(confetti => {
        confetti.default({ particleCount: 150, spread: 60, origin: { y: 0.8 }, colors: confColors });
      });
      setFeedback(message);
      setTimeout(() => setFeedback(''), 4000);
    }
  };

  useEffect(() => {
    const handleUpdateAvailable = () => setUpdateAvailable(true);
    window.addEventListener('pwa-update-available', handleUpdateAvailable);
    return () => window.removeEventListener('pwa-update-available', handleUpdateAvailable);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-apple-bg flex flex-col items-center justify-center transition-colors duration-500">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent-color)] shadow-xl flex items-center justify-center text-white text-3xl font-bold">D</div>
          <div className="flex flex-col items-center gap-2">
            <h2 className="text-xl font-bold text-apple-text tracking-tight">DoneList</h2>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-color)] animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-color)] animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-color)] animate-bounce" />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-apple-bg transition-colors duration-500 selection:bg-[var(--accent-color)] selection:text-white relative">
      <main>
        {!user ? (
          <LandingPage handleLogin={handleLogin} />
        ) : (
          <div className="min-h-screen bg-apple-bg transition-colors duration-500">
            <Suspense fallback={null}>
              <BackgroundBlobs />
            </Suspense>
            <Dashboard 
              user={user} logs={logs} streak={streak} heatmapData={heatmapData} 
              activeTagFilter={activeTagFilter} setActiveTagFilter={setActiveTagFilter} getTagColor={getTagColor}
              isEvening={isEvening} isSunday={isSunday} isLastDayOfMonth={isLastDayOfMonth}
              hasDailyTop={hasDailyTop} hasWeeklyTop={hasWeeklyTop} hasMonthlyTop={hasMonthlyTop}
              setIsSettingsOpen={setIsSettingsOpen} setReflectionType={setReflectionType}
              setIsAIModalOpen={setIsAIModalOpen}
              handleDelete={deleteLog} onUpdate={updateLog}
              isInputExpanded={isInputExpanded} setIsInputExpanded={setIsInputExpanded}
              inputText={inputText} setInputText={setInputText} addLog={handleAddLog}
              inputRef={inputRef} onShare={(log) => setSharingLog(log)} memoryLog={memoryLog}
            />

            <Suspense fallback={<ModalLoading />}>
              <SettingsModal 
                isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} user={user} 
                handleLogout={() => { setIsSettingsOpen(false); handleLogout(); }}
                exportData={exportData} deleteAllData={deleteAllData} updateAvailable={updateAvailable} onUpdate={() => window.manualPwaUpdate()}
              />
              <ReflectionModal 
                isOpen={!!reflectionType} type={reflectionType} candidates={candidates} onSelect={handleSelectTopWin}
                onClose={() => setReflectionType(null)} getTagColor={getTagColor}
              />
              <VictoryCard isOpen={!!sharingLog} log={sharingLog} onClose={() => setSharingLog(null)} />
              <AIInsightModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} logs={logs} />
            </Suspense>
          </div>
        )}
      </main>
      
      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ y: -100, x: '-50%', opacity: 0 }} animate={{ y: 0, x: '-50%', opacity: 1 }} exit={{ y: -100, x: '-50%', opacity: 0 }} className="fixed top-8 left-1/2 z-[300] pointer-events-none">
            <div className="bg-apple-card/80 backdrop-blur-xl border border-apple-border px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 text-apple-text">
              <span>✨</span><p className="text-[15px] font-semibold whitespace-nowrap">{feedback}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
      // Small timeout to prevent UI getting stuck if Firebase is slow
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
    // 1. Process redirect result
    getRedirectResult(auth).then((result) => {
      if (result?.user) {
        console.log("Logged in via redirect:", result.user.email);
      }
    }).catch(e => console.error("Redirect check error:", e));

    // 2. Listen for auth changes
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

    // 3. Absolute fail-safe: remove loading after 5 seconds if still stuck
    const timer = setTimeout(() => setLoading(false), 5000);

    return () => {
      authUnsub();
      clearTimeout(timer);
    };
  }, []);

  return (
    <AppProvider initialSettings={initialSettings} user={user}>
      <AppContent user={user} loading={loading} handleLogin={handleLogin} handleLogout={handleLogout} />
    </AppProvider>
  );
}

export default App;