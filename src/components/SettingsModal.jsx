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

export function SettingsModal({ isOpen, onClose, user, t, lang, setLang, accentColor, setAccentColor, handleLogout }) {
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
              <h2 className="text-3xl font-bold tracking-tight">{t.settings}</h2>
              <button onClick={onClose} className="text-blue-500 font-semibold text-[17px]">{t.back}</button>
            </div>
            
            <div className="space-y-8 text-left">
              <div>
                <p className="text-[13px] text-apple-secondary uppercase tracking-wider mb-2 ml-4">{t.account}</p>
                <div className="bg-apple-card/80 rounded-2xl border border-apple-border overflow-hidden">
                  <div className="p-4 flex items-center gap-4">
                    {user.photoURL && <img src={user.photoURL} className="w-12 h-12 rounded-full" alt="Avatar" />}
                    <div>
                      <p className="font-bold text-[17px] text-apple-text">{user.displayName}</p>
                      <p className="text-apple-secondary text-[14px]">{user.email}</p>
                    </div>
                  </div>
                </div>
              </div>

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
