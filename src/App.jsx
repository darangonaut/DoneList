import React, { useState, useEffect, useMemo, useRef } from 'react';
import { auth, googleProvider, db } from './firebase';
import { 
  signInWithRedirect, 
  getRedirectResult, 
  onAuthStateChanged, 
  signOut 
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
  limit 
} from 'firebase/firestore';
import { translations } from './translations';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

// Components
import { BackgroundBlobs } from './components/BackgroundBlobs';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { SettingsModal } from './components/SettingsModal';
import { ReflectionModal } from './components/ReflectionModal';
import { VictoryCard } from './components/VictoryCard';

const getLocalDateKey = (date = new Date()) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getYesterdayKey = () => {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return getLocalDateKey(d);
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
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'en');
  const [dailyStats, setDailyStats] = useState(() => JSON.parse(localStorage.getItem('cached_stats')) || {});
  const [dailyTags, setDailyTags] = useState(() => JSON.parse(localStorage.getItem('cached_tags')) || {});
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('cached_accent') || '#F97316');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [activeTagFilter, setActiveTagFilter] = useState(null);
  const [reflectionType, setReflectionType] = useState(null); 
  const [sharingLog, setSharingLog] = useState(null);
  const inputRef = useRef(null);

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
    if (!window.navigator.vibrate) return;
    const patterns = { light: 10, medium: 20, success: [10, 30, 10] };
    window.navigator.vibrate(patterns[type] || 10);
  };

  useEffect(() => { getRedirectResult(auth).catch((e) => console.error("Redirect Error", e)); }, []);
  const t = translations[lang] || translations.sk;
  useEffect(() => { localStorage.setItem('lang', lang); }, [lang]);
  useEffect(() => { 
    localStorage.setItem('cached_accent', accentColor); 
    document.documentElement.style.setProperty('--accent-color', accentColor); 
  }, [accentColor]);

  useEffect(() => {
    let unsubStats = () => {};
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const sRef = doc(db, 'userStats', u.uid);
        unsubStats = onSnapshot(sRef, async (s) => {
          if (s.exists()) {
            const data = s.data();
            let currentCounts = data.dailyCounts || {};
            let currentTags = data.dailyTags || {};
            const logsSnap = await getDocs(query(collection(db, 'logs'), where('userId', '==', u.uid), limit(150)));
            let healed = false;
            logsSnap.forEach(l => {
              const ld = l.data();
              if (ld.timestamp) {
                const key = getLocalDateKey(ld.timestamp.toDate());
                if (!currentCounts[key]) { currentCounts[key] = 1; healed = true; }
                if (ld.tags) ld.tags.forEach(tg => { if (!currentTags[key]) currentTags[key] = {}; if (!currentTags[key][tg]) { currentTags[key][tg] = 1; healed = true; } });
              }
            });
            if (healed) await setDoc(sRef, { dailyCounts: currentCounts, dailyTags: currentTags }, { merge: true });
            setDailyStats(currentCounts); setDailyTags(currentTags);
            localStorage.setItem('cached_stats', JSON.stringify(currentCounts));
            localStorage.setItem('cached_tags', JSON.stringify(currentTags));
          } else { await setDoc(sRef, { dailyCounts: {}, dailyTags: {}, streak: 0 }, { merge: true }); }
          setLoading(false);
        });
      } else { setLoading(false); }
    });
    return () => { unsubAuth(); unsubStats(); };
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'logs'), where('userId', '==', user.uid), limit(activeTagFilter ? 100 : 50));
    const unsub = onSnapshot(q, (sn) => {
      let d = sn.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (activeTagFilter) d = d.filter(log => log.text?.toLowerCase().includes(activeTagFilter.toLowerCase()) || (log.tags && log.tags.includes(activeTagFilter)));
      d = d.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setLogs(d);
    });
    return unsub;
  }, [user, activeTagFilter]);

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

  const handleLogin = () => { setLoading(true); signInWithRedirect(auth, googleProvider); };
  const handleLogout = () => { setIsSettingsOpen(false); signOut(auth); };

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
      await setDoc(sRef, { dailyCounts: updatedDailyCounts, dailyTags: updatedDailyTags, lastDateKey: todayKey, streak: newCalculatedStreak, lastUpdate: serverTimestamp() }, { merge: true });
      if ([7, 30, 100].includes(newCalculatedStreak) && updatedDailyCounts[todayKey] === 1) { confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } }); setFeedback(`WAAAU! ${newCalculatedStreak} dňová séria! 🏆`); } else { setFeedback(t.motivations[Math.floor(Math.random() * t.motivations.length)]); }
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

  if (loading && !user) return <div className="min-h-screen bg-apple-bg transition-colors duration-500"></div>;

  return (
    <div className="min-h-screen bg-apple-bg transition-colors duration-500 selection:bg-[var(--accent-color)] selection:text-white relative">
      {!user ? (
        <LandingPage 
          t={t} 
          lang={lang} 
          setLang={setLang} 
          handleLogin={handleLogin} 
        />
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
            handleDelete={handleDelete} updateDoc={updateDoc} db={db} doc={doc}
            isInputExpanded={isInputExpanded} setIsInputExpanded={setIsInputExpanded}
            inputText={inputText} setInputText={setInputText} addLog={addLog}
            inputRef={inputRef} accentColor={accentColor} triggerHaptic={triggerHaptic}
            hasMore={hasMore} setLimitCount={setLimitCount}
            onShare={(log) => setSharingLog(log)}
          />

          <SettingsModal 
            isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}
            user={user} t={t} lang={lang} setLang={setLang}
            accentColor={accentColor} setAccentColor={setAccentColor}
            handleLogout={handleLogout}
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
        </div>
      )}
      
      <AnimatePresence>
        {feedback && (
          <motion.div 
            initial={{ y: -100, x: '-50%', opacity: 0 }} 
            animate={{ y: 0, x: '-50%', opacity: 1 }} 
            exit={{ y: -100, x: '-50%', opacity: 0 }} 
            className="fixed top-8 left-1/2 z-[300] pointer-events-none"
          >
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