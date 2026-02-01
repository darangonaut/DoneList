import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toPng } from 'html-to-image';

export function VictoryCard({ isOpen, log, onClose, t, accentColor }) {
  const cardRef = useRef(null);

  if (!log) return null;

  const handleDownload = async () => {
    if (cardRef.current === null) return;
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 3 });
      const link = document.createElement('a');
      link.download = `donelist-victory-${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  const getWinLabel = () => {
    if (log.isMonthlyTop) return t.monthlyWin;
    if (log.isWeeklyTop) return t.weeklyWin;
    return t.dailyWin;
  };

  const getWinIcon = () => {
    if (log.isMonthlyTop) return "🏆";
    if (log.isWeeklyTop) return "💎";
    return "🌟";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[300] flex flex-col items-center justify-center p-6 overflow-y-auto"
        >
          <div className="w-full max-w-sm flex flex-col items-center gap-10 py-10">
            
            {/* THE CARD ITSELF - This is what gets screenshotted */}
            <div 
              ref={cardRef}
              className="w-full aspect-[4/5] rounded-[3rem] relative overflow-hidden shadow-2xl flex flex-col p-10 justify-between text-white"
              style={{ backgroundColor: '#000' }}
            >
              {/* Background Glow */}
              <div className="absolute inset-0 z-0">
                <div 
                  className="absolute top-[-20%] left-[-20%] w-[100%] h-[100%] rounded-full blur-[80px] opacity-40"
                  style={{ backgroundColor: accentColor }}
                />
                <div 
                  className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full blur-[60px] opacity-30"
                  style={{ backgroundColor: accentColor }}
                />
              </div>

              {/* Header */}
              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-1">{getWinLabel()}</p>
                  <h2 className="text-3xl font-black tracking-tighter">DoneList</h2>
                </div>
                <span className="text-4xl">{getWinIcon()}</span>
              </div>

              {/* Content */}
              <div className="relative z-10">
                <p className="text-2xl md:text-3xl font-bold leading-tight tracking-tight mb-6">
                  {log.text}
                </p>
              </div>

              {/* Footer */}
              <div className="relative z-10 flex justify-between items-end border-t border-white/10 pt-6">
                <div className="opacity-40">
                  <p className="text-[10px] font-bold uppercase tracking-widest">
                    {new Date(log.timestamp?.seconds * 1000).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="bg-white/10 px-3 py-1 rounded-full border border-white/10">
                  <p className="text-[8px] font-black uppercase tracking-widest">Victory Card</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col w-full gap-4 relative z-10">
              <button 
                onClick={handleDownload}
                style={{ backgroundColor: accentColor }}
                className="w-full py-5 rounded-3xl text-white font-black text-xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {t.saveImage}
              </button>
              <button 
                onClick={onClose}
                className="w-full py-4 text-white/50 font-bold text-lg"
              >
                {t.back}
              </button>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
