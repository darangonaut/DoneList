import React, { useState, useEffect } from 'react';
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

function App() {
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [limitCount, setLimitCount] = useState(20);
  const [hasMore, setHasMore] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [lang, setLang] = useState('sk');
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('lang');
      if (savedLang) setLang(savedLang);
    } catch (e) {}

    getRedirectResult(auth).catch((e) => console.error("Redirect Result Error:", e));
  }, []);

  const t = translations[lang] || translations.sk;

  useEffect(() => {
    try { localStorage.setItem('lang', lang); } catch (e) {}
  }, [lang]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const unsubStreak = onSnapshot(doc(db, 'userStats', user.uid), (s) => {
      if (s.exists()) setStreak(s.data().streak || 0);
    });

    const q = query(collection(db, 'logs'), where('userId', '==', user.uid), limit(limitCount));
    const unsubLogs = onSnapshot(q, (sn) => {
      const d = sn.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setLogs(d);
      setHasMore(sn.docs.length === limitCount);
    });

    return () => { unsubStreak(); unsubLogs(); };
  }, [user, limitCount]);

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
    try {
      await addDoc(collection(db, 'logs'), {
        userId: user.uid,
        text: inputText,
        timestamp: serverTimestamp(),
        category: 'default'
      });
      const sRef = doc(db, 'userStats', user.uid);
      const sSnap = await getDoc(sRef);
      const d = new Date();
      const today = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      if (sSnap.exists()) {
        const sd = sSnap.data();
        const ld = sd.lastDate?.toDate();
        if (ld) {
          const lDay = new Date(ld.getFullYear(), ld.getMonth(), ld.getDate()).getTime();
          if (lDay < today) {
            const y = today - 86400000;
            const ns = (lDay === y) ? (sd.streak || 0) + 1 : 1;
            await setDoc(sRef, { streak: ns, lastDate: serverTimestamp() }, { merge: true });
          }
        } else {
          await setDoc(sRef, { streak: 1, lastDate: serverTimestamp() }, { merge: true });
        }
      } else {
        await setDoc(sRef, { streak: 1, lastDate: serverTimestamp() });
      }
      setInputText('');
      setFeedback(t.motivations[Math.floor(Math.random() * t.motivations.length)]);
      setTimeout(() => setFeedback(''), 4000);
    } catch (e) { console.error(e); }
  };

  const deleteLog = async (id) => {
    if (deletingId !== id) {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 3000);
      return;
    }
    try { await deleteDoc(doc(db, 'logs', id)); setDeletingId(null); } catch (e) { console.error(e); }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-apple-bg text-apple-text">
      <div className="h-8 w-8 border-4 border-apple-secondary border-t-apple-text rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-apple-bg text-apple-text pb-32 transition-colors duration-300">
      {!user ? (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <h1 className="text-5xl font-extrabold mb-2 tracking-tight">{t.title}</h1>
          <p className="text-apple-secondary mb-12 max-w-xs">{t.subtitle}</p>
          <button onClick={handleLogin} className="w-full max-w-xs bg-apple-text text-apple-bg py-4 rounded-2xl font-semibold shadow-xl active:scale-95 transition-transform">
            {t.login}
          </button>
          <div className="mt-8 flex gap-4">
            <button onClick={() => setLang('sk')} className={`text-sm ${lang === 'sk' ? 'font-bold' : 'text-apple-secondary'}`}>SK</button>
            <button onClick={() => setLang('en')} className={`text-sm ${lang === 'en' ? 'font-bold' : 'text-apple-secondary'}`}>EN</button>
          </div>
        </div>
      ) : (
        <>
          <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 transform ${feedback ? 'translate-y-0 opacity-100' : '-translate-y-12 opacity-0 pointer-events-none'}`}>
            <div className="bg-apple-card border border-apple-border px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
              <span>✨</span>
              <p className="text-[15px] font-semibold whitespace-nowrap">{feedback}</p>
            </div>
          </div>
          <header className="px-6 pt-12 pb-6 sticky top-0 bg-apple-bg/80 backdrop-blur-md z-10 border-b border-apple-border/50">
            <div className="max-w-xl mx-auto flex justify-between items-end">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-semibold text-apple-secondary uppercase tracking-widest">
                    {new Date().toLocaleDateString(lang === 'sk' ? 'sk-SK' : 'en-US', { day: 'numeric', month: 'long' })}
                  </p>
                  {streak > 0 && <span className="flex items-center gap-1 text-sm font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">🔥 {streak}</span>}
                </div>
                <h1 className="text-4xl font-bold tracking-tight">{t.title}</h1>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex gap-2">
                    <button onClick={() => setLang('sk')} className={`text-[10px] font-bold px-2 py-1 rounded ${lang === 'sk' ? 'bg-apple-text text-apple-bg' : 'text-apple-secondary border border-apple-border'}`}>SK</button>
                    <button onClick={() => setLang('en')} className={`text-[10px] font-bold px-2 py-1 rounded ${lang === 'en' ? 'bg-apple-text text-apple-bg' : 'text-apple-secondary border border-apple-border'}`}>EN</button>
                  </div>
                  {user.photoURL && <img src={user.photoURL} alt="P" className="w-10 h-10 rounded-full border border-apple-border shadow-sm" />}
                </div>
                <button onClick={handleLogout} className="text-xs font-medium text-apple-secondary active:opacity-50">{t.logout}</button>
              </div>
            </div>
          </header>
          <main className="max-w-xl mx-auto px-6 mt-6">
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="bg-apple-card p-4 rounded-2xl shadow-sm border border-apple-border flex justify-between items-center group">
                  <div className="flex flex-col pr-4">
                    <p className="text-[17px] leading-tight font-normal">{log.text}</p>
                    {log.timestamp && <span className="text-[13px] text-apple-secondary mt-1">{new Date(log.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                  </div>
                  <button onClick={() => deleteLog(log.id)} className={`p-2 rounded-full transition-all ${deletingId === log.id ? 'bg-red-500 text-white' : 'text-apple-secondary md:opacity-0 group-hover:opacity-100'}`}>
                    {deletingId === log.id ? '✓' : '🗑'}
                  </button>
                </div>
              ))}
              {logs.length === 0 && <div className="text-center py-12 text-apple-secondary font-medium">{t.noLogs}</div>}
            </div>
            {hasMore && logs.length > 0 && (
              <div className="flex justify-center mt-6">
                <button onClick={() => setLimitCount(prev => prev + 20)} className="text-sm font-semibold text-apple-secondary active:opacity-50">{t.loadMore}</button>
              </div>
            )}
          </main>
          <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-apple-bg via-apple-bg/95 to-transparent backdrop-blur-sm">
            <form onSubmit={addLog} className="max-w-xl mx-auto flex items-center bg-apple-card rounded-2xl shadow-2xl border border-apple-border p-1">
              <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder={t.placeholder} className="flex-1 bg-transparent border-none px-5 py-4 focus:ring-0 outline-none text-[17px] text-apple-text placeholder:text-apple-secondary" />
              <button type="submit" className="bg-apple-text text-apple-bg h-11 w-11 rounded-xl shadow-sm flex items-center justify-center mr-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

export default App;