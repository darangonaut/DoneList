import React, { useState, useEffect, useMemo } from 'react';
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
  doc, 
  getDoc,
  setDoc,
  serverTimestamp,
  limit 
} from 'firebase/firestore';
import { translations } from './translations';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import confetti from 'canvas-confetti';

function LogItem({ log, onDelete, lang }) {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-70, -20], [1, 0]);
  const scale = useTransform(x, [-70, -20], [1, 0.5]);

  return (
    <div className="relative overflow-hidden rounded-2xl mb-3">
      <motion.div 
        style={{ opacity, scale }}
        className="absolute inset-y-0 right-0 w-20 bg-red-500 flex items-center justify-center"
      >
        <button 
          onClick={() => onDelete(log.id)}
          className="w-full h-full flex items-center justify-center text-white text-2xl font-bold"
        >
          −
        </button>
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -80, right: 0 }}
        dragElastic={0.1}
        style={{ x }}
        className="bg-apple-card p-4 border border-apple-border flex justify-between items-center relative z-10 rounded-2xl shadow-sm touch-pan-y"
      >
        <div className="flex flex-col pr-4 select-none">
          <p className="text-[17px] leading-tight font-normal">{log.text}</p>
          {log.timestamp && (
            <span className="text-[13px] text-apple-secondary mt-1">
              {new Date(log.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
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
  const [lang, setLang] = useState('sk');
  const [streak, setStreak] = useState(0);
  const [dailyStats, setDailyStats] = useState({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const triggerHaptic = (type = 'light') => {
    if (!window.navigator.vibrate) return;
    if (type === 'light') window.navigator.vibrate(10);
    else if (type === 'medium') window.navigator.vibrate(20);
    else if (type === 'success') window.navigator.vibrate([10, 30, 10]);
  };

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('lang');
      if (savedLang) setLang(savedLang);
    } catch (e) {}
    getRedirectResult(auth).catch((e) => console.error("Redirect Error", e));
  }, []);

  const t = translations[lang] || translations.sk;

  useEffect(() => {
    try { localStorage.setItem('lang', lang); } catch (e) {}
  }, [lang]);

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
          }
        });
      } else {
        setStreak(0);
        setDailyStats({});
        unsubStreak();
      }
      setLoading(false);
    });
    return () => { unsubAuth(); unsubStreak(); };
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'logs'), where('userId', '==', user.uid), limit(limitCount));
    return onSnapshot(q, (sn) => {
      const d = sn.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setLogs(d);
      setHasMore(sn.docs.length === limitCount);
    });
  }, [user, limitCount]);

  const chartData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      data.push({
        label: date.toLocaleDateString(lang === 'sk' ? 'sk-SK' : 'en-US', { weekday: 'narrow' }),
        count: dailyStats[key] || 0,
        isToday: i === 0
      });
    }
    return data;
  }, [dailyStats, lang]);

  const handleLogin = async () => {
    try {
      setLoading(true);
      await signInWithRedirect(auth, googleProvider);
    } catch (e) {
      setLoading(false);
      alert("Chyba: " + e.message);
    }
  };

  const handleLogout = () => {
    setIsSettingsOpen(false);
    signOut(auth);
  };

  const addLog = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    triggerHaptic('light');
    const now = new Date();
    const todayKey = now.toISOString().split('T')[0];
    try {
      await addDoc(collection(db, 'logs'), {
        userId: user.uid,
        text: inputText,
        timestamp: serverTimestamp(),
        category: 'default'
      });
      const sRef = doc(db, 'userStats', user.uid);
      const sSnap = await getDoc(sRef);
      const todayTimestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      let newStreak = 1;
      let newCounts = { ...dailyStats, [todayKey]: (dailyStats[todayKey] || 0) + 1 };
      if (sSnap.exists()) {
        const data = sSnap.data();
        const lastDate = data.lastDate?.toDate();
        if (lastDate) {
          const lastDayTimestamp = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate()).getTime();
          if (lastDayTimestamp === todayTimestamp) newStreak = data.streak || 1;
          else if (lastDayTimestamp === todayTimestamp - 86400000) newStreak = (data.streak || 0) + 1;
        }
      }
      await setDoc(sRef, { streak: newStreak, lastDate: serverTimestamp(), dailyCounts: newCounts }, { merge: true });
      if ([7, 30, 100, 365].includes(newStreak) && (!sSnap.exists() || sSnap.data().streak !== newStreak)) {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        setFeedback(`WAAAU! ${newStreak} dňová séria! 🏆`);
      } else {
        setFeedback(t.motivations[Math.floor(Math.random() * t.motivations.length)]);
      }
      setInputText('');
      triggerHaptic('success');
      setTimeout(() => setFeedback(''), 4000);
    } catch (e) { console.error(e); }
  };

  const deleteLog = async (id) => {
    triggerHaptic('medium');
    try { await deleteDoc(doc(db, 'logs', id)); } catch (e) { console.error(e); }
  };

  if (loading) return <div className="min-h-screen bg-apple-bg"></div>;

  if (!user) return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden flex flex-col items-center justify-center px-6 selection:bg-orange-500/30">
      <div className="absolute inset-0 z-0 opacity-40">
        <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0], x: [-100, 100, -100], y: [-50, 50, -50] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] rounded-full bg-orange-600 blur-[120px]" />
        <motion.div animate={{ scale: [1.2, 1, 1.2], rotate: [0, -120, 0], x: [100, -100, 100], y: [50, -50, 50] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full bg-blue-600 blur-[120px]" />
        <motion.div animate={{ scale: [1, 1.3, 1], x: [0, 50, 0], y: [0, 100, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-purple-600 blur-[100px]" />
      </div>
      <div className="relative z-10 w-full max-w-md flex flex-col items-center text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <span className="inline-block px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] font-bold uppercase tracking-widest mb-4">{t.tagline}</span>
          <h1 className="text-6xl md:text-7xl font-black mb-4 tracking-tighter bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">{t.title}</h1>
          <p className="text-xl text-white/60 mb-12 font-medium leading-relaxed">{t.subtitle}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, duration: 0.6 }} className="w-full space-y-4">
          <button onClick={handleLogin} className="w-full bg-white text-black py-5 rounded-3xl font-bold text-lg shadow-[0_20px_40px_rgba(255,255,255,0.15)] active:scale-95 transition-all flex items-center justify-center gap-3">
            <svg className="w-6 h-6" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
            {t.login}
          </button>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-left"><span className="text-xl mb-1 block">🔥</span><p className="text-xs font-bold text-white/40 uppercase">Streaks</p><p className="text-sm font-medium">{t.featureStreaks}</p></div>
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-left"><span className="text-xl mb-1 block">📊</span><p className="text-xs font-bold text-white/40 uppercase">Stats</p><p className="text-sm font-medium">{t.featureStats}</p></div>
          </div>
        </motion.div>
        <div className="mt-12 flex gap-6">
          <button onClick={() => setLang('sk')} className={`text-[10px] font-bold tracking-[0.2em] uppercase ${lang === 'sk' ? 'text-white' : 'text-white/30'}`}>Slovensky</button>
          <button onClick={() => setLang('en')} className={`text-[10px] font-bold tracking-[0.2em] uppercase ${lang === 'en' ? 'text-white' : 'text-white/30'}`}>English</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-apple-bg text-apple-text pb-32 transition-colors duration-300">
      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ y: -100, x: '-50%', opacity: 0 }} animate={{ y: 0, x: '-50%', opacity: 1 }} exit={{ y: -100, x: '-50%', opacity: 0 }} className="fixed top-8 left-1/2 z-50 pointer-events-none">
            <div className="bg-apple-card border border-apple-border px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 text-apple-text">
              <span>✨</span><p className="text-[15px] font-semibold whitespace-nowrap">{feedback}</p>
            </div>
          </motion.div>
        )}

        {isSettingsOpen && (
          <motion.div 
            initial={{ y: '100%' }} 
            animate={{ y: 0 }} 
            exit={{ y: '100%' }} 
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-apple-bg z-[100] px-6 pt-12"
          >
            <div className="max-w-xl mx-auto">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-3xl font-bold tracking-tight">{t.settings}</h2>
                <button onClick={() => setIsSettingsOpen(false)} className="text-blue-500 font-semibold text-[17px]">{t.back}</button>
              </div>

              <div className="space-y-8">
                {/* Account Section */}
                <div>
                  <p className="text-[13px] text-apple-secondary uppercase tracking-wider mb-2 ml-4">{t.account}</p>
                  <div className="bg-apple-card rounded-2xl border border-apple-border overflow-hidden">
                    <div className="p-4 flex items-center gap-4">
                      {user.photoURL && <img src={user.photoURL} className="w-12 h-12 rounded-full" alt="Avatar" />}
                      <div>
                        <p className="font-bold text-[17px]">{user.displayName}</p>
                        <p className="text-apple-secondary text-[14px]">{user.email}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Language Section */}
                <div>
                  <p className="text-[13px] text-apple-secondary uppercase tracking-wider mb-2 ml-4">{t.language}</p>
                  <div className="bg-apple-card rounded-2xl border border-apple-border overflow-hidden">
                    <button onClick={() => setLang('sk')} className="w-full p-4 flex justify-between items-center border-b border-apple-border active:bg-apple-border/10">
                      <span className="text-[17px]">Slovenčina</span>
                      {lang === 'sk' && <span className="text-blue-500">✓</span>}
                    </button>
                    <button onClick={() => setLang('en')} className="w-full p-4 flex justify-between items-center active:bg-apple-border/10">
                      <span className="text-[17px]">English</span>
                      {lang === 'en' && <span className="text-blue-500">✓</span>}
                    </button>
                  </div>
                </div>

                <button onClick={handleLogout} className="w-full bg-apple-card rounded-2xl border border-apple-border p-4 text-red-500 font-bold text-[17px] active:bg-red-500/10">
                  {t.logout}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="px-6 pt-12 pb-6 sticky top-0 bg-apple-bg/80 backdrop-blur-md z-10 border-b border-apple-border/50">
        <div className="max-w-xl mx-auto">
          <div className="flex justify-between items-end mb-6">
            <motion.div layout>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-semibold text-apple-secondary uppercase tracking-widest">{new Date().toLocaleDateString(lang === 'sk' ? 'sk-SK' : 'en-US', { day: 'numeric', month: 'long' })}</p>
                <AnimatePresence mode="wait">{streak > 0 && <motion.span key={streak} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-1 text-sm font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">🔥 {streak}</motion.span>}</AnimatePresence>
              </div>
              <h1 className="text-4xl font-bold tracking-tight">{t.title}</h1>
            </motion.div>
            <button onClick={() => setIsSettingsOpen(true)} className="active:scale-90 transition-transform">
              {user?.photoURL ? <img src={user.photoURL} alt="P" className="w-10 h-10 rounded-full border border-apple-border shadow-sm" /> : <div className="w-10 h-10 rounded-full bg-apple-card border border-apple-border flex items-center justify-center">👤</div>}
            </button>
          </div>
          <div className="flex items-end justify-between h-12 gap-1 px-2">
            {chartData.map((day, i) => {
              const maxCount = Math.max(...chartData.map(d => d.count), 1);
              const height = (day.count / maxCount) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-apple-border/30 rounded-t-sm relative h-8 overflow-hidden">
                    <motion.div initial={{ height: 0 }} animate={{ height: `${height}%` }} className={`absolute bottom-0 left-0 right-0 ${day.isToday ? 'bg-apple-text' : 'bg-apple-secondary/40'} rounded-t-sm`} />
                  </div>
                  <span className={`text-[9px] font-bold ${day.isToday ? 'text-apple-text' : 'text-apple-secondary'}`}>{day.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 mt-6 overflow-x-hidden">
        <motion.div layout className="space-y-0">
          <AnimatePresence initial={false}>
            {logs.map((log) => (
              <motion.div key={log.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}>
                <LogItem log={log} onDelete={deleteLog} lang={lang} />
              </motion.div>
            ))}
          </AnimatePresence>
          {logs.length === 0 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 text-apple-secondary font-medium">{t.noLogs}</motion.div>}
        </motion.div>
        {hasMore && logs.length > 0 && <div className="flex justify-center mt-6"><button onClick={() => setLimitCount(prev => prev + 20)} className="text-sm font-semibold text-apple-secondary active:opacity-50">{t.loadMore}</button></div>}
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-apple-bg via-apple-bg/95 to-transparent backdrop-blur-sm z-50">
        <form onSubmit={addLog} className="max-w-xl mx-auto flex items-center bg-apple-card rounded-2xl shadow-2xl border border-apple-border p-1">
          <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder={t.placeholder} className="flex-1 bg-transparent border-none px-5 py-4 focus:ring-0 outline-none text-[17px] text-apple-text placeholder:text-apple-secondary" />
          <button type="submit" className="bg-apple-text text-apple-bg h-11 w-11 rounded-xl shadow-sm flex items-center justify-center mr-1 hover:opacity-90 active:scale-90 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg></button>
        </form>
      </div>
    </div>
  );
}

export default App;