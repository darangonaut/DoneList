import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogItem } from './LogItem';

export function ReflectionModal({ isOpen, type, candidates, onSelect, onClose, t, lang, getTagColor, formatTimestamp }) {
  if (!type) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: '100%' }} 
          animate={{ y: 0, opacity: 1 }} 
          exit={{ y: '100%', opacity: 0 }} 
          className="fixed inset-0 bg-apple-bg/95 backdrop-blur-3xl z-[200] p-6 flex flex-col items-center"
        >
          <div className="w-full max-w-xl flex flex-col h-full text-left">
            <div className="flex justify-between items-center mb-12 mt-10">
              <div>
                <h2 className={`text-3xl font-bold tracking-tight flex items-center gap-2 
                  ${type === 'daily' ? 'text-yellow-500' : type === 'weekly' ? 'text-blue-400' : 'text-purple-500'}`}>
                  {type === 'daily' ? '🌟 ' + t.reflectionTitle : type === 'weekly' ? '💎 ' + t.weeklyReflection : '🏆 ' + t.monthlyReflection}
                </h2>
                <p className="text-apple-secondary text-[15px] mt-1">
                  {type === 'daily' ? t.reflectionSubtitle : type === 'weekly' ? t.weeklyReflectionSubtitle : t.monthlyReflectionSubtitle}
                </p>
              </div>
              <button onClick={onClose} className="text-blue-500 font-bold">{t.back}</button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 pb-10">
              {candidates.length > 0 ? candidates.map(log => (
                <LogItem 
                  key={log.id} 
                  log={log} 
                  isSelectable={true} 
                  onSelect={onSelect} 
                  lang={lang} 
                  t={t} 
                  getTagColor={getTagColor}
                  formatTimestamp={formatTimestamp}
                />
              )) : (
                <div className="text-center py-20 text-apple-secondary italic opacity-50">
                  {type === 'daily' ? t.noTodayLogs : type === 'weekly' ? 'Najprv si vyber denné víťazstvá (🌟) počas týždňa!' : 'Najprv si vyber týždenné klenoty (💎)!'}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
