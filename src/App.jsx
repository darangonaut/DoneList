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
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import confetti from 'canvas-confetti';

const ACCENT_COLORS = [
  { id: 'orange', value: '#F97316' },
  { id: 'blue', value: '#007AFF' },
  { id: 'purple', value: '#AF52DE' },
  { id: 'green', value: '#34C759' },
  { id: 'pink', value: '#FF2D55' },
  { id: 'indigo', value: '#5856D6' }
];

const TAG_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'
];

const getTagColor = (tag) => {
  if (!tag) return '#888';
  let hash = 0;
  const tagStr = String(tag);
  for (let i = 0; i < tagStr.length; i++) {
    hash = tagStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
};

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

function LogItem({ log, onDelete, onUpdate, onTagClick, lang, t }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(log.text);
  const inputRef = useRef(null);
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-70, -20], [1, 0]);
  const scale = useTransform(x, [-70, -20], [1, 0.5]);
  useEffect(() => { if (isEditing && inputRef.current) inputRef.current.focus(); }, [isEditing]);
  const handleUpdate = () => { if (editText.trim() !== '' && editText !== log.text) onUpdate(log.id, editText); setIsEditing(false); };
  const handleKeyDown = (e) => { if (e.key === 'Enter') handleUpdate(); if (e.key === 'Escape') { setEditText(log.text); setIsEditing(false); } };
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp.seconds * 1000);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const yesterday = new Date(); yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return `${t.yesterday}, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    return `${date.toLocaleDateString(lang === 'sk' ? 'sk-SK' : 'en-US', { day: 'numeric', month: 'numeric', year: 'numeric' })}, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };
  const renderTextWithTags = (text) => {
    if (!text) return '';
    const parts = text.split(/(#\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('#')) {
        const color = getTagColor(part);
        return <span key={i} onClick={(e) => { e.stopPropagation(); if (onTagClick) onTagClick(part); }} className="inline-block px-2 py-0.5 rounded-md text-[14px] font-bold mx-0.5 cursor-pointer active:scale-90 transition-transform relative z-20" style={{ backgroundColor: `${color}20`, color: color }}>{part}</span>;
      }
      return part;
    });
  };
  return (
    <div className="relative overflow-hidden rounded-2xl mb-3">
      <motion.div style={{ opacity, scale }} className="absolute inset-y-0 right-0 w-20 bg-red-500 flex items-center justify-center"><button onClick={() => onDelete(log.id)} className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">−</button></motion.div>
      <motion.div drag={isEditing ? false : "x"} dragConstraints={{ left: -80, right: 0 }} dragElastic={0.1} style={{ x }} className="bg-apple-card p-4 border border-apple-border flex justify-between items-center relative z-10 rounded-2xl shadow-sm touch-pan-y"><div className="flex flex-col pr-4 flex-1 select-none text-apple-text">{isEditing ? <input ref={inputRef} type="text" value={editText} onChange={(e) => setEditText(e.target.value)} onBlur={handleUpdate} onKeyDown={handleKeyDown} className="bg-transparent border-none p-0 focus:ring-0 outline-none text-[17px] leading-tight font-normal w-full" /> : <div onClick={() => setIsEditing(true)} className="text-[17px] leading-tight font-normal cursor-text whitespace-pre-wrap break-words">{renderTextWithTags(log.text)}</div>}<span className="text-[13px] text-apple-secondary mt-1">{formatTimestamp(log.timestamp)}</span></div></motion.div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [limitCount, setLimitCount] = useState(20);
  const [hasMore, setHasMore] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'en');
  const [dailyStats, setDailyStats] = useState({});
  const [dailyTags, setDailyTags] = useState({});
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('cached_accent') || '#F97316');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [activeTagFilter, setActiveTagFilter] = useState(null);
  const inputRef = useRef(null);

  const streak = useMemo(() => calculateDynamicStreak(dailyStats), [dailyStats]);

  const triggerHaptic = (type = 'light') => {
    if (!window.navigator.vibrate) return;
    const patterns = { light: 10, medium: 20, success: [10, 30, 10] };
    window.navigator.vibrate(patterns[type] || 10);
  };

  useEffect(() => { getRedirectResult(auth).catch((e) => console.error("Redirect Error", e)); }, []);
  const t = translations[lang] || translations.sk;
  useEffect(() => { localStorage.setItem('lang', lang); }, [lang]);
  useEffect(() => { localStorage.setItem('cached_accent', accentColor); document.documentElement.style.setProperty('--accent-color', accentColor); }, [accentColor]);

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
            setDailyStats(currentCounts);
            setDailyTags(currentTags);
          } else {
            await setDoc(sRef, { dailyCounts: {}, dailyTags: {}, streak: 0 }, { merge: true });
          }
          setLoading(false);
        });
      } else { setLoading(false); }
    });
    return () => { unsubAuth(); unsubStats(); };
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'logs'), where('userId', '==', user.uid), limit(activeTagFilter ? 100 : limitCount));
    const unsub = onSnapshot(q, (sn) => {
      let d = sn.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (activeTagFilter) d = d.filter(log => log.text?.toLowerCase().includes(activeTagFilter.toLowerCase()) || (log.tags && log.tags.includes(activeTagFilter)));
      d = d.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setLogs(d);
      setHasMore(sn.docs.length >= limitCount && !activeTagFilter);
    });
    return unsub;
  }, [user, limitCount, activeTagFilter]);

  const heatmapData = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 139; i >= 0; i--) {
      const d = new Date(); d.setDate(today.getDate() - i);
      const key = getLocalDateKey(d);
      let dominantTagColor = null;
      const dayTags = dailyTags[key] || {};
      const tagEntries = Object.entries(dayTags);
      if (tagEntries.length > 0) {
        const topTag = tagEntries.sort((a, b) => b[1] - a[1])[0][0];
        dominantTagColor = getTagColor(topTag);
      }
      days.push({ key, count: dailyStats[key] || 0, color: dominantTagColor });
    }
    return days;
  }, [dailyStats, dailyTags]);

  const handleLogin = () => { setLoading(true); signInWithRedirect(auth, googleProvider); };
  const handleLogout = () => { setIsSettingsOpen(false); signOut(auth); };

  const addLog = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    triggerHaptic('light');
    const todayKey = getLocalDateKey();
    const foundTags = inputText.match(/#\w+/g) || [];
    const updatedDailyCounts = { ...dailyStats, [todayKey]: (dailyStats[todayKey] || 0) + 1 };
    const updatedDailyTags = { ...dailyTags, [todayKey]: { ...(dailyTags[todayKey] || {}) } };
    foundTags.forEach(tag => { updatedDailyTags[todayKey][tag] = (updatedDailyTags[todayKey][tag] || 0) + 1; });
    setDailyStats(updatedDailyCounts);
    setDailyTags(updatedDailyTags);
    setIsInputExpanded(false);
    try {
      await addDoc(collection(db, 'logs'), { userId: user.uid, text: inputText, tags: foundTags, timestamp: serverTimestamp() });
      const sRef = doc(db, 'userStats', user.uid);
      const newCalculatedStreak = calculateDynamicStreak(updatedDailyCounts);
      await setDoc(sRef, { dailyCounts: updatedDailyCounts, dailyTags: updatedDailyTags, lastDateKey: todayKey, streak: newCalculatedStreak, lastUpdate: serverTimestamp() }, { merge: true });
      if ([7, 30, 100].includes(newCalculatedStreak) && updatedDailyCounts[todayKey] === 1) {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        setFeedback(`WAAAU! ${newCalculatedStreak} dňová séria! 🏆`);
      } else { setFeedback(t.motivations[Math.floor(Math.random() * t.motivations.length)]); }
      setInputText('');
      setTimeout(() => setFeedback(''), 4000);
    } catch (e) { console.error(e); }
  };

  const toggleTagFilter = (tag) => { triggerHaptic('medium'); setActiveTagFilter(prev => prev === tag ? null : tag); };
  useEffect(() => { if (isInputExpanded && inputRef.current) inputRef.current.focus(); }, [isInputExpanded]);

  if (loading && !user) return <div className="min-h-screen bg-apple-bg"></div>;

  if (!user) return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white selection:bg-[var(--accent-color)]/30 overflow-y-auto scroll-smooth transition-colors duration-500">
      <div className="fixed inset-0 z-0 opacity-30 dark:opacity-40">
        <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0], x: [-100, 100, -100], y: [-50, 50, -50] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] rounded-full bg-orange-400 dark:bg-orange-600 blur-[120px]" />
        <motion.div animate={{ scale: [1.2, 1, 1.2], rotate: [0, -120, 0], x: [100, -100, 100], y: [50, -50, 50] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full bg-blue-400 dark:bg-blue-600 blur-[120px]" />
        <motion.div animate={{ scale: [1, 1.3, 1], x: [0, 50, 0], y: [0, 100, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-purple-400 dark:bg-purple-600 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-2xl mx-auto px-6 py-12">
        <section className="min-h-[70vh] flex flex-col items-center justify-center text-center mb-12">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="w-full flex flex-col items-center">
            <span className="inline-block px-3 py-1 rounded-full bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/20 text-[10px] font-bold uppercase tracking-[0.2em] mb-6 text-black/60 dark:text-white/60">{t.tagline}</span>
            <h1 className="text-7xl md:text-9xl font-black mb-6 tracking-tighter bg-gradient-to-b from-black dark:from-white to-black/40 dark:to-white/60 bg-clip-text text-transparent">{t.title}</h1>
            <p className="text-xl md:text-2xl text-black/60 dark:text-white/60 font-medium leading-relaxed max-w-lg mx-auto mb-10">{t.subtitle}</p>
            <button onClick={handleLogin} className="w-full max-w-sm bg-black dark:bg-white text-white dark:text-black py-5 rounded-[2rem] font-black text-xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 mx-auto">
              <svg className="w-7 h-7" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
              {t.login}
            </button>
          </motion.div>
        </section>

        <section className="py-16 border-t border-black/5 dark:border-white/10 overflow-hidden text-center">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-12">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-2">{t.scienceTitle}</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-black/[0.02] dark:bg-white/5 p-6 md:p-8 rounded-[2rem] border border-black/[0.05] dark:border-white/10 flex flex-col h-[400px]">
              <h3 className="text-lg font-bold mb-10 opacity-80">{t.graph1Title}</h3>
              <div className="flex-1 flex items-end justify-around gap-4 relative px-4 border-b border-black/10 dark:border-white/10 pb-8">
                <div className="flex-1 flex flex-col items-center gap-6 h-full justify-end relative">
                  <div className="w-full flex justify-center items-end gap-1.5 h-full">
                    <motion.div initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ duration: 1.5, ease: "circOut" }} style={{ originY: 1 }} className="w-8 md:w-10 bg-red-500 rounded-t-xl h-[70%]" />
                    <motion.div initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ duration: 1.5, ease: "circOut", delay: 0.2 }} style={{ originY: 1 }} className="w-8 md:w-10 bg-[var(--accent-color)]/30 rounded-t-xl h-[20%]" />
                  </div>
                  <div className="absolute -bottom-8 w-full"><span className="text-[9px] font-black uppercase tracking-widest opacity-40 block">{t.graph1Before}</span></div>
                </div>
                <div className="flex-1 flex flex-col items-center gap-6 h-full justify-end relative">
                  <div className="w-full flex justify-center items-end gap-1.5 h-full">
                    <motion.div initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ duration: 1.5, ease: "circOut", delay: 0.4 }} style={{ originY: 1 }} className="w-8 md:w-10 bg-red-500/20 rounded-t-xl h-[15%]" />
                    <motion.div initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ duration: 1.5, ease: "circOut", delay: 0.6 }} style={{ originY: 1 }} className="w-8 md:w-10 bg-[var(--accent-color)] rounded-t-xl h-[95%] shadow-[0_0_40px_var(--accent-color)]" />
                  </div>
                  <div className="absolute -bottom-8 w-full"><span className="text-[9px] font-black uppercase tracking-widest block">{t.graph1After}</span></div>
                </div>
              </div>
              <div className="mt-12 flex justify-center gap-6 text-[9px] font-bold uppercase tracking-widest opacity-50">
                <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red-500" />{t.graph1Failures}</span>
                <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[var(--accent-color)]" />{t.graph1Successes}</span>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-black/[0.02] dark:bg-white/5 p-6 md:p-8 rounded-[2rem] border border-black/[0.05] dark:border-white/10 flex flex-col h-[400px] relative overflow-hidden text-center">
              <h3 className="text-lg font-bold mb-2 opacity-80">{t.graph2Title}</h3>
              <p className="text-xs opacity-40 mb-10">{t.graph2Desc}</p>
              <div className="flex-1 relative mt-10 border-b border-black/10 dark:border-white/10 mb-8">
                <svg viewBox="0 0 200 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGradientMain" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-color)" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="var(--accent-color)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <motion.path d="M0,95 C40,90 60,70 100,50 S160,10 200,5" fill="none" stroke="var(--accent-color)" strokeWidth="6" strokeLinecap="round" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} transition={{ duration: 2.5, ease: "easeInOut" }} />
                  <motion.path d="M0,95 C40,90 60,70 100,50 S160,10 200,5 L200,100 L0,100 Z" fill="url(#chartGradientMain)" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 1.5, delay: 1 }} />
                </svg>
              </div>
              <div className="flex justify-between text-[9px] font-black uppercase tracking-[0.3em] opacity-30 mt-2"><span>Day 1</span><span>Day 100</span></div>
            </motion.div>
          </div>
        </section>

        <section className="py-16 border-t border-black/5 dark:border-white/10">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center max-w-lg mx-auto mb-12">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">{t.promoTitle}</h2>
            <p className="text-lg text-black/40 dark:text-white/50 leading-relaxed italic">"{t.promoIntro}"</p>
          </motion.div>

          <div className="grid gap-6">
            {[
              { icon: '🧠', title: t.promo1Title, desc: t.promo1Desc },
              { icon: '⚡️', title: t.promo2Title, desc: t.promo2Desc },
              { icon: '📈', title: t.promo3Title, desc: t.promo3Desc },
              { icon: '⛽️', title: t.promo4Title, desc: t.promo4Desc }
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="bg-black/[0.03] dark:bg-white/5 border border-black/[0.05] dark:border-white/10 p-6 md:p-8 rounded-[2rem] flex flex-col md:flex-row gap-6 items-start transition-colors text-left">
                <span className="text-4xl shrink-0">{item.icon}</span>
                <div>
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-black/50 dark:text-white/50 text-[17px] leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="py-16 border-t border-black/5 dark:border-white/10 w-full text-center">
          <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="text-2xl font-bold mb-10">{t.appTitle}</motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left mb-12">
            {[t.appItem1, t.appItem2, t.appItem3].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-black/[0.03] dark:bg-white/5 p-5 rounded-2xl border border-black/[0.05] dark:border-white/10 text-center"><p className="font-bold text-[15px]">⚡️ {item}</p></motion.div>
            ))}
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-[var(--accent-color)]/10 border border-[var(--accent-color)]/20 p-6 md:p-8 rounded-[2rem] max-w-lg mx-auto">
            <h3 className="text-lg font-bold mb-2 text-[var(--accent-color)]">{t.tipTitle}</h3>
            <p className="text-black/60 dark:text-white/70 text-[17px] leading-relaxed">{t.tipDesc}</p>
          </motion.div>
        </section>

        <section className="py-16 text-center">
          <button onClick={handleLogin} className="w-full max-w-sm bg-black dark:bg-white text-white dark:text-black py-5 rounded-[2rem] font-black text-xl shadow-2xl active:scale-95 transition-all mb-10 mx-auto block">{t.login}</button>
          <div className="flex justify-center gap-10">
            <button onClick={() => setLang('sk')} className={`text-xs font-bold tracking-[0.4em] uppercase transition-colors ${lang === 'sk' ? 'text-black dark:text-white' : 'text-black/30 dark:text-white/30'}`}>Slovenčina</button>
            <button onClick={() => setLang('en')} className={`text-xs font-bold tracking-[0.4em] uppercase transition-colors ${lang === 'en' ? 'text-black dark:text-white' : 'text-black/30 dark:text-white/30'}`}>English</button>
          </div>
        </section>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-apple-bg text-apple-text pb-32 transition-all duration-500 selection:bg-[var(--accent-color)] selection:text-white">
      <AnimatePresence>{feedback && (<motion.div initial={{ y: -100, x: '-50%', opacity: 0 }} animate={{ y: 0, x: '-50%', opacity: 1 }} exit={{ y: -100, x: '-50%', opacity: 0 }} className="fixed top-8 left-1/2 z-[110] pointer-events-none"><div className="bg-apple-card border border-apple-border px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 text-apple-text"><span>✨</span><p className="text-[15px] font-semibold whitespace-nowrap">{feedback}</p></div></motion.div>)}</AnimatePresence>
      <header className="px-6 pt-12 pb-6 sticky top-0 bg-apple-bg/80 backdrop-blur-md z-30 border-b border-apple-border/50">
        <div className="max-w-xl mx-auto">
          <div className="flex justify-between items-end mb-8"><motion.div layout><div className="flex items-center gap-2 mb-1"><p className="text-xs font-semibold text-apple-secondary uppercase tracking-widest">{new Date().toLocaleDateString(lang === 'sk' ? 'sk-SK' : 'en-US', { day: 'numeric', month: 'long' })}</p><AnimatePresence mode="wait">{streak > 0 && (<motion.span key={streak} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-1 text-sm font-bold bg-[var(--accent-color)]/10 text-[var(--accent-color)] px-2 py-0.5 rounded-full border border-[var(--accent-color)]/20 shadow-sm">🔥 {streak}</motion.span>)}</AnimatePresence></div><h1 className="text-4xl font-bold tracking-tight">{activeTagFilter ? <span className="flex items-center gap-2">Focus: <span style={{ color: getTagColor(activeTagFilter) }}>{activeTagFilter}</span></span> : t.title}</h1></motion.div><button onClick={() => setIsSettingsOpen(true)} className="active:scale-90 transition-transform">{user?.photoURL ? <img src={user.photoURL} alt="P" className="w-10 h-10 rounded-full border border-apple-border shadow-sm" /> : <div className="w-10 h-10 rounded-full bg-apple-card border border-apple-border flex items-center justify-center">👤</div>}</button></div>
          <div className="flex flex-wrap gap-[4px] justify-center overflow-x-auto pb-4 px-2">{heatmapData.map((day) => { const intensity = Math.min(day.count, 4); const opacity = intensity === 0 ? 0.1 : 0.25 + (intensity * 0.18); const isFilteredTag = activeTagFilter && day.color === getTagColor(activeTagFilter); const bgColor = day.color && intensity > 0 ? day.color : (intensity > 0 ? 'var(--accent-color)' : 'currentColor'); return <div key={day.key} className={`w-[11px] h-[11px] rounded-[2.5px] shrink-0 transition-all duration-700 ${activeTagFilter && !isFilteredTag ? 'grayscale opacity-5' : ''}`} style={{ backgroundColor: bgColor, opacity: activeTagFilter && !isFilteredTag ? 0.05 : opacity }} />; })}</div>
          <AnimatePresence>{activeTagFilter && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex justify-center mt-4"><button onClick={() => setActiveTagFilter(null)} className="text-xs font-bold bg-apple-card border border-apple-border px-4 py-1.5 rounded-full shadow-sm text-apple-secondary active:scale-95 transition-all">✕ Zrušiť filter</button></motion.div>)}</AnimatePresence>
        </div>
      </header>
      <main className="max-w-xl mx-auto px-6 mt-6 overflow-x-hidden"><motion.div layout className="space-y-0"><AnimatePresence mode="popLayout">{logs.map((log) => (<motion.div key={log.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}><LogItem log={log} onDelete={() => deleteDoc(doc(db, 'logs', log.id))} onUpdate={(id, txt) => updateDoc(doc(db, 'logs', id), { text: txt })} onTagClick={toggleTagFilter} lang={lang} t={t} /></motion.div>))}</AnimatePresence>{logs.length === 0 && !loading && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 text-apple-secondary font-medium italic">{activeTagFilter ? `Nenašiel som žiadne záznamy s ${activeTagFilter}` : t.noLogs}</motion.div>}</motion.div>{hasMore && logs.length > 0 && !activeTagFilter && <div className="flex justify-center mt-6"><button onClick={() => setLimitCount(prev => prev + 20)} className="text-sm font-semibold text-apple-secondary active:opacity-50">{t.loadMore}</button></div>}</main>
      <div className="fixed inset-0 flex items-center justify-center z-[120] pointer-events-none"><AnimatePresence>{!isInputExpanded ? (<motion.button key="fab" layoutId="fab-container" onClick={() => { triggerHaptic('light'); setIsInputExpanded(true); }} style={{ backgroundColor: accentColor, bottom: '2.5rem', position: 'fixed', borderRadius: '100px' }} className="w-16 h-16 shadow-[0_15px_30px_rgba(0,0,0,0.2)] flex items-center justify-center text-white text-4xl pointer-events-auto" transition={{ type: 'spring', damping: 25, stiffness: 200 }}>+</motion.button>) : (<motion.div key="expanded" layoutId="fab-container" className="fixed inset-0 bg-apple-bg flex flex-col items-center justify-center p-8 pointer-events-auto" style={{ borderRadius: '0px' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}><div className="w-full max-w-lg relative"><button onClick={() => setIsInputExpanded(false)} className="absolute -top-32 right-0 text-apple-secondary font-bold text-lg p-4 active:opacity-50">{t.back}</button><form onSubmit={addLog} className="w-full space-y-8"><textarea ref={inputRef} value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder={t.placeholder} className="w-full bg-transparent border-none text-3xl md:text-4xl font-bold text-apple-text placeholder:text-apple-secondary/30 focus:ring-0 outline-none resize-none min-h-[200px]" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addLog(); } if (e.key === 'Escape') setIsInputExpanded(false); }} /><button type="submit" style={{ backgroundColor: accentColor }} className="w-full py-5 rounded-[2rem] text-white font-black text-xl shadow-2xl active:scale-95 transition-all">{lang === 'sk' ? 'Uložiť víťazstvo' : 'Save Victory'}</button></form></div></motion.div>)}</AnimatePresence></div>
      {isSettingsOpen && (<AnimatePresence><motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed inset-0 bg-apple-bg z-[150] px-6 pt-12 overflow-y-auto pb-20"><div className="max-w-xl mx-auto"><div className="flex justify-between items-center mb-10"><h2 className="text-3xl font-bold tracking-tight">{t.settings}</h2><button onClick={() => setIsSettingsOpen(false)} className="text-blue-500 font-semibold text-[17px]">{t.back}</button></div><div className="space-y-8"><div><p className="text-[13px] text-apple-secondary uppercase tracking-wider mb-2 ml-4">{t.account}</p><div className="bg-apple-card rounded-2xl border border-apple-border overflow-hidden"><div className="p-4 flex items-center gap-4">{user.photoURL && <img src={user.photoURL} className="w-12 h-12 rounded-full" alt="Avatar" />}<div><p className="font-bold text-[17px]">{user.displayName}</p><p className="text-apple-secondary text-[14px]">{user.email}</p></div></div></div></div><div><p className="text-[13px] text-apple-secondary uppercase tracking-wider mb-2 ml-4">{t.accentColor}</p><div className="bg-apple-card rounded-2xl border border-apple-border p-5"><div className="grid grid-cols-6 gap-2">{ACCENT_COLORS.map(color => (<button key={color.id} onClick={() => setAccentColor(color.value)} className={`aspect-square rounded-full border-2 transition-all ${accentColor === color.value ? 'border-apple-text scale-110' : 'border-transparent'}`} style={{ backgroundColor: color.value }} />))}</div></div></div><button onClick={handleLogout} className="w-full bg-apple-card rounded-2xl border border-apple-border p-4 text-red-500 font-bold text-[17px] active:bg-red-500/10">{t.logout}</button></div></div></motion.div></AnimatePresence>)}
    </div>
  );
}

export default App;