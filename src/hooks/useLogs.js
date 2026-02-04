import { useState, useEffect, useMemo } from 'react';
import { 
  collection, query, where, onSnapshot, addDoc, deleteDoc, updateDoc, 
  doc, setDoc, serverTimestamp, limit, orderBy 
} from 'firebase/firestore';
import { db } from '../firebase';
import { getLocalDateKey, calculateDynamicStreak, getTagColor } from '../utils/stats';
import { useApp } from '../context/AppContext';
import confetti from 'canvas-confetti';

export function useLogs(user, activeTagFilter) {
  const [logs, setLogs] = useState([]);
  const [dailyStats, setDailyStats] = useState(() => JSON.parse(localStorage.getItem('cached_stats')) || {});
  const [dailyTags, setDailyTags] = useState(() => JSON.parse(localStorage.getItem('cached_tags')) || {});
  const [memoryLog, setMemoryLog] = useState(null);
  
  const { t, dailyGoal, triggerHaptic, accentColor } = useApp();

  const streak = useMemo(() => calculateDynamicStreak(dailyStats), [dailyStats]);

  // Sync state with userStats from Firestore
  useEffect(() => {
    if (!user) return;
    const sRef = doc(db, 'userStats', user.uid);
    const unsub = onSnapshot(sRef, (s) => {
      if (s.exists()) {
        const data = s.data();
        setDailyStats(data.dailyCounts || {});
        setDailyTags(data.dailyTags || {});
      }
    });
    return unsub;
  }, [user]);

  // Sync logs from Firestore
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'logs'), 
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(500)
    );
    const unsub = onSnapshot(q, (sn) => {
      let d = sn.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (activeTagFilter) {
        d = d.filter(log => log.text?.toLowerCase().includes(activeTagFilter.toLowerCase()) || (log.tags && log.tags.includes(activeTagFilter)));
      }
      const sorted = d.sort((a, b) => {
        const timeA = a.timestamp?.seconds || Date.now() / 1000;
        const timeB = b.timestamp?.seconds || Date.now() / 1000;
        return timeB - timeA;
      });
      setLogs(sorted);

      // Memory Logic
      setMemoryLog(prev => {
        if (prev || sorted.length < 3) return prev;
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
        let candidates = sorted.filter(l => l.timestamp && new Date(l.timestamp.seconds * 1000) < weekAgo);
        if (candidates.length === 0) candidates = sorted.filter(l => l.timestamp && new Date(l.timestamp.seconds * 1000) < twoDaysAgo);
        if (candidates.length > 0) {
          const topMoments = candidates.filter(l => l.isTopWin || l.isWeeklyTop || l.isMonthlyTop);
          const pool = topMoments.length > 0 ? topMoments : candidates;
          return pool[Math.floor(Math.random() * pool.length)];
        }
        return null;
      });
    });
    return unsub;
  }, [user, activeTagFilter]);

  const addLog = async (inputText) => {
    if (!inputText.trim() || !user) return;
    triggerHaptic('light');
    const todayKey = getLocalDateKey();
    const foundTags = inputText.match(/#\w+/g) || [];
    
    const updatedDailyCounts = { ...dailyStats, [todayKey]: (dailyStats[todayKey] || 0) + 1 };
    const updatedDailyTags = { ...dailyTags, [todayKey]: { ...(dailyTags[todayKey] || {}) } };
    foundTags.forEach(tag => { updatedDailyTags[todayKey][tag] = (updatedDailyTags[todayKey][tag] || 0) + 1; });

    try {
      await addDoc(collection(db, 'logs'), { 
        userId: user.uid, text: inputText, tags: foundTags, 
        timestamp: serverTimestamp(), isTopWin: false, isWeeklyTop: false, isMonthlyTop: false 
      });
      
      const newCalculatedStreak = calculateDynamicStreak(updatedDailyCounts);
      const sRef = doc(db, 'userStats', user.uid);
      await setDoc(sRef, { 
        dailyCounts: updatedDailyCounts, 
        dailyTags: updatedDailyTags, 
        streak: newCalculatedStreak, 
        lastUpdate: serverTimestamp() 
      }, { merge: true });

      if (updatedDailyCounts[todayKey] === dailyGoal) {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: [accentColor, '#FFFFFF'] });
        triggerHaptic('success');
        return { feedback: t.goalReached };
      }
      return { feedback: t.motivations[Math.floor(Math.random() * t.motivations.length)] };
    } catch (e) {
      console.error(e);
      return { error: e.message };
    }
  };

  const deleteLog = async (log) => {
    if (!user) return;
    const isSpecial = log.isTopWin || log.isWeeklyTop || log.isMonthlyTop;
    triggerHaptic(isSpecial ? 'medium' : 'light');
    
    const logDateKey = getLocalDateKey(log.timestamp.toDate());
    const updatedDailyCounts = { ...dailyStats };
    if (updatedDailyCounts[logDateKey] > 0) {
      updatedDailyCounts[logDateKey] -= 1;
      if (updatedDailyCounts[logDateKey] === 0) delete updatedDailyCounts[logDateKey];
    }

    const updatedDailyTags = { ...dailyTags };
    if (log.tags && updatedDailyTags[logDateKey]) {
      log.tags.forEach(tag => {
        if (updatedDailyTags[logDateKey][tag] > 0) {
          updatedDailyTags[logDateKey][tag] -= 1;
          if (updatedDailyTags[logDateKey][tag] === 0) delete updatedDailyTags[logDateKey][tag];
        }
      });
      if (Object.keys(updatedDailyTags[logDateKey]).length === 0) delete updatedDailyTags[logDateKey];
    }

    try {
      await deleteDoc(doc(db, 'logs', log.id));
      const sRef = doc(db, 'userStats', user.uid);
      await setDoc(sRef, { 
        dailyCounts: updatedDailyCounts, 
        dailyTags: updatedDailyTags, 
        streak: calculateDynamicStreak(updatedDailyCounts) 
      }, { merge: true });
    } catch (e) { console.error(e); }
  };

  const updateLog = async (id, text) => {
    try {
      await updateDoc(doc(db, 'logs', id), { text });
    } catch (e) {
      console.error(e);
    }
  };

  const selectTopWin = async (logId, reflectionType) => {
    const logToMark = logs.find(l => l.id === logId);
    if (!logToMark) return false;

    const logDate = logToMark.timestamp ? (logToMark.timestamp.seconds ? new Date(logToMark.timestamp.seconds * 1000) : logToMark.timestamp.toDate()) : new Date();
    const field = reflectionType === 'daily' ? 'isTopWin' : reflectionType === 'weekly' ? 'isWeeklyTop' : 'isMonthlyTop';
    
    triggerHaptic('success');

    try {
      // Find conflicts only in the same time period
      const conflicts = logs.filter(l => {
        if (!l[field] || l.id === logId || !l.timestamp) return false;
        const d = l.timestamp.seconds ? new Date(l.timestamp.seconds * 1000) : l.timestamp.toDate();
        
        if (reflectionType === 'daily') {
          return d.toDateString() === logDate.toDateString();
        }
        
        if (reflectionType === 'weekly') {
          // Simple week check: same year and same week number
          const getWeek = (date) => {
            const tempDate = new Date(date.getTime());
            tempDate.setHours(0, 0, 0, 0);
            tempDate.setDate(tempDate.getDate() + 3 - (tempDate.getDay() + 6) % 7);
            const week1 = new Date(tempDate.getFullYear(), 0, 4);
            return 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
          };
          return d.getFullYear() === logDate.getFullYear() && getWeek(d) === getWeek(logDate);
        }

        if (reflectionType === 'monthly') {
          return d.getFullYear() === logDate.getFullYear() && d.getMonth() === logDate.getMonth();
        }
        return false;
      });

      for (const old of conflicts) {
        await updateDoc(doc(db, 'logs', old.id), { [field]: false });
      }
      
      await updateDoc(doc(db, 'logs', logId), { [field]: true });
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const heatmapData = useMemo(() => {
    const days = []; const today = new Date();
    for (let i = 139; i >= 0; i--) {
      const d = new Date(); d.setDate(today.getDate() - i); const key = getLocalDateKey(d);
      let dominantTagColor = null; const dayTags = dailyTags[key] || {}; const tagEntries = Object.entries(dayTags);
      if (tagEntries.length > 0) {
        const topTag = tagEntries.sort((a, b) => b[1] - a[1])[0][0];
        dominantTagColor = getTagColor(topTag);
      }
      days.push({ key, count: dailyStats[key] || 0, color: dominantTagColor });
    }
    return days;
  }, [dailyStats, dailyTags]);

  return { 
    logs, dailyStats, dailyTags, streak, heatmapData, memoryLog,
    addLog, deleteLog, updateLog, selectTopWin, setLogs 
  };
}
