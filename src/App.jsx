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
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { AppProvider, useApp } from './context/AppContext';
import { useLogs } from './hooks/useLogs';
import { getLocalDateKey, getTagColor } from './utils/stats';

// Components
import { BackgroundBlobs } from './components/BackgroundBlobs';
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

function AppContent() {
  const [user, setUser] = useState(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  
  const { 
    lang, setLang, t, 
    accentColor, setAccentColor, 
    hapticEnabled, setHapticEnabled, 
    dailyGoal, setDailyGoal,
    showStreak, setShowStreak,
    showHeatmap, setShowHeatmap,
    triggerHaptic 
  } = useApp();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [activeTagFilter, setActiveTagFilter] = useState(null);
  const [reflectionType, setReflectionType] = useState(null); 
  const [sharingLog, setSharingLog] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const inputRef = useRef(null);

  // LOGS HOOK - All data logic is here
  const { 
    logs, streak, heatmapData, memoryLog, 
    addLog, deleteLog, updateLog, selectTopWin, dailyStats, dailyTags 
  } = useLogs(user, activeTagFilter);

  const todayLogs = useMemo(() => {
    const today = new Date().toDateString();
    return logs.filter(log => {
      if (!log.timestamp) return true; // Include optimistic updates
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

  const handleLogin = async () => { 
    setLoading(true); 
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (e) {
      console.error("Login Error", e);
      setFeedback("Prihlásenie zlyhalo. Skús to znova.");
      setLoading(false);
      setTimeout(() => setFeedback(''), 4000);
    }
  };
  
  const handleLogout = () => { 
    setIsSettingsOpen(false); 
    signOut(auth); 
    localStorage.removeItem('cached_stats');
    localStorage.removeItem('cached_tags');
  };

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
    setLoading(true);
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
    setLoading(false);
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
    localStorage.setItem('lang', lang); 
    localStorage.setItem('cached_accent', accentColor); 
    localStorage.setItem('show_streak', showStreak);
    localStorage.setItem('show_heatmap', showHeatmap);
    localStorage.setItem('haptic_enabled', hapticEnabled);
    localStorage.setItem('daily_goal', dailyGoal);
  }, [accentColor, lang, showStreak, showHeatmap, hapticEnabled, dailyGoal]);

  useEffect(() => {
    if (user && !isInitialLoad) {
      setDoc(doc(db, 'userStats', user.uid), { 
        showStreak, showHeatmap, hapticEnabled, dailyGoal, accentColor, lang 
      }, { merge: true });
    }
  }, [showStreak, showHeatmap, hapticEnabled, dailyGoal, accentColor, lang, user, isInitialLoad]);

  useEffect(() => {
    const handleUpdateAvailable = () => setUpdateAvailable(true);
    window.addEventListener('pwa-update-available', handleUpdateAvailable);
    return () => window.removeEventListener('pwa-update-available', handleUpdateAvailable);
  }, []);

  useEffect(() => {
    let authUnsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const sRef = doc(db, 'userStats', u.uid);
        const unsubSettings = onSnapshot(sRef, (s) => {
          if (s.exists()) {
            const data = s.data();
            if (data.showStreak !== undefined) setShowStreak(data.showStreak);
            if (data.showHeatmap !== undefined) setShowHeatmap(data.showHeatmap);
            if (data.hapticEnabled !== undefined) setHapticEnabled(data.hapticEnabled);
            if (data.dailyGoal !== undefined) setDailyGoal(data.dailyGoal);
            if (data.accentColor !== undefined) setAccentColor(data.accentColor);
            if (data.lang !== undefined) setLang(data.lang);
          }
          setIsInitialLoad(false);
          setLoading(false);
        });
        return () => unsubSettings();
      } else { 
        setIsInitialLoad(false);
        setLoading(false); 
      }
    });
    return () => authUnsub();
  }, [setAccentColor, setDailyGoal, setHapticEnabled, setLang, setShowHeatmap, setShowStreak]);

  if (loading && !user) {
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
      {!user ? (
        <LandingPage handleLogin={handleLogin} />
      ) : (
        <div className="min-h-screen bg-apple-bg transition-colors duration-500">
          <BackgroundBlobs />
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
              isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} user={user} handleLogout={handleLogout}
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
  const initialSettings = {
    lang: localStorage.getItem('lang') || (navigator.language.startsWith('sk') ? 'sk-SK' : 'en-US'),
    accentColor: localStorage.getItem('cached_accent') || '#F97316',
    hapticEnabled: localStorage.getItem('haptic_enabled') !== 'false',
    dailyGoal: parseInt(localStorage.getItem('daily_goal')) || 3,
    showStreak: localStorage.getItem('show_streak') !== 'false',
    showHeatmap: localStorage.getItem('show_heatmap') !== 'false'
  };

  return (
    <AppProvider initialSettings={initialSettings}>
      <AppContent />
    </AppProvider>
  );
}

export default App;
