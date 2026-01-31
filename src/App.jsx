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

// Samostatný komponent pre log kvôli dragnutiu
function LogItem({ log, onDelete, lang }) {
  const x = useMotionValue(0);
  // Animujeme červené pozadie podľa posunu
  const opacity = useTransform(x, [-70, -20], [1, 0]);
  const scale = useTransform(x, [-70, -20], [1, 0.5]);

  return (
    <div className="relative overflow-hidden rounded-2xl mb-3">
      {/* Spodná vrstva - červené tlačidlo */}
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

      {/* Horná vrstva - samotný obsah */}
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
        {/* Indikátor pre desktop, že sa dá mazať */}
        <div className="md:block hidden text-apple-border opacity-0 group-hover:opacity-100">
          ← swipe
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

  const handleLogout = () => signOut(auth);

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
          if (lastDayTimestamp === todayTimestamp) {
            newStreak = data.streak || 1;
          } else if (lastDayTimestamp === todayTimestamp - 86400000) {
            newStreak = (data.streak || 0) + 1;
          }
        }
      }

      await setDoc(sRef, { 
        streak: newStreak, 
        lastDate: serverTimestamp(),
        dailyCounts: newCounts
      }, { merge: true });

      if ([7, 30, 100, 365].includes(newStreak) && (!sSnap.exists() || sSnap.data().streak !== newStreak)) {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        setFeedback(`WAAAU! Dosiahol si ${newStreak} dňovú sériu! 🏆`);
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

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-apple-bg text-apple-text">
      <div className="h-8 w-8 border-4 border-apple-secondary border-t-apple-text rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-apple-bg text-apple-text pb-32 transition-colors duration-300">
      <AnimatePresence>
        {feedback && (
          <motion.div 
            initial={{ y: -100, x: '-50%', opacity: 0 }}
            animate={{ y: 0, x: '-50%', opacity: 1 }}
            exit={{ y: -100, x: '-50%', opacity: 0 }}
            className="fixed top-8 left-1/2 z-50 pointer-events-none"
          >
            <div className="bg-apple-card border border-apple-border px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 text-apple-text">
              <span>✨</span>
              <p className="text-[15px] font-semibold whitespace-nowrap">{feedback}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="px-6 pt-12 pb-6 sticky top-0 bg-apple-bg/80 backdrop-blur-md z-10 border-b border-apple-border/50">
        <div className="max-w-xl mx-auto">
          <div className="flex justify-between items-end mb-6">
            <motion.div layout>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-semibold text-apple-secondary uppercase tracking-widest">
                  {new Date().toLocaleDateString(lang === 'sk' ? 'sk-SK' : 'en-US', { day: 'numeric', month: 'long' })}
                </p>
                <AnimatePresence mode="wait">
                  {streak > 0 && (
                    <motion.span 
                      key={streak}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center gap-1 text-sm font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20"
                    >
                      🔥 {streak}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <h1 className="text-4xl font-bold tracking-tight">{t.title}</h1>
            </motion.div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  <button onClick={() => setLang('sk')} className={`text-[10px] font-bold px-2 py-1 rounded ${lang === 'sk' ? 'bg-apple-text text-apple-bg' : 'text-apple-secondary border border-apple-border'}`}>SK</button>
                  <button onClick={() => setLang('en')} className={`text-[10px] font-bold px-2 py-1 rounded ${lang === 'en' ? 'bg-apple-text text-apple-bg' : 'text-apple-secondary border border-apple-border'}`}>EN</button>
                </div>
                {user?.photoURL && <img src={user.photoURL} alt="P" className="w-10 h-10 rounded-full border border-apple-border shadow-sm" />}
              </div>
              <button onClick={handleLogout} className="text-xs font-medium text-apple-secondary active:opacity-50">{t.logout}</button>
            </div>
          </div>

          {user && (
            <div className="flex items-end justify-between h-12 gap-1 px-2">
              {chartData.map((day, i) => {
                const maxCount = Math.max(...chartData.map(d => d.count), 1);
                const height = (day.count / maxCount) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-apple-border/30 rounded-t-sm relative h-8 overflow-hidden">
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        className={`absolute bottom-0 left-0 right-0 ${day.isToday ? 'bg-apple-text' : 'bg-apple-secondary/40'} rounded-t-sm`}
                      />
                    </div>
                    <span className={`text-[9px] font-bold ${day.isToday ? 'text-apple-text' : 'text-apple-secondary'}`}>
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 mt-6 overflow-x-hidden">
        {!user ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
            <h1 className="text-5xl font-extrabold mb-2 tracking-tight">{t.title}</h1>
            <p className="text-apple-secondary mb-12 max-w-xs">{t.subtitle}</p>
            <button onClick={handleLogin} className="w-full max-w-xs bg-apple-text text-apple-bg py-4 rounded-2xl font-semibold shadow-xl active:scale-95 transition-transform">{t.login}</button>
          </div>
        ) : (
          <>
            <motion.div layout className="space-y-0">
              <AnimatePresence initial={false}>
                {logs.map((log) => (
                  <motion.div
                    key={log.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
                  >
                    <LogItem log={log} onDelete={deleteLog} lang={lang} />
                  </motion.div>
                ))}
              </AnimatePresence>
              {logs.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 text-apple-secondary font-medium">
                  {t.noLogs}
                </motion.div>
              )}
            </motion.div>
            
            {hasMore && logs.length > 0 && (
              <div className="flex justify-center mt-6">
                <button onClick={() => setLimitCount(prev => prev + 20)} className="text-sm font-semibold text-apple-secondary active:opacity-50">{t.loadMore}</button>
              </div>
            )}
          </>
        )}
      </main>

      {user && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-apple-bg via-apple-bg/95 to-transparent backdrop-blur-sm z-50">
          <form onSubmit={addLog} className="max-w-xl mx-auto flex items-center bg-apple-card rounded-2xl shadow-2xl border border-apple-border p-1">
            <input 
              type="text" 
              value={inputText} 
              onChange={(e) => setInputText(e.target.value)} 
              placeholder={t.placeholder} 
              className="flex-1 bg-transparent border-none px-5 py-4 focus:ring-0 outline-none text-[17px] text-apple-text placeholder:text-apple-secondary" 
            />
            <button 
              type="submit" 
              className="bg-apple-text text-apple-bg h-11 w-11 rounded-xl shadow-sm flex items-center justify-center mr-1 hover:opacity-90 active:scale-90 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;
