import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { auth, googleProvider, db } from './firebase';
import { 
  signInWithRedirect, 
  getRedirectResult, 
  onAuthStateChanged, 
  signOut,
  setPersistence,
  indexedDBLocalPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { 
  collection, 
  getDocs,
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  deleteDoc, 
  updateDoc,
  doc, 
  getDoc,
  setDoc,
  serverTimestamp,
  limit,
  writeBatch
} from 'firebase/firestore';
import { translations } from './translations';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

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

const getLocalDateKey = (date = new Date()) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const calculateDynamicStreak = (counts) => {
  if (!counts || Object.keys(counts).length === 0) return 0;
  let currentStreak = 0;
  let dateToTrace = new Date();
  dateToTrace.setHours(0, 0, 0, 0);
  const todayKey = getLocalDateKey(dateToTrace);
  const yesterday = new Date(dateToTrace);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getLocalDateKey(yesterday);
  if (!counts[todayKey] && !counts[yesterdayKey]) return 0;
  if (!counts[todayKey]) dateToTrace = yesterday;
  while (true) {
    const key = getLocalDateKey(dateToTrace);
    if (counts[key] && counts[key] > 0) {
      currentStreak++;
      dateToTrace.setDate(dateToTrace.getDate() - 1);
    } else { break; }
  }
  return currentStreak;
};

const getTagColor = (tag) => {
  if (!tag) return '#888';
  let hash = 0;
  const tagStr = String(tag);
  const TAG_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];
  for (let i = 0; i < tagStr.length; i++) { hash = tagStr.charCodeAt(i) + ((hash << 5) - hash); }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
};

function App() {
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [limitCount, setLimitCount] = useState(20);
  const [hasMore, setHasMore] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem('lang');
    if (saved) return saved;
    return navigator.language.startsWith('sk') ? 'sk' : 'en';
  });
  const [dailyStats, setDailyStats] = useState(() => JSON.parse(localStorage.getItem('cached_stats')) || {});
  const [dailyTags, setDailyTags] = useState(() => JSON.parse(localStorage.getItem('cached_tags')) || {});
  
  // Settings States
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('cached_accent') || '#F97316');
  const [showStreak, setShowStreak] = useState(() => localStorage.getItem('show_streak') !== 'false');
  const [showHeatmap, setShowHeatmap] = useState(() => localStorage.getItem('show_heatmap') !== 'false');
  const [hapticEnabled, setHapticEnabled] = useState(() => localStorage.getItem('haptic_enabled') !== 'false');
  const [dailyGoal, setDailyGoal] = useState(() => parseInt(localStorage.getItem('daily_goal')) || 3);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [activeTagFilter, setActiveTagFilter] = useState(null);
  const [reflectionType, setReflectionType] = useState(null); 
  const [sharingLog, setSharingLog] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Protection flag
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [memoryLog, setMemoryLog] = useState(null);
  const inputRef = useRef(null);

  const t = translations[lang] || translations.sk;
  const streak = useMemo(() => calculateDynamicStreak(dailyStats), [dailyStats]);
  
  const todayLogs = useMemo(() => {
    const today = new Date().toDateString();
    return logs.filter(log => log.timestamp && new Date(log.timestamp.seconds * 1000).toDateString() === today);
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

  const triggerHaptic = (type = 'light') => {
    if (!hapticEnabled || !window.navigator.vibrate) return;
    const patterns = { light: 10, medium: 20, success: [10, 30, 10] };
    window.navigator.vibrate(patterns[type] || 10);
    playUISound(type);
  };

  const playUISound = (type) => {
    if (!hapticEnabled) return; // Using haptic setting as master switch for now
    
    const sounds = {
      light: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', // Subtle click
      medium: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', // Pop
      success: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3' // Sparkle/Chime
    };

    const audio = new Audio(sounds[type]);
    audio.volume = type === 'success' ? 0.3 : 0.15;
    audio.play().catch(() => {}); // Ignore blocked autoplay
  };

  const handleLogin = async () => { 
    setLoading(true); 
    try {
      await setPersistence(auth, indexedDBLocalPersistence);
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
    // We keep visual settings but clear user data
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
      setDailyStats({}); setDailyTags({}); setLogs([]);
      setFeedback('História bola vymazaná. Čistý štít! ✨');
      setTimeout(() => setFeedback(''), 4000);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { 
    localStorage.setItem('lang', lang); 
    localStorage.setItem('cached_accent', accentColor); 
    localStorage.setItem('show_streak', showStreak);
    localStorage.setItem('show_heatmap', showHeatmap);
    localStorage.setItem('haptic_enabled', hapticEnabled);
    localStorage.setItem('daily_goal', dailyGoal);
    document.documentElement.style.setProperty('--accent-color', accentColor); 
  }, [accentColor, lang, showStreak, showHeatmap, hapticEnabled, dailyGoal]);

  // Sync settings to server ONLY when user is logged in AND initial load from server is done
  useEffect(() => {
    if (user && !isInitialLoad) {
      setDoc(doc(db, 'userStats', user.uid), { 
        showStreak, 
        showHeatmap, 
        hapticEnabled, 
        dailyGoal,
        accentColor,
        lang 
      }, { merge: true });
    }
  }, [showStreak, showHeatmap, hapticEnabled, dailyGoal, accentColor, lang, user, isInitialLoad]);

  useEffect(() => {
    const handleUpdateAvailable = () => setUpdateAvailable(true);
    window.addEventListener('pwa-update-available', handleUpdateAvailable);
    return () => window.removeEventListener('pwa-update-available', handleUpdateAvailable);
  }, []);

  // Robust Auth Handling for PWA Redirects
  useEffect(() => {
    let unsubStats = () => {};
    let authUnsub = () => {};

    const initAuth = async () => {
      // 1. Check if we have a redirect result PENDING
      try {
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult?.user) {
          console.log("Recovered user from redirect:", redirectResult.user.email);
          // Don't set user here manually, let onAuthStateChanged handle it to ensure consistent state
          // but we know a user IS coming, so we could theoretically keep loading true
        }
      } catch (e) {
        console.error("Redirect check error:", e);
      }

      // 2. Listen for auth changes
      authUnsub = onAuthStateChanged(auth, async (u) => {
        setUser(u);
        if (u) {
          const sRef = doc(db, 'userStats', u.uid);
          unsubStats = onSnapshot(sRef, async (s) => {
            if (s.exists()) {
              const data = s.data();
              if (data.showStreak !== undefined) setShowStreak(data.showStreak);
              if (data.showHeatmap !== undefined) setShowHeatmap(data.showHeatmap);
              if (data.hapticEnabled !== undefined) setHapticEnabled(data.hapticEnabled);
              if (data.dailyGoal !== undefined) setDailyGoal(data.dailyGoal);
              if (data.accentColor !== undefined) setAccentColor(data.accentColor);
              if (data.lang !== undefined) setLang(data.lang);
              
              setDailyStats(data.dailyCounts || {});
              setDailyTags(data.dailyTags || {});
            } else { 
              await setDoc(sRef, { 
                dailyCounts: {}, 
                dailyTags: {}, 
                streak: 0, 
                showStreak: true, 
                showHeatmap: true, 
                hapticEnabled: true, 
                dailyGoal: 3,
                accentColor: '#F97316'
              }, { merge: true }); 
            }
            setIsInitialLoad(false);
            setLoading(false);
          });
        } else { 
          // If no user found via listener, ensure we aren't still processing a redirect
          setIsInitialLoad(false);
          setLoading(false); 
        }
      });
    };

    initAuth();

    return () => { 
      if (authUnsub) authUnsub(); 
      if (unsubStats) unsubStats(); 
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'logs'), where('userId', '==', user.uid), limit(activeTagFilter ? 100 : 50));
    const unsub = onSnapshot(q, (sn) => {
      let d = sn.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (activeTagFilter) d = d.filter(log => log.text?.toLowerCase().includes(activeTagFilter.toLowerCase()) || (log.tags && log.tags.includes(activeTagFilter)));
      const sorted = d.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setLogs(sorted);

      // Select a memory log only if we don't have one and we have enough data
      setMemoryLog(prev => {
        if (prev || sorted.length < 3) return prev;

        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
        
        let candidates = sorted.filter(l => l.timestamp && new Date(l.timestamp.seconds * 1000) < weekAgo);
        if (candidates.length === 0) {
          candidates = sorted.filter(l => l.timestamp && new Date(l.timestamp.seconds * 1000) < twoDaysAgo);
        }

        if (candidates.length > 0) {
          // Prioritize top moments
          const topMoments = candidates.filter(l => l.isTopWin || l.isWeeklyTop || l.isMonthlyTop);
          const pool = topMoments.length > 0 ? topMoments : candidates;
          return pool[Math.floor(Math.random() * pool.length)];
        }
        return null;
      });
    });
    return unsub;
  }, [user, activeTagFilter]);

  const addLog = async (e) => {
    if (e) e.preventDefault(); if (!inputText.trim()) return;
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    triggerHaptic('light');
    const todayKey = getLocalDateKey();
    const foundTags = inputText.match(/#\w+/g) || [];
    const updatedDailyCounts = { ...dailyStats, [todayKey]: (dailyStats[todayKey] || 0) + 1 };
    const updatedDailyTags = { ...dailyTags, [todayKey]: { ...(dailyTags[todayKey] || {}) } };
    foundTags.forEach(tag => { updatedDailyTags[todayKey][tag] = (updatedDailyTags[todayKey][tag] || 0) + 1; });
    setDailyStats(updatedDailyCounts); setDailyTags(updatedDailyTags); setIsInputExpanded(false);
    try {
      await addDoc(collection(db, 'logs'), { userId: user.uid, text: inputText, tags: foundTags, timestamp: serverTimestamp(), isTopWin: false, isWeeklyTop: false, isMonthlyTop: false });
      const sRef = doc(db, 'userStats', user.uid);
      const newCalculatedStreak = calculateDynamicStreak(updatedDailyCounts);
      await setDoc(sRef, { dailyCounts: updatedDailyCounts, dailyTags: updatedDailyTags, streak: newCalculatedStreak, lastUpdate: serverTimestamp() }, { merge: true });
      
      const countToday = updatedDailyCounts[todayKey];
      if (countToday === dailyGoal) {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: [accentColor, '#FFFFFF'] });
        const celebrateAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2018-preview.mp3');
        celebrateAudio.volume = 0.4;
        celebrateAudio.play().catch(() => {});
        setFeedback(t.goalReached);
      } else if ([7, 30, 100].includes(newCalculatedStreak) && countToday === 1) {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        setFeedback(`WAAAU! ${newCalculatedStreak} dňová séria! 🏆`);
      } else {
        setFeedback(t.motivations[Math.floor(Math.random() * t.motivations.length)]);
      }
      setInputText(''); setTimeout(() => setFeedback(''), 4000);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (log) => {
    const isSpecial = log.isTopWin || log.isWeeklyTop || log.isMonthlyTop;
    triggerHaptic(isSpecial ? 'medium' : 'light');
    const logDateKey = getLocalDateKey(log.timestamp.toDate());
    const updatedDailyCounts = { ...dailyStats };
    if (updatedDailyCounts[logDateKey] > 0) { updatedDailyCounts[logDateKey] -= 1; if (updatedDailyCounts[logDateKey] === 0) delete updatedDailyCounts[logDateKey]; }
    const updatedDailyTags = { ...dailyTags };
    if (log.tags && updatedDailyTags[logDateKey]) { log.tags.forEach(tag => { if (updatedDailyTags[logDateKey][tag] > 0) { updatedDailyTags[logDateKey][tag] -= 1; if (updatedDailyTags[logDateKey][tag] === 0) delete updatedDailyTags[logDateKey][tag]; } }); if (Object.keys(updatedDailyTags[logDateKey]).length === 0) delete updatedDailyTags[logDateKey]; }
    try { await deleteDoc(doc(db, 'logs', log.id)); const sRef = doc(db, 'userStats', user.uid); await setDoc(sRef, { dailyCounts: updatedDailyCounts, dailyTags: updatedDailyTags, streak: calculateDynamicStreak(updatedDailyCounts) }, { merge: true }); setDailyStats(updatedDailyCounts); setDailyTags(updatedDailyTags); } catch (e) { console.error(e); }
  };

  const selectTopWin = async (logId) => {
    triggerHaptic('success');
    const field = reflectionType === 'daily' ? 'isTopWin' : reflectionType === 'weekly' ? 'isWeeklyTop' : 'isMonthlyTop';
    const confColors = reflectionType === 'daily' ? ['#FFD700'] : reflectionType === 'weekly' ? ['#60A5FA'] : ['#A855F7'];
    const message = reflectionType === 'daily' ? t.reflectionDone : reflectionType === 'weekly' ? t.weeklyDone : t.monthlyDone;
    try {
      const oldTops = logs.filter(l => l[field]);
      for (const old of oldTops) { if (old.id !== logId) await updateDoc(doc(db, 'logs', old.id), { [field]: false }); }
      await updateDoc(doc(db, 'logs', logId), { [field]: true });
      setReflectionType(null); confetti({ particleCount: 150, spread: 60, origin: { y: 0.8 }, colors: confColors }); setFeedback(message); setTimeout(() => setFeedback(''), 4000);
    } catch (e) { console.error(e); }
  };

  const heatmapData = useMemo(() => {
    const days = []; const today = new Date();
    for (let i = 139; i >= 0; i--) {
      const d = new Date(); d.setDate(today.getDate() - i); const key = getLocalDateKey(d);
      let dominantTagColor = null; const dayTags = dailyTags[key] || {}; const tagEntries = Object.entries(dayTags);
      if (tagEntries.length > 0) { const topTag = tagEntries.sort((a, b) => b[1] - a[1])[0][0]; dominantTagColor = getTagColor(topTag); }
      days.push({ key, count: dailyStats[key] || 0, color: dominantTagColor });
    }
    return days;
  }, [dailyStats, dailyTags]);

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-apple-bg flex flex-col items-center justify-center transition-colors duration-500">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent-color)] shadow-xl flex items-center justify-center text-white text-3xl font-bold">
            D
          </div>
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
        <LandingPage t={t} lang={lang} setLang={setLang} handleLogin={handleLogin} />
      ) : (
        <div className="min-h-screen bg-apple-bg transition-colors duration-500">
          <BackgroundBlobs accentColor={accentColor} />
          
          <Dashboard 
            user={user} logs={logs} streak={streak} heatmapData={heatmapData} 
            t={t} lang={lang} activeTagFilter={activeTagFilter} 
            setActiveTagFilter={setActiveTagFilter} getTagColor={getTagColor}
            isEvening={isEvening} isSunday={isSunday} isLastDayOfMonth={isLastDayOfMonth}
            hasDailyTop={hasDailyTop} hasWeeklyTop={hasWeeklyTop} hasMonthlyTop={hasMonthlyTop}
            setIsSettingsOpen={setIsSettingsOpen} setReflectionType={setReflectionType}
            setIsAIModalOpen={setIsAIModalOpen}
            handleDelete={handleDelete} updateDoc={updateDoc} db={db} doc={doc}
            isInputExpanded={isInputExpanded} setIsInputExpanded={setIsInputExpanded}
            inputText={inputText} setInputText={setInputText} addLog={addLog}
            inputRef={inputRef} accentColor={accentColor} triggerHaptic={triggerHaptic}
            hasMore={hasMore} setLimitCount={setLimitCount}
            onShare={(log) => setSharingLog(log)}
            showStreak={showStreak} showHeatmap={showHeatmap} dailyGoal={dailyGoal}
            memoryLog={memoryLog}
          />

          <Suspense fallback={<ModalLoading />}>
            <SettingsModal 
              isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}
              user={user} t={t} lang={lang} setLang={setLang}
              accentColor={accentColor} setAccentColor={setAccentColor}
              handleLogout={handleLogout}
              showStreak={showStreak} setShowStreak={setShowStreak}
              showHeatmap={showHeatmap} setShowHeatmap={setShowHeatmap}
              hapticEnabled={hapticEnabled} setHapticEnabled={setHapticEnabled}
              dailyGoal={dailyGoal} setDailyGoal={setDailyGoal}
              exportData={exportData} deleteAllData={deleteAllData}
              updateAvailable={updateAvailable}
              onUpdate={() => window.manualPwaUpdate()}
            />

            <ReflectionModal 
              isOpen={!!reflectionType} type={reflectionType}
              candidates={candidates} onSelect={selectTopWin}
              onClose={() => setReflectionType(null)} t={t} lang={lang}
              getTagColor={getTagColor}
              formatTimestamp={(ts) => {
                if (!ts) return '';
                const date = new Date(ts.seconds * 1000);
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              }}
            />

            <VictoryCard 
              isOpen={!!sharingLog} log={sharingLog} 
              onClose={() => setSharingLog(null)} t={t} 
              accentColor={accentColor} 
            />

            <AIInsightModal 
              isOpen={isAIModalOpen} 
              onClose={() => setIsAIModalOpen(false)}
              logs={logs} t={t} lang={lang} 
              accentColor={accentColor}
            />
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

export default App;