import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogItem } from './LogItem';
import { CalendarView } from './CalendarView';
import { useApp } from '../context/AppContext';
import { useLogs } from '../hooks/useLogs';
import { getTagColor } from '../utils/stats';

const MAX_LENGTH = 280;

const PraiseToast = ({ message, accentColor }) => (
  <motion.div 
    initial={{ y: -100, opacity: 0, scale: 0.5 }}
    animate={{ y: 0, opacity: 1, scale: 1 }}
    exit={{ y: -100, opacity: 0, scale: 0.5 }}
    className="fixed top-8 left-0 right-0 z-[1000] flex justify-center pointer-events-none"
  >
    <div 
      style={{ backgroundColor: accentColor }}
      className="px-6 py-3 rounded-full shadow-2xl text-white font-black text-lg flex items-center gap-2 border-2 border-white/20"
    >
      <span role="img" aria-hidden="true">✨</span>
      {message}
    </div>
  </motion.div>
);

const ReflectionCard = ({ type, icon, title, isCompleted, setReflectionType }) => {
  const { t } = useApp();
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => !isCompleted && setReflectionType(type)}
      aria-label={`${title} - ${isCompleted ? t.completed : t.reflectionTime}`}
      className={`w-full p-6 rounded-[2rem] border mb-6 flex items-center justify-between transition-all active:scale-[0.98] ${
        isCompleted 
          ? 'bg-apple-card/40 border-apple-border/50 opacity-60' 
          : 'bg-apple-card border-apple-border shadow-lg shadow-[var(--accent-color)]/5'
      }`}
    >
      <div className="flex items-center gap-4">
        <span className={`text-3xl ${!isCompleted ? 'animate-pulse' : ''}`} role="img" aria-hidden="true">{icon}</span>
        <div className="text-left">
          <p className="text-[13px] font-bold uppercase tracking-widest text-apple-secondary mb-0.5">{t.reflectionTime}</p>
          <h3 className="text-xl font-bold text-apple-text">{title}</h3>
        </div>
      </div>
      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-apple-border'}`}>
        {isCompleted ? <span className="font-bold">✓</span> : <span className="font-bold">→</span>}
      </div>
    </motion.button>
  );
};

const MemoryCard = ({ log, setShowMemory, onShare }) => {
  const { t, lang } = useApp();
  if (!log) return null;
  const date = new Date(log.timestamp?.seconds * 1000 || Date.now());
  const dateStr = date.toLocaleDateString(lang === 'sk' ? 'sk-SK' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  
  const isVeryOld = (new Date().getTime() - date.getTime()) > 7 * 24 * 60 * 60 * 1000;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden rounded-[2rem] p-6 mb-8 border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-orange-500/20 backdrop-blur-xl shadow-lg"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl" role="img" aria-hidden="true">{isVeryOld ? '🕰️' : '✨'}</span>
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-700 dark:text-orange-400">
            {isVeryOld ? t.memoryTitle : t.recentWinTitle}
          </span>
        </div>
        <button onClick={() => setShowMemory(false)} aria-label="Zatvoriť spomienku" className="text-orange-700/60 hover:text-orange-700 p-1 font-bold">✕</button>
      </div>
      <p className="text-[18px] font-bold text-apple-text italic leading-relaxed mb-4">
        "{log.text}"
      </p>
      <div className="flex justify-between items-center">
        <span className="text-[13px] font-bold text-orange-800/80 dark:text-orange-400/80">{dateStr}</span>
        <button 
          onClick={() => onShare(log)}
          className="text-[12px] font-black uppercase tracking-widest text-orange-700 dark:text-orange-400 underline underline-offset-4"
        >
          {t.reminisce}
        </button>
      </div>
    </motion.div>
  );
};

export function Dashboard({ 
  user, setIsSettingsOpen, setReflectionType, setIsAIModalOpen, onShare
}) {
  const { t, lang, accentColor, dailyGoal, triggerHaptic, showStreak, showHeatmap } = useApp();
  const [activeTagFilter, setActiveTagFilter] = useState(null);
  
  const { 
    logs, streak, heatmapData, memoryLog, 
    addLog: firestoreAddLog, deleteLog, updateLog 
  } = useLogs(user, activeTagFilter);

  const [view, setView] = useState('list'); 
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(null);
  const [isHeatmapExpanded, setIsHeatmapExpanded] = useState(false);
  const [showMemory, setShowMemory] = useState(true);
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [inputText, setInputText] = useState('');
  const [praise, setPraise] = useState(null);
  const [isVictoryFlash, setIsVictoryFlash] = useState(false);
  const inputRef = useRef(null);

  const remainingChars = MAX_LENGTH - inputText.length;
  const isCloseToLimit = remainingChars <= 20;
  const isOverLimit = remainingChars < 0;

  const todayLogsList = logs.filter(log => {
    if (!log.timestamp) return true;
    const date = new Date(log.timestamp.seconds * 1000);
    return date.toDateString() === new Date().toDateString();
  });
  
  const todayCount = todayLogsList.length;
  const isGoalReached = todayCount >= dailyGoal;

  const hour = new Date().getHours();
  const isEvening = hour >= 10;
  const today = new Date();
  const isSunday = today.getDay() === 0;
  const isLastDayOfMonth = () => {
    const nextDay = new Date(today.getTime() + 86400000);
    return nextDay.getDate() === 1;
  };

  const hasDailyTop = logs.some(l => l.isTopWin && new Date(l.timestamp?.seconds * 1000).toDateString() === today.toDateString());
  const hasWeeklyTop = logs.some(l => l.isWeeklyTop); 
  const hasMonthlyTop = logs.some(l => l.isMonthlyTop);

  const handleAddLog = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isOverLimit) return;
    
    const textToSave = inputText;
    setInputText('');
    setIsInputExpanded(false);
    
    // Optimistic UI visual feedback
    setIsVictoryFlash(true);
    triggerHaptic('success');
    
    const randomPraise = t.motivations[Math.floor(Math.random() * t.motivations.length)];
    setPraise(randomPraise);
    
    setTimeout(() => {
      setIsVictoryFlash(false);
    }, 1000);
    
    setTimeout(() => {
      setPraise(null);
    }, 3000);

    await firestoreAddLog(textToSave);
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    const name = user?.displayName?.split(' ')[0] || 'Priateľ';
    if (h < 10) return `${t.greetingMorning}, ${name} 🌅`;
    if (h < 18) return `${t.greetingDay}, ${name} ✨`;
    return `${t.greetingEvening}, ${name} 🌙`;
  };

  return (
    <div className="max-w-xl mx-auto px-6 relative z-10 text-left">
      <AnimatePresence>
        {praise && <PraiseToast message={praise} accentColor={accentColor} />}
      </AnimatePresence>

      <AnimatePresence>
        {isVictoryFlash && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            exit={{ opacity: 0 }}
            style={{ backgroundColor: accentColor }}
            className="fixed inset-0 z-[1000] pointer-events-none"
          />
        )}
      </AnimatePresence>

      <header className="pt-12 pb-4 sticky top-0 bg-apple-bg/60 backdrop-blur-xl z-30 border-b border-apple-border/30 -mx-6 px-6 text-left">
        <div className="flex justify-between items-start mb-6 text-left">
          <motion.div layout className="text-left flex-1 pr-4">
            <div className="flex items-center gap-2 mb-1 flex-wrap justify-start">
              <p className="text-[13px] font-black text-apple-secondary uppercase tracking-[0.15em]">
                {new Date().toLocaleDateString(lang === 'sk' ? 'sk-SK' : 'en-US', { day: 'numeric', month: 'long' })}
              </p>
              
              <AnimatePresence mode="wait">
                {showStreak && streak > 0 && (
                  <motion.span 
                    key={streak} 
                    initial={{ scale: 0.5, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    className="flex items-center gap-1 text-[11px] font-black bg-[var(--accent-color)]/20 text-[var(--accent-color)] px-2 py-0.5 rounded-full border border-[var(--accent-color)]/30 shadow-sm"
                  >
                    🔥 {streak}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-apple-text text-left leading-tight mb-1">
              {activeTagFilter ? (
                <span className="flex items-center gap-2">Focus: <span style={{ color: getTagColor(activeTagFilter) }}>{activeTagFilter}</span></span>
              ) : (
                <span className="bg-gradient-to-br from-apple-text to-apple-text/70 bg-clip-text text-transparent">
                  {getGreeting()}
                </span>
              )}
            </h1>
            {!activeTagFilter && (
              <div className="flex items-center gap-2 mt-1">
                <div className="h-1.5 flex-1 max-w-[100px] bg-apple-border/50 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: `${Math.min((todayCount / dailyGoal) * 100, 100)}%` }}
                    className="h-full bg-[var(--accent-color)]"
                  />
                </div>
                <p className={`text-[13px] font-black tracking-wider transition-colors duration-500 ${isGoalReached ? 'text-green-600 dark:text-green-400' : 'text-apple-secondary'}`}>
                  {isGoalReached ? t.goalReached : `${todayCount} / ${dailyGoal}`}
                </p>
              </div>
            )}
          </motion.div>
          <div className="flex items-center gap-2 mt-1">
            <button 
              onClick={() => { triggerHaptic('medium'); setIsAIModalOpen(true); }} 
              aria-label="AI Vhľady"
              className="w-10 h-10 rounded-full bg-apple-card border border-apple-border flex items-center justify-center text-xl shadow-sm active:scale-90 transition-transform hover:bg-apple-border/20"
            >
              <span role="img" aria-hidden="true">🔮</span>
            </button>
            <button onClick={() => setIsSettingsOpen(true)} aria-label="Nastavenia profilu" className="active:scale-90 transition-transform">
              {user?.photoURL ? <img src={user.photoURL} alt="Profilová fotka" className="w-10 h-10 rounded-full border border-apple-border shadow-sm" /> : <div className="w-10 h-10 rounded-full bg-apple-card border border-apple-border flex items-center justify-center text-xl">👤</div>}
            </button>
          </div>
        </div>

        {showHeatmap && (
          <div className="mb-2">
            <button 
              onClick={() => { triggerHaptic('light'); setIsHeatmapExpanded(!isHeatmapExpanded); }}
              aria-expanded={isHeatmapExpanded}
              className="text-[10px] font-black uppercase tracking-[0.2em] text-apple-secondary flex items-center gap-1.5 hover:text-apple-text transition-colors mb-2"
            >
              <span>{t.activity}</span>
              <motion.span aria-hidden="true" animate={{ rotate: isHeatmapExpanded ? 180 : 0 }}>↓</motion.span>
            </button>
            <AnimatePresence>
              {isHeatmapExpanded && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} 
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex flex-wrap gap-[4px] justify-start overflow-hidden pb-4"
                >
                  {heatmapData && heatmapData.map((day) => {
                    const intensity = Math.min(day.count, 4);
                    const opacity = intensity === 0 ? 0.15 : 0.35 + (intensity * 0.15);
                    const isFilteredTag = activeTagFilter && day.color === getTagColor(activeTagFilter);
                    const bgColor = day.color && intensity > 0 ? day.color : (intensity > 0 ? 'var(--accent-color)' : 'currentColor');
                    return <div key={day.key} className={`w-[10px] h-[10px] rounded-[2px] shrink-0 transition-all duration-700 ${activeTagFilter && !isFilteredTag ? 'grayscale opacity-5' : ''}`} style={{ backgroundColor: bgColor, opacity: activeTagFilter && !isFilteredTag ? 0.05 : opacity }} />;
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </header>

      <div className="flex justify-start my-6 gap-6 border-b border-apple-border/30">
        <button 
          onClick={() => { triggerHaptic('light'); setView('list'); setCalendarSelectedDate(null); }}
          className={`pb-2 text-sm font-black transition-all relative ${view === 'list' ? 'text-apple-text' : 'text-apple-secondary'}`}
        >
          {view === 'list' && <motion.div layoutId="view-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-color)]" />}
          {t.viewList}
        </button>
        <button 
          onClick={() => { triggerHaptic('light'); setView('calendar'); }}
          className={`pb-2 text-sm font-black transition-all relative ${view === 'calendar' ? 'text-apple-text' : 'text-apple-secondary'}`}
        >
          {view === 'calendar' && <motion.div layoutId="view-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-color)]" />}
          {t.viewCalendar}
        </button>
      </div>

      <main className="pb-32 text-left">
        <AnimatePresence mode="wait">
          {view === 'list' ? (
            <motion.div 
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-0 text-left"
            >
              {!activeTagFilter && showMemory && memoryLog && (
                <MemoryCard log={memoryLog} setShowMemory={setShowMemory} onShare={onShare} />
              )}

              {!activeTagFilter && isEvening && (
                <div className="mb-8">
                  {!hasDailyTop && todayCount > 0 && (
                    <ReflectionCard type="daily" icon="🌟" title={t.reflection} isCompleted={false} setReflectionType={setReflectionType} />
                  )}
                  {isSunday && !hasWeeklyTop && (
                    <ReflectionCard type="weekly" icon="💎" title={t.weeklyReflection} isCompleted={false} setReflectionType={setReflectionType} />
                  )}
                  {isLastDayOfMonth() && !hasMonthlyTop && (
                    <ReflectionCard type="monthly" icon="🏆" title={t.monthlyReflection} isCompleted={false} setReflectionType={setReflectionType} />
                  )}
                </div>
              )}

              <AnimatePresence mode="popLayout">
                {todayLogsList.map((log) => (
                  <motion.div key={log.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}>
                    <LogItem 
                      log={log} 
                      onDelete={deleteLog} 
                      onUpdate={updateLog} 
                      onTagClick={(tag) => { triggerHaptic('medium'); setActiveTagFilter(prev => prev === tag ? null : tag); }} 
                      onShare={onShare}
                      getTagColor={getTagColor}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div 
              key="calendar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <CalendarView 
                logs={logs} 
                onSelectDate={(date) => {
                  triggerHaptic('light');
                  setCalendarSelectedDate(date);
                }}
              />
              
              {calendarSelectedDate && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 border-t border-apple-border/50 pt-6"
                >
                  <h3 className="text-lg font-bold mb-4 text-apple-text">
                    {calendarSelectedDate.toLocaleDateString(lang === 'sk' ? 'sk-SK' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </h3>
                  <div className="space-y-0">
                    {logs.filter(l => {
                      if (!l.timestamp) return false;
                      const logDate = l.timestamp.seconds ? new Date(l.timestamp.seconds * 1000) : l.timestamp.toDate();
                      return logDate.toDateString() === calendarSelectedDate.toDateString();
                    }).length > 0 ? (
                      logs
                        .filter(l => {
                          if (!l.timestamp) return false;
                          const logDate = l.timestamp.seconds ? new Date(l.timestamp.seconds * 1000) : l.timestamp.toDate();
                          return logDate.toDateString() === calendarSelectedDate.toDateString();
                        })
                        .map(log => (
                          <LogItem 
                            key={log.id}
                            log={log} 
                            onDelete={deleteLog} 
                            onUpdate={updateLog} 
                            onTagClick={() => {}} 
                            onShare={onShare}
                            getTagColor={getTagColor}
                          />
                        ))
                    ) : (
                      <p className="text-apple-secondary italic text-center py-4">{t.noLogs}</p>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <div className="fixed inset-x-0 bottom-0 flex flex-col items-center justify-end z-[120] pointer-events-none pb-10">
        <AnimatePresence>
          {!isInputExpanded && (
            <motion.button 
              key="fab" 
              layoutId="fab-container" 
              onClick={() => { triggerHaptic('light'); setIsInputExpanded(true); }} 
              aria-label="Pridať nový zápis"
              style={{ backgroundColor: accentColor }} 
              className="w-16 h-16 shadow-[0_20px_40px_rgba(0,0,0,0.3)] flex items-center justify-center text-white text-4xl pointer-events-auto active:scale-90 transition-transform rounded-full" 
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <span aria-hidden="true">+</span>
            </motion.button>
          )}
          
          {isInputExpanded && (
            <motion.div 
              key="expanded" 
              layoutId="fab-container" 
              role="dialog"
              aria-modal="true"
              aria-label="Formulár pre nový zápis"
              className="fixed inset-0 bg-apple-bg/98 backdrop-blur-3xl flex flex-col items-center justify-end p-8 pointer-events-auto rounded-none" 
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className="w-full max-w-xl flex flex-col h-full pt-12">
                <div className="flex justify-between items-center mb-12">
                  <h2 className="text-xl font-black text-apple-secondary uppercase tracking-widest">{t.newVictory}</h2>
                  <button onClick={() => setIsInputExpanded(false)} aria-label="Zatvoriť formulár" className="text-apple-text font-bold text-2xl p-2 active:opacity-50">✕</button>
                </div>
                
                <form 
                  onSubmit={handleAddLog} 
                  className="flex-1 flex flex-col justify-center gap-12"
                >
                  <div className="relative">
                    <textarea 
                      ref={inputRef} 
                      autoFocus
                      value={inputText} 
                      onChange={(e) => setInputText(e.target.value)} 
                      placeholder={t.placeholder} 
                      aria-label="Text zápisu"
                      className="w-full bg-transparent border-none text-3xl md:text-4xl font-black text-apple-text placeholder:text-apple-secondary/20 focus:ring-0 outline-none resize-none min-h-[150px] text-center" 
                      onKeyDown={(e) => { 
                        if (e.key === 'Enter' && !e.shiftKey) { 
                          if (!isOverLimit) { e.preventDefault(); handleAddLog(); } 
                          else { e.preventDefault(); triggerHaptic('medium'); }
                        } 
                        if (e.key === 'Escape') setIsInputExpanded(false); 
                      }} 
                    />
                    <div className={`text-center mt-4 font-black text-xs tracking-[0.3em] transition-colors duration-300 ${isOverLimit ? 'text-red-500' : isCloseToLimit ? 'text-orange-500' : 'text-apple-secondary/50'}`}>
                      {remainingChars}
                    </div>
                  </div>
                  
                  <div className="pb-12">
                    <button 
                      type="submit" 
                      disabled={isOverLimit || !inputText.trim()}
                      style={{ backgroundColor: isOverLimit ? '#3a3a3c' : accentColor }} 
                      className={`w-full py-6 rounded-[2.5rem] text-white font-black text-xl shadow-2xl transition-all ${isOverLimit || !inputText.trim() ? 'opacity-50 cursor-not-allowed' : 'active:scale-95 shadow-[0_20px_50px_rgba(0,0,0,0.2)]'}`}
                    >
                      {t.save}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}