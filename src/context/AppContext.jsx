import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { translations } from '../translations';

const AppContext = createContext();

export const AppProvider = ({ children, initialSettings }) => {
  const [lang, setLang] = useState(initialSettings.lang || 'sk');
  const [accentColor, setAccentColor] = useState(initialSettings.accentColor || '#F97316');
  const [hapticEnabled, setHapticEnabled] = useState(initialSettings.hapticEnabled !== false);
  const [dailyGoal, setDailyGoal] = useState(initialSettings.dailyGoal || 3);
  const [showStreak, setShowStreak] = useState(initialSettings.showStreak !== false);
  const [showHeatmap, setShowHeatmap] = useState(initialSettings.showHeatmap !== false);

  const t = useMemo(() => translations[lang] || translations.sk, [lang]);

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
    lang, setLang,
    t,
    accentColor, setAccentColor,
    hapticEnabled, setHapticEnabled,
    dailyGoal, setDailyGoal,
    showStreak, setShowStreak,
    showHeatmap, setShowHeatmap,
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
