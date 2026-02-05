import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { translations } from '../translations';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const AppContext = createContext();

export const AppProvider = ({ children, initialSettings, user }) => {
  const [lang, setLang] = useState(initialSettings.lang || 'sk');
  const [accentColor, setAccentColor] = useState(initialSettings.accentColor || '#F97316');
  const [hapticEnabled, setHapticEnabled] = useState(initialSettings.hapticEnabled !== false);
  const [dailyGoal, setDailyGoal] = useState(initialSettings.dailyGoal || 3);
  const [showStreak, setShowStreak] = useState(initialSettings.showStreak !== false);
  const [showHeatmap, setShowHeatmap] = useState(initialSettings.showHeatmap !== false);

  const t = useMemo(() => translations[lang] || translations.sk, [lang]);

  // Sync state with props when initialSettings (from Firestore) arrive
  useEffect(() => {
    if (initialSettings.lang) setLang(initialSettings.lang);
    if (initialSettings.accentColor) setAccentColor(initialSettings.accentColor);
    if (initialSettings.hapticEnabled !== undefined) setHapticEnabled(initialSettings.hapticEnabled);
    if (initialSettings.dailyGoal) setDailyGoal(initialSettings.dailyGoal);
    if (initialSettings.showStreak !== undefined) setShowStreak(initialSettings.showStreak);
    if (initialSettings.showHeatmap !== undefined) setShowHeatmap(initialSettings.showHeatmap);
  }, [initialSettings]);

  // Unified update function to prevent loops
  const updateSetting = async (key, value) => {
    // 1. Update local state immediately
    const setters = {
      lang: setLang,
      accentColor: setAccentColor,
      hapticEnabled: setHapticEnabled,
      dailyGoal: setDailyGoal,
      showStreak: setShowStreak,
      showHeatmap: setShowHeatmap
    };
    
    if (setters[key]) setters[key](value);

    // 2. Persist to Firestore if user is logged in
    if (user) {
      try {
        await setDoc(doc(db, 'userStats', user.uid), { [key]: value }, { merge: true });
      } catch (e) {
        console.error("Failed to sync setting:", key, e);
      }
    }
  };

  const triggerHaptic = (type = 'light') => {
    if (!hapticEnabled || !window.navigator.vibrate) return;
    const patterns = { light: 10, medium: 20, success: [10, 30, 10] };
    window.navigator.vibrate(patterns[type] || 10);
    
    const sounds = {
      light: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
      medium: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
      success: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3'
    };
    const audio = new Audio(sounds[type]);
    audio.volume = type === 'success' ? 0.3 : 0.15;
    audio.play().catch(() => {});
  };

  const formatTimestamp = (ts) => {
    if (!ts) return lang === 'sk' ? 'Teraz' : 'Just now';
    const date = new Date(ts.seconds * 1000);
    return date.toLocaleTimeString(lang === 'sk' ? 'sk-SK' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    document.documentElement.style.setProperty('--accent-color', accentColor);
  }, [accentColor]);

  const value = {
    lang, setLang: (v) => updateSetting('lang', v),
    t,
    accentColor, setAccentColor: (v) => updateSetting('accentColor', v),
    hapticEnabled, setHapticEnabled: (v) => updateSetting('hapticEnabled', v),
    dailyGoal, setDailyGoal: (v) => updateSetting('dailyGoal', v),
    showStreak, setShowStreak: (v) => updateSetting('showStreak', v),
    showHeatmap, setShowHeatmap: (v) => updateSetting('showHeatmap', v),
    triggerHaptic,
    formatTimestamp
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
