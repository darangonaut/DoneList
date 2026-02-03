import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ACCENT_COLORS = [
  { id: 'orange', value: '#F97316' },
  { id: 'blue', value: '#007AFF' },
  { id: 'purple', value: '#AF52DE' },
  { id: 'green', value: '#34C759' },
  { id: 'pink', value: '#FF2D55' },
  { id: 'indigo', value: '#5856D6' }
];

export function SettingsModal({ 
  isOpen, onClose, user, t, lang, setLang, accentColor, setAccentColor, handleLogout,
  showStreak, setShowStreak, showHeatmap, setShowHeatmap, hapticEnabled, setHapticEnabled,
  dailyGoal, setDailyGoal, exportData, deleteAllData, updateAvailable, onUpdate
}) {
  const Toggle = ({ label, value, onChange }) => (
    <div className="flex justify-between items-center p-4 border-b border-apple-border last:border-0">
      <span className="text-[17px] text-apple-text font-medium">{label}</span>
      <button 
        onClick={() => onChange(!value)}
        className={`w-12 h-7 rounded-full transition-colors duration-200 relative ${value ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
      >
        <motion.div 
          initial={false}
          animate={{ x: value ? 22 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-1 left-0 w-5 h-5 bg-white rounded-full shadow-md"
        />
      </button>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ y: '100%' }} 
          animate={{ y: 0 }} 
          exit={{ y: '100%' }} 
          transition={{ type: 'spring', damping: 25, stiffness: 200 }} 
          className="fixed inset-0 bg-apple-bg/95 backdrop-blur-3xl z-[150] px-6 pt-12 overflow-y-auto pb-20"
        >
          <div className="max-w-xl mx-auto">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-bold tracking-tight text-apple-text">{t.settings}</h2>
              <button onClick={onClose} className="text-blue-500 font-semibold text-[17px]">{t.back}</button>
            </div>
            
            <div className="space-y-8 text-left">
              {/* Account Section */}
              <div>
                <p className="text-[13px] text-apple-secondary uppercase tracking-wider mb-2 ml-4">{t.account}</p>
                <div className="bg-apple-card/80 rounded-2xl border border-apple-border overflow-hidden">
                  <div className="p-4 flex items-center gap-4 text-left">
                    {user.photoURL && <img src={user.photoURL} className="w-12 h-12 rounded-full" alt="Avatar" />}
                    <div className="text-left">
                      <p className="font-bold text-[17px] text-apple-text">{user.displayName}</p>
                      <p className="text-apple-secondary text-[14px]">{user.email}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Goals Section */}
              <div>
                <p className="text-[13px] text-apple-secondary uppercase tracking-wider mb-2 ml-4">{t.dailyGoal}</p>
                <div className="bg-apple-card/80 rounded-2xl border border-apple-border p-4 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[17px] text-apple-text font-medium">{t.goalLabel}</span>
                    <span className="text-2xl font-black text-[var(--accent-color)]">{dailyGoal}</span>
                  </div>
                  <input 
                    type="range" min="1" max="10" value={dailyGoal} 
                    onChange={(e) => setDailyGoal(parseInt(e.target.value))}
                    className="w-full accent-[var(--accent-color)]"
                  />
                </div>
              </div>

              {/* Display Section */}
              <div>
                <p className="text-[13px] text-apple-secondary uppercase tracking-wider mb-2 ml-4">{lang === 'sk' ? 'Zobrazenie a odozva' : 'Display & Feedback'}</p>
                <div className="bg-apple-card/80 rounded-2xl border border-apple-border overflow-hidden">
                  <Toggle label={lang === 'sk' ? 'Zobraziť sériu (🔥)' : 'Show Streak'} value={showStreak} onChange={setShowStreak} />
                  <Toggle label={lang === 'sk' ? 'Zobraziť heatmapu' : 'Show Heatmap'} value={showHeatmap} onChange={setShowHeatmap} />
                  <Toggle label={lang === 'sk' ? 'Haptická odozva' : 'Haptic Feedback'} value={hapticEnabled} onChange={setHapticEnabled} />
                </div>
              </div>

              {/* Data Management Section */}
              <div>
                <p className="text-[13px] text-apple-secondary uppercase tracking-wider mb-2 ml-4">{t.dataManagement}</p>
                <div className="bg-apple-card/80 rounded-2xl border border-apple-border overflow-hidden">
                  <button onClick={exportData} className="w-full p-4 flex justify-between items-center border-b border-apple-border active:bg-apple-border/10 text-blue-500 font-medium">
                    <span>{t.exportData}</span>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  </button>
                  <button onClick={deleteAllData} className="w-full p-4 flex justify-between items-center active:bg-red-500/10 text-red-500 font-medium">
                    <span>{t.deleteAllData}</span>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>

              {/* Accent Color Section */}
              <div>
                <p className="text-[13px] text-apple-secondary uppercase tracking-wider mb-2 ml-4">{t.accentColor}</p>
                <div className="bg-apple-card/80 rounded-2xl border border-apple-border p-5">
                  <div className="grid grid-cols-6 gap-2">
                    {ACCENT_COLORS.map(color => (
                      <button 
                        key={color.id} 
                        onClick={() => setAccentColor(color.value)} 
                        className={`aspect-square rounded-full border-2 transition-all ${accentColor === color.value ? 'border-apple-text scale-110 shadow-lg' : 'border-transparent'}`} 
                        style={{ backgroundColor: color.value }} 
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Language Section */}
              <div>
                <p className="text-[13px] text-apple-secondary uppercase tracking-wider mb-2 ml-4">{t.language}</p>
                <div className="bg-apple-card/80 rounded-2xl border border-apple-border overflow-hidden">
                  <button onClick={() => setLang('sk')} className="w-full p-4 flex justify-between items-center border-b border-apple-border active:bg-apple-border/10">
                    <span className="text-[17px] text-apple-text">Slovenčina</span>
                    {lang === 'sk' && <span className="text-blue-500">✓</span>}
                  </button>
                  <button onClick={() => setLang('en')} className="w-full p-4 flex justify-between items-center active:bg-apple-border/10">
                    <span className="text-[17px] text-apple-text">English</span>
                    {lang === 'en' && <span className="text-blue-500">✓</span>}
                  </button>
                </div>
              </div>

              {/* About Section */}
              <div>
                <p className="text-[13px] text-apple-secondary uppercase tracking-wider mb-2 ml-4">{lang === 'sk' ? 'O aplikácii' : 'About'}</p>
                <div className="bg-apple-card/80 rounded-2xl border border-apple-border overflow-hidden">
                  <div className="p-4 flex justify-between items-center border-b border-apple-border">
                    <span className="text-[17px] text-apple-text font-medium">{lang === 'sk' ? 'Verzia' : 'Version'}</span>
                    <span className="text-apple-secondary">1.2.1</span>
                  </div>
                  <button 
                    onClick={() => {
                      if (updateAvailable) {
                        onUpdate();
                      } else {
                        alert(lang === 'sk' ? 'Tvoja aplikácia je aktuálna!' : 'Your app is up to date!');
                      }
                    }}
                    className={`w-full p-4 flex justify-between items-center active:bg-apple-border/10 transition-colors ${updateAvailable ? 'bg-blue-500/10' : ''}`}
                  >
                    <span className={`text-[17px] font-semibold ${updateAvailable ? 'text-blue-500' : 'text-apple-text'}`}>
                      {updateAvailable 
                        ? (lang === 'sk' ? 'Aktualizovať teraz ✨' : 'Update Now ✨')
                        : (lang === 'sk' ? 'Skontrolovať aktualizácie' : 'Check for Updates')}
                    </span>
                    {updateAvailable && <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />}
                  </button>
                </div>
              </div>

              <button 
                onClick={handleLogout} 
                className="w-full bg-apple-card/80 rounded-2xl border border-apple-border p-4 text-red-500 font-bold text-[17px] active:bg-red-500/10"
              >
                {t.logout}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}