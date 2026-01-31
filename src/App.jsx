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

function LogItem({ log, onDelete, onUpdate, onTagClick, lang, t }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(log.text);
  const inputRef = useRef(null);
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-70, -20], [1, 0]);
  const scale = useTransform(x, [-70, -20], [1, 0.5]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleUpdate = () => {
    if (editText.trim() !== '' && editText !== log.text) {
      onUpdate(log.id, editText);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleUpdate();
    if (e.key === 'Escape') {
      setEditText(log.text);
      setIsEditing(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp.seconds * 1000);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return timeStr;
    if (isYesterday) return `${t.yesterday}, ${timeStr}`;
    return `${date.toLocaleDateString(lang === 'sk' ? 'sk-SK' : 'en-US', { day: 'numeric', month: 'numeric', year: 'numeric' })}, ${timeStr}`;
  };

  const renderTextWithTags = (text) => {
    if (!text) return '';
    const parts = text.split(/(#\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('#')) {
        const color = getTagColor(part);
        return (
          <span 
            key={i} 
            onClick={(e) => { 
              e.stopPropagation(); 
              if (onTagClick) onTagClick(part); 
            }}
            className="inline-block px-2 py-0.5 rounded-md text-[14px] font-bold mx-0.5 cursor-pointer active:scale-90 transition-transform relative z-20" 
            style={{ backgroundColor: `${color}20`, color: color }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="relative overflow-hidden rounded-2xl mb-3">
      <motion.div style={{ opacity, scale }} className="absolute inset-y-0 right-0 w-20 bg-red-500 flex items-center justify-center">
        <button onClick={() => onDelete(log.id)} className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">−</button>
      </motion.div>
      <motion.div drag={isEditing ? false : "x"} dragConstraints={{ left: -80, right: 0 }} dragElastic={0.1} style={{ x }} className="bg-apple-card p-4 border border-apple-border flex justify-between items-center relative z-10 rounded-2xl shadow-sm touch-pan-y">
        <div className="flex flex-col pr-4 flex-1 select-none text-apple-text">
          {isEditing ? (
            <input ref={inputRef} type="text" value={editText} onChange={(e) => setEditText(e.target.value)} onBlur={handleUpdate} onKeyDown={handleKeyDown} className="bg-transparent border-none p-0 focus:ring-0 outline-none text-[17px] leading-tight font-normal w-full" />
          ) : (
            <div onClick={() => setIsEditing(true)} className="text-[17px] leading-tight font-normal cursor-text whitespace-pre-wrap break-words">
              {renderTextWithTags(log.text)}
            </div>
          )}
          <span className="text-[13px] text-apple-secondary mt-1">{formatTimestamp(log.timestamp)}</span>
        </div>
      </motion.div>
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
  const [streak, setStreak] = useState(() => Number(localStorage.getItem('cached_streak')) || 0);
  const [dailyStats, setDailyStats] = useState(() => JSON.parse(localStorage.getItem('cached_stats')) || {});
  const [dailyTags, setDailyTags] = useState(() => JSON.parse(localStorage.getItem('cached_tags')) || {});
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('cached_accent') || '#F97316');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [activeTagFilter, setActiveTagFilter] = useState(null);
  const inputRef = useRef(null);

  const triggerHaptic = (type = 'light') => {
    if (!window.navigator.vibrate) return;
    const patterns = { light: 10, medium: 20, success: [10, 30, 10] };
    window.navigator.vibrate(patterns[type] || 10);
  };

  useEffect(() => {
    getRedirectResult(auth).catch((e) => console.error("Redirect Error", e));
  }, []);

  const t = translations[lang] || translations.sk;

  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('cached_accent', accentColor);
    document.documentElement.style.setProperty('--accent-color', accentColor);
  }, [accentColor]);

  useEffect(() => {
    let unsubStreak = () => {};
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        unsubStreak = onSnapshot(doc(db, 'userStats', u.uid), (s) => {
          if (s.exists()) {
            const data = s.data();
            setStreak(data.streak || 0);
            setDailyStats(data.dailyCounts || {});
            setDailyTags(data.dailyTags || {});
            localStorage.setItem('cached_streak', data.streak || 0);
            localStorage.setItem('cached_stats', JSON.stringify(data.dailyCounts || {}));
            localStorage.setItem('cached_tags', JSON.stringify(data.dailyTags || {}));
          }
        });
      } else {
        setLoading(false);
      }
    });
    return () => { unsubAuth(); unsubStreak(); };
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // Použijeme základný query pre používateľa
    const q = query(
      collection(db, 'logs'), 
      where('userId', '==', user.uid), 
      limit(activeTagFilter ? 100 : limitCount) // Vo filtri načítame viac dát naraz
    );

    const unsub = onSnapshot(q, (sn) => {
      let d = sn.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filtrovanie robíme na klientovi pre maximálnu stabilitu aj so staršími dátami
      if (activeTagFilter) {
        d = d.filter(log => {
          const textMatch = log.text?.toLowerCase().includes(activeTagFilter.toLowerCase());
          const tagsMatch = log.tags?.includes(activeTagFilter);
          return textMatch || tagsMatch;
        });
      }

      d = d.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      
      setLogs(d);
      setHasMore(sn.docs.length >= limitCount && !activeTagFilter);
      setLoading(false);
    });
    return unsub;
  }, [user, limitCount, activeTagFilter]);

  const heatmapData = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 139; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const key = d.toISOString().split('T')[0];
      
      let dominantTagColor = null;
      const dayTags = dailyTags[key] || {};
      const tagEntries = Object.entries(dayTags);
      if (tagEntries.length > 0) {
        const topTag = tagEntries.sort((a, b) => b[1] - a[1])[0][0];
        dominantTagColor = getTagColor(topTag);
      }

      days.push({ 
        key, 
        count: dailyStats[key] || 0,
        color: dominantTagColor
      });
    }
    return days;
  }, [dailyStats, dailyTags]);

  const handleLogin = () => {
    setLoading(true);
    signInWithRedirect(auth, googleProvider);
  };

  const handleLogout = () => {
    setIsSettingsOpen(false);
    signOut(auth);
    localStorage.removeItem('cached_streak');
    localStorage.removeItem('cached_stats');
    localStorage.removeItem('cached_tags');
  };

  const addLog = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    
    triggerHaptic('light');
    const now = new Date();
    const todayKey = now.toISOString().split('T')[0];
    const todayTimestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    const foundTags = inputText.match(/#\w+/g) || [];
    const updatedDailyCounts = { ...dailyStats, [todayKey]: (dailyStats[todayKey] || 0) + 1 };
    
    const updatedDailyTags = { ...dailyTags };
    if (!updatedDailyTags[todayKey]) updatedDailyTags[todayKey] = {};
    foundTags.forEach(tag => {
      updatedDailyTags[todayKey][tag] = (updatedDailyTags[todayKey][tag] || 0) + 1;
    });

    setDailyStats(updatedDailyCounts);
    setDailyTags(updatedDailyTags);
    setIsInputExpanded(false);

    try {
      await addDoc(collection(db, 'logs'), { 
        userId: user.uid, 
        text: inputText, 
        tags: foundTags,
        timestamp: serverTimestamp() 
      });

      const sRef = doc(db, 'userStats', user.uid);
      await setDoc(sRef, { 
        dailyCounts: updatedDailyCounts,
        dailyTags: updatedDailyTags,
        lastDate: serverTimestamp()
      }, { merge: true });

      setInputText('');
      setFeedback(t.motivations[Math.floor(Math.random() * t.motivations.length)]);
      setTimeout(() => setFeedback(''), 4000);
    } catch (e) { console.error(e); }
  };

  const toggleTagFilter = (tag) => {
    triggerHaptic('medium');
    setActiveTagFilter(prev => prev === tag ? null : tag);
  };

  if (loading && !user) return <div className="min-h-screen bg-apple-bg"></div>;

  if (!user) return (
    <div className="min-h-screen bg-black text-white selection:bg-[var(--accent-color)]/30 overflow-y-auto scroll-smooth">
      <div className="fixed inset-0 z-0 opacity-40 text-center flex items-center justify-center p-6">
        <h1 className="text-7xl font-black mb-12 tracking-tighter">{t.title}</h1>
      </div>
      <div className="relative z-10 w-full max-w-2xl mx-auto px-6 py-20 text-center flex flex-col items-center justify-center min-h-screen">
        <button onClick={handleLogin} className="bg-white text-black py-5 px-10 rounded-full font-bold text-xl active:scale-95 transition-all shadow-2xl">{t.login}</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-apple-bg text-apple-text pb-32 transition-all duration-500 selection:bg-[var(--accent-color)] selection:text-white">
      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ y: -100, x: '-50%', opacity: 0 }} animate={{ y: 0, x: '-50%', opacity: 1 }} exit={{ y: -100, x: '-50%', opacity: 0 }} className="fixed top-8 left-1/2 z-[110] pointer-events-none">
            <div className="bg-apple-card border border-apple-border px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 text-apple-text"><span>✨</span><p className="text-[15px] font-semibold whitespace-nowrap">{feedback}</p></div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="px-6 pt-12 pb-6 sticky top-0 bg-apple-bg/80 backdrop-blur-md z-30 border-b border-apple-border/50">
        <div className="max-w-xl mx-auto">
          <div className="flex justify-between items-end mb-8">
            <motion.div layout>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-semibold text-apple-secondary uppercase tracking-widest">{new Date().toLocaleDateString(lang === 'sk' ? 'sk-SK' : 'en-US', { day: 'numeric', month: 'long' })}</p>
                <AnimatePresence mode="wait">{streak > 0 && (<motion.span key={streak} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-1 text-sm font-bold bg-[var(--accent-color)]/10 text-[var(--accent-color)] px-2 py-0.5 rounded-full border border-[var(--accent-color)]/20 shadow-sm">🔥 {streak}</motion.span>)}</AnimatePresence>
              </div>
              <h1 className="text-4xl font-bold tracking-tight">
                {activeTagFilter ? (
                  <span className="flex items-center gap-2">
                    Focus: <span style={{ color: getTagColor(activeTagFilter) }}>{activeTagFilter}</span>
                  </span>
                ) : t.title}
              </h1>
            </motion.div>
            <button onClick={() => setIsSettingsOpen(true)} className="active:scale-90 transition-transform">
              {user?.photoURL ? <img src={user.photoURL} alt="P" className="w-10 h-10 rounded-full border border-apple-border shadow-sm" /> : <div className="w-10 h-10 rounded-full bg-apple-card border border-apple-border flex items-center justify-center">👤</div>}
            </button>
          </div>

          <div className="flex flex-wrap gap-[4px] justify-center overflow-x-auto pb-4 px-2">
            {heatmapData.map((day) => {
              const intensity = Math.min(day.count, 4);
              const opacity = intensity === 0 ? 0.1 : 0.25 + (intensity * 0.18);
              const isFilteredTag = activeTagFilter && day.color === getTagColor(activeTagFilter);
              const bgColor = day.color && intensity > 0 ? day.color : (intensity > 0 ? 'var(--accent-color)' : 'currentColor');
              
              return (
                <div 
                  key={day.key} 
                  className={`w-[11px] h-[11px] rounded-[2.5px] shrink-0 transition-all duration-700 ${activeTagFilter && !isFilteredTag ? 'grayscale opacity-5' : ''}`} 
                  style={{ backgroundColor: bgColor, opacity: activeTagFilter && !isFilteredTag ? 0.05 : opacity }} 
                />
              );
            })}
          </div>

          <AnimatePresence>
            {activeTagFilter && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex justify-center mt-4">
                <button 
                  onClick={() => setActiveTagFilter(null)}
                  className="text-xs font-bold bg-apple-card border border-apple-border px-4 py-1.5 rounded-full shadow-sm text-apple-secondary active:scale-95 transition-all"
                >
                  ✕ Zrušiť filter
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 mt-6 overflow-x-hidden">
        <motion.div layout className="space-y-0">
          <AnimatePresence mode="popLayout">
            {logs.map((log) => (
              <motion.div key={log.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}>
                <LogItem log={log} onDelete={() => deleteDoc(doc(db, 'logs', log.id))} onUpdate={(id, txt) => updateDoc(doc(db, 'logs', id), { text: txt })} onTagClick={toggleTagFilter} lang={lang} t={t} />
              </motion.div>
            ))}
          </AnimatePresence>
          {logs.length === 0 && !loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 text-apple-secondary font-medium italic">
              {activeTagFilter ? `Nenašiel som žiadne záznamy s ${activeTagFilter}` : t.noLogs}
            </motion.div>
          )}
        </motion.div>
      </main>

      <div className="fixed inset-0 flex items-center justify-center z-[120] pointer-events-none">
        <AnimatePresence>
          {!isInputExpanded ? (
            <motion.button
              key="fab"
              layoutId="fab-container"
              onClick={() => { triggerHaptic('light'); setIsInputExpanded(true); }}
              style={{ backgroundColor: accentColor, bottom: '2.5rem', position: 'fixed', borderRadius: '100px' }}
              className="w-16 h-16 shadow-[0_15px_30px_rgba(0,0,0,0.2)] flex items-center justify-center text-white text-4xl pointer-events-auto"
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              +
            </motion.button>
          ) : (
            <motion.div
              key="expanded"
              layoutId="fab-container"
              className="fixed inset-0 bg-apple-bg flex flex-col items-center justify-center p-8 pointer-events-auto"
              style={{ borderRadius: '0px' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className="w-full max-w-lg relative">
                <button onClick={() => setIsInputExpanded(false)} className="absolute -top-32 right-0 text-apple-secondary font-bold text-lg p-4 active:opacity-50">{t.back}</button>
                <form onSubmit={addLog} className="w-full space-y-8">
                  <textarea
                    ref={inputRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={t.placeholder}
                    className="w-full bg-transparent border-none text-3xl md:text-4xl font-bold text-apple-text placeholder:text-apple-secondary/30 focus:ring-0 outline-none resize-none min-h-[200px]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addLog(); }
                      if (e.key === 'Escape') setIsInputExpanded(false);
                    }}
                  />
                  <button type="submit" style={{ backgroundColor: accentColor }} className="w-full py-5 rounded-[2rem] text-white font-black text-xl shadow-2xl active:scale-95 transition-all">
                    {lang === 'sk' ? 'Uložiť víťazstvo' : 'Save Victory'}
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isSettingsOpen && (
        <AnimatePresence>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed inset-0 bg-apple-bg z-[150] px-6 pt-12 overflow-y-auto pb-20">
            <div className="max-w-xl mx-auto">
              <div className="flex justify-between items-center mb-10"><h2 className="text-3xl font-bold tracking-tight">{t.settings}</h2><button onClick={() => setIsSettingsOpen(false)} className="text-blue-500 font-semibold text-[17px]">{t.back}</button></div>
              <div className="space-y-8">
                <div><p className="text-[13px] text-apple-secondary uppercase tracking-wider mb-2 ml-4">{t.account}</p><div className="bg-apple-card rounded-2xl border border-apple-border overflow-hidden"><div className="p-4 flex items-center gap-4">{user.photoURL && <img src={user.photoURL} className="w-12 h-12 rounded-full" alt="Avatar" />}<div><p className="font-bold text-[17px]">{user.displayName}</p><p className="text-apple-secondary text-[14px]">{user.email}</p></div></div></div></div>
                <div><p className="text-[13px] text-apple-secondary uppercase tracking-wider mb-2 ml-4">{t.accentColor}</p><div className="bg-apple-card rounded-2xl border border-apple-border p-5"><div className="grid grid-cols-6 gap-2">{ACCENT_COLORS.map(color => (<button key={color.id} onClick={() => setAccentColor(color.value)} className={`aspect-square rounded-full border-2 transition-all ${accentColor === color.value ? 'border-apple-text scale-110' : 'border-transparent'}`} style={{ backgroundColor: color.value }} />))}</div></div></div>
                <button onClick={handleLogout} className="w-full bg-apple-card rounded-2xl border border-apple-border p-4 text-red-500 font-bold text-[17px] active:bg-red-500/10">{t.logout}</button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

export default App;