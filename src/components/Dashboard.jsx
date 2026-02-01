import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogItem } from './LogItem';

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
  const remainingChars = MAX_LENGTH - inputText.length;
  const isCloseToLimit = remainingChars <= 20;
  const isOverLimit = remainingChars < 0;

  const todayCount = logs.filter(log => {
    if (!log.timestamp) return false;
    const date = new Date(log.timestamp.seconds * 1000);
    return date.toDateString() === new Date().toDateString();
  }).length;

  const isGoalReached = todayCount >= dailyGoal;

  return (
    <div className="max-w-xl mx-auto px-6 relative z-10 text-left">
      <header className="pt-12 pb-6 sticky top-0 bg-apple-bg/60 backdrop-blur-xl z-30 border-b border-apple-border/50 shadow-sm -mx-6 px-6 text-left">
        <div className="flex justify-between items-end mb-8 text-left">
          <motion.div layout className="text-left">
            <div className="flex items-center gap-2 mb-1 flex-wrap justify-start">
              <p className="text-xs font-semibold text-apple-secondary uppercase tracking-widest">
                {new Date().toLocaleDateString(lang === 'sk' ? 'sk-SK' : 'en-US', { day: 'numeric', month: 'long' })}
              </p>
              
              <AnimatePresence mode="wait">
                {showStreak && streak > 0 && (
                  <motion.span 
                    key={streak} 
                    initial={{ scale: 0.5, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    exit={{ scale: 0.5, opacity: 0 }}
                    className="flex items-center gap-1 text-sm font-bold bg-[var(--accent-color)]/10 text-[var(--accent-color)] px-2 py-0.5 rounded-full border border-[var(--accent-color)]/20 shadow-sm"
                  >
                    🔥 {streak}
                  </motion.span>
                )}
              </AnimatePresence>
              
              {isEvening && (
                <div className="flex gap-1">
                  <button onClick={() => setReflectionType('daily')} className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border transition-all ${hasDailyTop ? 'bg-yellow-400/10 border-yellow-400/20 text-yellow-600 dark:text-yellow-400 opacity-60' : 'bg-yellow-400/30 border-yellow-400/50 text-yellow-700 dark:text-yellow-300 animate-pulse'}`}>🌟 {t.reflection}</button>
                  {isSunday && <button onClick={() => setReflectionType('weekly')} className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border transition-all ${hasWeeklyTop ? 'bg-blue-400/10 border-blue-400/20 text-blue-600 dark:text-blue-400 opacity-60' : 'bg-blue-400/30 border-blue-400/50 text-blue-700 dark:text-blue-200 animate-bounce'}`}>💎 {t.weeklyReflection}</button>}
                  {isLastDayOfMonth() && <button onClick={() => setReflectionType('monthly')} className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border transition-all ${hasMonthlyTop ? 'bg-purple-400/10 border-purple-400/20 text-purple-600 dark:text-purple-400 opacity-60' : 'bg-purple-400/30 border-purple-400/50 text-purple-700 dark:text-purple-200 animate-pulse'}`}>🏆 {t.monthlyReflection}</button>}
                </div>
              )}
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-apple-text text-left">
              {activeTagFilter ? <span className="flex items-center gap-2">Focus: <span style={{ color: getTagColor(activeTagFilter) }}>{activeTagFilter}</span></span> : t.title}
            </h1>
            {/* Goal Progress */}
            {!activeTagFilter && (
              <p className={`text-[13px] font-medium mt-1 transition-colors duration-500 ${isGoalReached ? 'text-green-500' : 'text-apple-secondary'}`}>
                {isGoalReached ? t.goalReached : t.goalProgress.replace('{count}', todayCount).replace('{goal}', dailyGoal)}
              </p>
            )}
          </motion.div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { triggerHaptic('medium'); setIsAIModalOpen(true); }} 
              className="w-10 h-10 rounded-full bg-apple-card border border-apple-border flex items-center justify-center text-xl shadow-sm active:scale-90 transition-transform hover:bg-apple-border/20"
              title={t.aiMotivator}
            >
              🔮
            </button>
            <button onClick={() => setIsSettingsOpen(true)} className="active:scale-90 transition-transform">
              {user?.photoURL ? <img src={user.photoURL} alt="P" className="w-10 h-10 rounded-full border border-apple-border shadow-sm" /> : <div className="w-10 h-10 rounded-full bg-apple-card border border-apple-border flex items-center justify-center">👤</div>}
            </button>
          </div>
        </div>

        {showHeatmap && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex flex-wrap gap-[4px] justify-center overflow-x-auto pb-4 px-2"
          >
            {heatmapData && heatmapData.map((day) => {
              const intensity = Math.min(day.count, 4);
              const opacity = intensity === 0 ? 0.1 : 0.25 + (intensity * 0.18);
              const isFilteredTag = activeTagFilter && day.color === getTagColor(activeTagFilter);
              const bgColor = day.color && intensity > 0 ? day.color : (intensity > 0 ? 'var(--accent-color)' : 'currentColor');
              return <div key={day.key} className={`w-[11px] h-[11px] rounded-[2.5px] shrink-0 transition-all duration-700 ${activeTagFilter && !isFilteredTag ? 'grayscale opacity-5' : ''}`} style={{ backgroundColor: bgColor, opacity: activeTagFilter && !isFilteredTag ? 0.05 : opacity }} />;
            })}
          </motion.div>
        )}

        <AnimatePresence>
          {activeTagFilter && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex justify-center mt-4">
              <button 
                onClick={() => setActiveTagFilter(null)}
                className="text-xs font-bold bg-apple-card/80 backdrop-blur-md border border-apple-border px-4 py-1.5 rounded-full shadow-sm text-apple-secondary active:scale-95 transition-all"
              >
                ✕ Zrušiť filter
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="mt-6 pb-20 text-left">
        <motion.div layout className="space-y-0 text-left">
          <AnimatePresence mode="popLayout">
            {logs.map((log) => (
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
                  formatTimestamp={(ts) => {
                    if (!ts) return '';
                    const date = new Date(ts.seconds * 1000);
                    const now = new Date();
                    if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const yesterday = new Date(); yesterday.setDate(now.getDate() - 1);
                    if (date.toDateString() === yesterday.toDateString()) return `${t.yesterday}, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                    return `${date.toLocaleDateString(lang === 'sk' ? 'sk-SK' : 'en-US', { day: 'numeric', month: 'numeric', year: 'numeric' })}, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                  }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          {logs.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 text-apple-secondary font-medium italic">
              {activeTagFilter ? `Nenašiel som žiadne záznamy s ${activeTagFilter}` : t.noLogs}
            </motion.div>
          )}
        </motion.div>
        {hasMore && logs.length > 0 && !activeTagFilter && (
          <div className="flex justify-center mt-6">
            <button onClick={() => setLimitCount(prev => prev + 20)} className="text-sm font-semibold text-apple-secondary active:opacity-50">
              {t.loadMore}
            </button>
          </div>
        )}
      </main>

      <div className="fixed inset-0 flex items-center justify-center z-[120] pointer-events-none">
        <AnimatePresence>
          {!isInputExpanded && (
            <motion.button key="fab" layoutId="fab-container" onClick={() => { triggerHaptic('light'); setIsInputExpanded(true); }} style={{ backgroundColor: accentColor, bottom: '2.5rem', position: 'fixed', borderRadius: '100px' }} className="w-16 h-16 shadow-[0_20px_40px_rgba(0,0,0,0.3)] flex items-center justify-center text-white text-4xl pointer-events-auto active:scale-90 transition-transform" transition={{ type: 'spring', damping: 25, stiffness: 200 }}>+</motion.button>
          )}
          {isInputExpanded && (
            <motion.div key="expanded" layoutId="fab-container" className="fixed inset-0 bg-apple-bg/95 backdrop-blur-3xl flex flex-col items-center justify-center p-8 pointer-events-auto" style={{ borderRadius: '0px' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}>
              <div className="w-full max-w-xl relative text-center">
                <button onClick={() => setIsInputExpanded(false)} className="absolute -top-32 right-0 text-apple-secondary font-bold text-lg p-4 active:opacity-50">{t.back}</button>
                <form onSubmit={addLog} className="w-full space-y-8">
                  <div className="relative">
                    <textarea 
                      ref={inputRef} 
                      value={inputText} 
                      onChange={(e) => setInputText(e.target.value)} 
                      placeholder={t.placeholder} 
                      className="w-full bg-transparent border-none text-3xl md:text-4xl font-bold text-apple-text placeholder:text-apple-secondary/30 focus:ring-0 outline-none resize-none min-h-[200px]" 
                      onKeyDown={(e) => { 
                        if (e.key === 'Enter' && !e.shiftKey) { 
                          if (!isOverLimit) {
                            e.preventDefault(); 
                            addLog(); 
                          } else {
                            e.preventDefault();
                            triggerHaptic('medium');
                          }
                        } 
                        if (e.key === 'Escape') setIsInputExpanded(false); 
                      }} 
                    />
                    <div className={`absolute -bottom-4 right-0 font-black text-sm tracking-widest transition-colors duration-300 ${isOverLimit ? 'text-red-500' : isCloseToLimit ? 'text-orange-500' : 'text-apple-secondary/40'}`}>
                      {remainingChars}
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    disabled={isOverLimit || !inputText.trim()}
                    style={{ backgroundColor: isOverLimit ? '#3a3a3c' : accentColor }} 
                    className={`w-full py-5 rounded-[2rem] text-white font-black text-xl shadow-2xl transition-all ${isOverLimit || !inputText.trim() ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                  >
                    {lang === 'sk' ? 'Uložiť víťazstvo' : 'Save Victory'}
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}