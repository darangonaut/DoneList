import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogItem } from './LogItem';
import { CalendarView } from './CalendarView';

const MAX_LENGTH = 280;

export function Dashboard({ 
  user, logs, streak, heatmapData, t, lang, 
  activeTagFilter, setActiveTagFilter, getTagColor,
  isEvening, isSunday, isLastDayOfMonth, hasDailyTop, hasWeeklyTop, hasMonthlyTop,
  setIsSettingsOpen, setReflectionType, setIsAIModalOpen, handleDelete, updateDoc, db, doc,
  isInputExpanded, setIsInputExpanded, inputText, setInputText, addLog, inputRef, 
  accentColor, triggerHaptic, hasMore, setLimitCount, onShare,
  showStreak, showHeatmap, dailyGoal
}) {
  const [view, setView] = useState('list'); // 'list' | 'calendar'
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(null);
  const [isHeatmapExpanded, setIsHeatmapExpanded] = useState(false);

  const remainingChars = MAX_LENGTH - inputText.length;
  const isCloseToLimit = remainingChars <= 20;
  const isOverLimit = remainingChars < 0;

  const todayLogsList = logs.filter(log => {
    if (!log.timestamp) return false;
    const date = new Date(log.timestamp.seconds * 1000);
    return date.toDateString() === new Date().toDateString();
  });
  
  const todayCount = todayLogsList.length;
  const isGoalReached = todayCount >= dailyGoal;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (lang === 'sk') {
      if (hour < 10) return `Dobré ráno, ${user.displayName.split(' ')[0]} 🌅`;
      if (hour < 18) return `Tvoj úspešný deň, ${user.displayName.split(' ')[0]} ✨`;
      return `Dobrý večer, ${user.displayName.split(' ')[0]} 🌙`;
    }
    if (hour < 10) return `Good morning, ${user.displayName.split(' ')[0]} 🌅`;
    if (hour < 18) return `Your productive day, ${user.displayName.split(' ')[0]} ✨`;
    return `Good evening, ${user.displayName.split(' ')[0]} 🌙`;
  };

  const ReflectionCard = ({ type, icon, title, isCompleted }) => (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => !isCompleted && setReflectionType(type)}
      className={`w-full p-6 rounded-[2rem] border mb-6 flex items-center justify-between transition-all active:scale-[0.98] ${
        isCompleted 
          ? 'bg-apple-card/40 border-apple-border/50 opacity-60' 
          : 'bg-apple-card border-apple-border shadow-lg shadow-[var(--accent-color)]/5'
      }`}
    >
      <div className="flex items-center gap-4">
        <span className={`text-3xl ${!isCompleted ? 'animate-pulse' : ''}`}>{icon}</span>
        <div className="text-left">
          <p className="text-[13px] font-bold uppercase tracking-widest text-apple-secondary mb-0.5">{lang === 'sk' ? 'Čas na reflexiu' : 'Reflection Time'}</p>
          <h3 className="text-xl font-bold text-apple-text">{title}</h3>
        </div>
      </div>
      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-apple-border'}`}>
        {isCompleted ? '✓' : '→'}
      </div>
    </motion.button>
  );

  return (
    <div className="max-w-xl mx-auto px-6 relative z-10 text-left">
      <header className="pt-12 pb-4 sticky top-0 bg-apple-bg/60 backdrop-blur-xl z-30 border-b border-apple-border/30 -mx-6 px-6 text-left">
        <div className="flex justify-between items-start mb-6 text-left">
          <motion.div layout className="text-left flex-1 pr-4">
            <div className="flex items-center gap-2 mb-1 flex-wrap justify-start">
              <p className="text-xs font-bold text-apple-secondary uppercase tracking-[0.15em]">
                {new Date().toLocaleDateString(lang === 'sk' ? 'sk-SK' : 'en-US', { day: 'numeric', month: 'long' })}
              </p>
              
              <AnimatePresence mode="wait">
                {showStreak && streak > 0 && (
                  <motion.span 
                    key={streak} 
                    initial={{ scale: 0.5, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    className="flex items-center gap-1 text-[11px] font-black bg-[var(--accent-color)]/10 text-[var(--accent-color)] px-2 py-0.5 rounded-full border border-[var(--accent-color)]/20 shadow-sm"
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
                <span className="bg-gradient-to-br from-apple-text to-apple-text/60 bg-clip-text text-transparent">
                  {getGreeting()}
                </span>
              )}
            </h1>
            {!activeTagFilter && (
              <div className="flex items-center gap-2 mt-1">
                <div className="h-1 flex-1 max-w-[100px] bg-apple-border/50 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: `${Math.min((todayCount / dailyGoal) * 100, 100)}%` }}
                    className="h-full bg-[var(--accent-color)]"
                  />
                </div>
                <p className={`text-[12px] font-bold transition-colors duration-500 ${isGoalReached ? 'text-green-500' : 'text-apple-secondary'}`}>
                  {isGoalReached ? t.goalReached : `${todayCount} / ${dailyGoal}`}
                </p>
              </div>
            )}
          </motion.div>
          <div className="flex items-center gap-2 mt-1">
            <button 
              onClick={() => { triggerHaptic('medium'); setIsAIModalOpen(true); }} 
              className="w-10 h-10 rounded-full bg-apple-card border border-apple-border flex items-center justify-center text-xl shadow-sm active:scale-90 transition-transform hover:bg-apple-border/20"
            >
              🔮
            </button>
            <button onClick={() => setIsSettingsOpen(true)} className="active:scale-90 transition-transform">
              {user?.photoURL ? <img src={user.photoURL} alt="P" className="w-10 h-10 rounded-full border border-apple-border shadow-sm" /> : <div className="w-10 h-10 rounded-full bg-apple-card border border-apple-border flex items-center justify-center">👤</div>}
            </button>
          </div>
        </div>

        {showHeatmap && (
          <div className="mb-2">
            <button 
              onClick={() => { triggerHaptic('light'); setIsHeatmapExpanded(!isHeatmapExpanded); }}
              className="text-[10px] font-black uppercase tracking-widest text-apple-secondary flex items-center gap-1.5 hover:text-apple-text transition-colors mb-2"
            >
              <span>{lang === 'sk' ? 'Aktivita' : 'Activity'}</span>
              <motion.span animate={{ rotate: isHeatmapExpanded ? 180 : 0 }}>↓</motion.span>
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
                    const opacity = intensity === 0 ? 0.1 : 0.25 + (intensity * 0.18);
                    const isFilteredTag = activeTagFilter && day.color === getTagColor(activeTagFilter);
                    const bgColor = day.color && intensity > 0 ? day.color : (intensity > 0 ? 'var(--accent-color)' : 'currentColor');
                    return <div key={day.key} className={`w-[10px] h-[10px] rounded-[2px] shrink-0 transition-all duration-700 ${activeTagFilter && !isFilteredTag ? 'grayscale opacity-5' : ''}`} style={{ backgroundColor: bgColor, opacity: activeTagFilter && !isFilteredTag ? 0.05 : opacity }} />;
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <AnimatePresence>
          {activeTagFilter && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex justify-start mt-2 pb-2">
              <button 
                onClick={() => setActiveTagFilter(null)}
                className="text-[10px] font-black uppercase tracking-widest bg-[var(--accent-color)] text-white px-3 py-1 rounded-full shadow-sm active:scale-95 transition-all"
              >
                ✕ {activeTagFilter}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* View Switcher - Minimalist */}
      <div className="flex justify-start my-6 gap-6 border-b border-apple-border/30">
        <button 
          onClick={() => { triggerHaptic('light'); setView('list'); setCalendarSelectedDate(null); }}
          className={`pb-2 text-sm font-bold transition-all relative ${view === 'list' ? 'text-apple-text' : 'text-apple-secondary'}`}
        >
          {t.viewList}
          {view === 'list' && <motion.div layoutId="view-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-color)]" />}
        </button>
        <button 
          onClick={() => { triggerHaptic('light'); setView('calendar'); }}
          className={`pb-2 text-sm font-bold transition-all relative ${view === 'calendar' ? 'text-apple-text' : 'text-apple-secondary'}`}
        >
          {t.viewCalendar}
          {view === 'calendar' && <motion.div layoutId="view-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-color)]" />}
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
              {/* Contextual Reflection Prompts */}
              {!activeTagFilter && isEvening && (
                <div className="mb-8">
                  {!hasDailyTop && todayCount > 0 && (
                    <ReflectionCard type="daily" icon="🌟" title={t.reflection} isCompleted={false} />
                  )}
                  {isSunday && !hasWeeklyTop && (
                    <ReflectionCard type="weekly" icon="💎" title={t.weeklyReflection} isCompleted={false} />
                  )}
                  {isLastDayOfMonth() && !hasMonthlyTop && (
                    <ReflectionCard type="monthly" icon="🏆" title={t.monthlyReflection} isCompleted={false} />
                  )}
                </div>
              )}

              <AnimatePresence mode="popLayout">
                {todayLogsList.map((log) => (
                  <motion.div key={log.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}>
                    <LogItem 
                      log={log} 
                      onDelete={handleDelete} 
                      onUpdate={(id, txt) => updateDoc(doc(db, 'logs', id), { text: txt })} 
                      onTagClick={(tag) => { triggerHaptic('medium'); setActiveTagFilter(prev => prev === tag ? null : tag); }} 
                      onShare={onShare}
                      lang={lang} 
                      t={t}
                      getTagColor={getTagColor}
                      triggerHaptic={triggerHaptic}
                      formatTimestamp={(ts) => {
                        if (!ts) return '';
                        const date = new Date(ts.seconds * 1000);
                        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {todayCount === 0 && !activeTagFilter && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="text-center py-20 px-10"
                >
                  <div className="text-5xl mb-6 opacity-20 italic">✨</div>
                  <h3 className="text-xl font-bold text-apple-text mb-2">
                    {lang === 'sk' ? `Čo sa ti dnes podarilo, ${user.displayName.split(' ')[0]}?` : `What did you achieve today, ${user.displayName.split(' ')[0]}?`}
                  </h3>
                  <p className="text-apple-secondary text-[15px] leading-relaxed italic">
                    {lang === 'sk' ? 'Aj ten najmenší krok vpred je víťazstvo, ktoré stojí za zápis.' : 'Even the smallest step forward is a victory worth recording.'}
                  </p>
                  <button 
                    onClick={() => { triggerHaptic('light'); setIsInputExpanded(true); }}
                    style={{ color: accentColor }}
                    className="mt-8 font-black text-sm uppercase tracking-widest animate-pulse"
                  >
                    {lang === 'sk' ? '+ Pridať prvé víťazstvo' : '+ Add your first win'}
                  </button>
                </motion.div>
              )}
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
                t={t} 
                lang={lang} 
                accentColor={accentColor}
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
                    {logs.filter(l => l.timestamp && new Date(l.timestamp.seconds * 1000).toDateString() === calendarSelectedDate.toDateString()).length > 0 ? (
                      logs
                        .filter(l => l.timestamp && new Date(l.timestamp.seconds * 1000).toDateString() === calendarSelectedDate.toDateString())
                        .map(log => (
                          <LogItem 
                            key={log.id}
                            log={log} 
                            onDelete={handleDelete} 
                            onUpdate={(id, txt) => updateDoc(doc(db, 'logs', id), { text: txt })} 
                            onTagClick={() => {}} 
                            onShare={onShare}
                            lang={lang} 
                            t={t}
                            getTagColor={getTagColor}
                            triggerHaptic={triggerHaptic}
                            formatTimestamp={(ts) => {
                                const date = new Date(ts.seconds * 1000);
                                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            }}
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

      {/* FAB & Input - UX Refined */}
      <div className="fixed inset-x-0 bottom-0 flex flex-col items-center justify-end z-[120] pointer-events-none pb-10">
        <AnimatePresence>
          {!isInputExpanded && (
            <motion.button 
              key="fab" 
              layoutId="fab-container" 
              onClick={() => { triggerHaptic('light'); setIsInputExpanded(true); }} 
              style={{ backgroundColor: accentColor }} 
              className="w-16 h-16 shadow-[0_20px_40px_rgba(0,0,0,0.3)] flex items-center justify-center text-white text-4xl pointer-events-auto active:scale-90 transition-transform rounded-full" 
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              +
            </motion.button>
          )}
          
          {isInputExpanded && (
            <motion.div 
              key="expanded" 
              layoutId="fab-container" 
              className="fixed inset-0 bg-apple-bg/98 backdrop-blur-3xl flex flex-col items-center justify-end p-8 pointer-events-auto rounded-none" 
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className="w-full max-w-xl flex flex-col h-full pt-12">
                <div className="flex justify-between items-center mb-12">
                  <h2 className="text-xl font-black text-apple-secondary uppercase tracking-widest">{lang === 'sk' ? 'Nové víťazstvo' : 'New Victory'}</h2>
                  <button onClick={() => setIsInputExpanded(false)} className="text-apple-text font-bold text-lg p-2 active:opacity-50">✕</button>
                </div>
                
                <form 
                  onSubmit={(e) => {
                    triggerHaptic('success');
                    // Add a temporary flash effect
                    const el = e.currentTarget;
                    el.style.filter = 'brightness(1.5) saturate(1.2)';
                    setTimeout(() => el.style.filter = '', 200);
                    addLog(e);
                  }} 
                  className="flex-1 flex flex-col justify-center gap-12"
                >
                  <div className="relative">
                    <textarea 
                      ref={inputRef} 
                      autoFocus
                      value={inputText} 
                      onChange={(e) => setInputText(e.target.value)} 
                      placeholder={t.placeholder} 
                      className="w-full bg-transparent border-none text-3xl md:text-5xl font-black text-apple-text placeholder:text-apple-secondary/20 focus:ring-0 outline-none resize-none min-h-[150px] text-center" 
                      onKeyDown={(e) => { 
                        if (e.key === 'Enter' && !e.shiftKey) { 
                          if (!isOverLimit) { e.preventDefault(); addLog(); } 
                          else { e.preventDefault(); triggerHaptic('medium'); }
                        } 
                        if (e.key === 'Escape') setIsInputExpanded(false); 
                      }} 
                    />
                    <div className={`text-center mt-4 font-black text-xs tracking-[0.3em] transition-colors duration-300 ${isOverLimit ? 'text-red-500' : isCloseToLimit ? 'text-orange-500' : 'text-apple-secondary/30'}`}>
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
                      {lang === 'sk' ? 'Uložiť' : 'Save'}
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