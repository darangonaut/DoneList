import React, { useState, useEffect } from 'react';
import { auth, googleProvider, db } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  limit 
} from 'firebase/firestore';

function App() {
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [limitCount, setLimitCount] = useState(20);
  const [hasMore, setHasMore] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setLogs([]);
      return;
    }

    const q = query(
      collection(db, 'logs'),
      where('userId', '==', user.uid),
      limit(limitCount)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setLogs(logsData);
      setHasMore(snapshot.docs.length === limitCount);
    }, (error) => {
      console.error("Firestore error:", error);
    });

    return () => unsubscribe();
  }, [user, limitCount]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login error:", error);
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
      setInputText('');
    } catch (error) {
      console.error("Error adding log:", error);
    }
  };

  const deleteLog = async (id) => {
    if (deletingId !== id) {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 3000);
      return;
    }
    try {
      await deleteDoc(doc(db, 'logs', id));
      setDeletingId(null);
    } catch (error) {
      console.error("Error deleting log:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-apple-bg">
        <div className="animate-pulse h-12 w-12 bg-apple-border rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-apple-bg">
        <h1 className="text-5xl font-extrabold mb-2 tracking-tight text-apple-text">Done!</h1>
        <p className="text-apple-secondary mb-12 text-center max-w-xs">Zapisuj si svoje víťazstvá každý deň.</p>
        <button 
          onClick={handleLogin}
          className="w-full max-w-xs bg-apple-text text-apple-bg py-4 rounded-2xl font-semibold hover:opacity-90 transition-all active:scale-95 shadow-xl"
        >
          Prihlásiť sa cez Google
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-apple-bg pb-32 transition-colors duration-300">
      <header className="px-6 pt-12 pb-6 sticky top-0 bg-apple-bg/80 backdrop-blur-md z-10">
        <div className="max-w-xl mx-auto flex justify-between items-end">
          <div>
            <p className="text-xs font-semibold text-apple-secondary uppercase tracking-widest mb-1">
              {new Date().toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-apple-text">Done!</h1>
          </div>
          <div className="flex flex-col items-end gap-2">
            {user.photoURL && (
              <img 
                src={user.photoURL} 
                alt="Profile" 
                className="w-10 h-10 rounded-full border border-apple-border shadow-sm"
              />
            )}
            <button 
              onClick={handleLogout}
              className="text-xs font-medium text-apple-secondary hover:text-apple-text active:opacity-50"
            >
              Odhlásiť
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6">
        <div className="space-y-3">
          {logs.map((log) => (
            <div 
              key={log.id} 
              className="bg-apple-card p-4 rounded-2xl shadow-sm border border-apple-border flex justify-between items-center group animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              <div className="flex flex-col pr-4">
                <p className="text-[17px] text-apple-text leading-tight font-normal">{log.text}</p>
                {log.timestamp && (
                  <span className="text-[13px] text-apple-secondary mt-1">
                    {new Date(log.timestamp.seconds * 1000).toLocaleTimeString('sk-SK', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
              <button 
                onClick={() => deleteLog(log.id)}
                className={`transition-all duration-200 p-2 rounded-full ${
                  deletingId === log.id 
                    ? 'bg-red-500 text-white scale-110' 
                    : 'text-apple-border hover:text-red-500 md:opacity-0 group-hover:opacity-100'
                }`}
              >
                {deletingId === log.id ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-center py-12 text-apple-secondary font-medium">
              Zatiaľ žiadne záznamy.
            </div>
          )}
        </div>

        {hasMore && logs.length > 0 && (
          <div className="flex justify-center mt-6">
            <button 
              onClick={() => setLimitCount(prev => prev + 20)}
              className="text-sm font-semibold text-apple-secondary hover:text-apple-text active:opacity-50"
            >
              Načítať staršie
            </button>
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-apple-bg via-apple-bg/95 to-transparent backdrop-blur-sm">
        <form onSubmit={addLog} className="max-w-xl mx-auto flex items-center bg-apple-card rounded-2xl shadow-2xl border border-apple-border p-1">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Zapíš si malú (aj veľkú) výhru..."
            className="flex-1 bg-transparent border-none px-5 py-4 focus:ring-0 outline-none text-[17px] text-apple-text placeholder:text-apple-secondary"
          />
          <button 
            type="submit"
            className="bg-apple-text text-apple-bg h-11 w-11 rounded-xl shadow-sm hover:opacity-90 transition-all active:scale-90 flex items-center justify-center mr-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;