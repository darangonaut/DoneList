import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useApp } from '../context/AppContext';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export function AIInsightModal({ isOpen, onClose, logs }) {
  const { t, lang, accentColor } = useApp();
  const [insight, setInsight] = useState('');
  const [superpowers, setSuperpowers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateInsight = async () => {
    if (!API_KEY) {
      setError(lang === 'sk' ? "Chýba API kľúč. Reštartuj prosím server (npm run dev)." : "Missing API Key. Please restart the server (npm run dev).");
      return;
    }
    setLoading(true);
    setError('');
    setSuperpowers([]);
    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      // Filter logs for the last 7 days
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const recentLogs = logs
        .filter(l => l.timestamp && new Date(l.timestamp.seconds * 1000) > lastWeek)
        .map(l => {
          let prefix = '';
          if (l.isMonthlyTop) prefix = '[MONTHLY TOP 🏆] ';
          else if (l.isWeeklyTop) prefix = '[WEEKLY TOP 💎] ';
          else if (l.isTopWin) prefix = '[DAILY TOP 🌟] ';
          return `- ${prefix}${l.text} (${l.tags?.join(', ') || ''})`;
        })
        .join('\n');

      if (!recentLogs) {
        setInsight(lang === 'sk' ? "Ešte nemám dostatok tvojich víťazstiev na analýzu. Napíš aspoň jeden úspech za posledných 7 dní!" : "I don't have enough of your victories to analyze yet. Write at least one achievement from the last 7 days!");
        setLoading(false);
        return;
      }

      const additionalInstruction = lang === 'sk' 
        ? "\n\nDôležité: Ak vidíš záznamy označené ako 'TOP', venuj im špeciálnu pozornosť a určite ich spomeň v analýze, pretože sú pre mňa najvýznamnejšie." 
        : "\n\nImportant: If you see entries marked as 'TOP', pay special attention to them and definitely mention them in your analysis, as they are the most significant to me.";

      const prompt = `${t.aiPrompt}${additionalInstruction}\n\nLogs:\n${recentLogs}`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const fullText = response.text();
      
      // Parse superpowers
      const superpowerMatch = fullText.match(/SUPERPOWERS:\s*(.*)/i);
      if (superpowerMatch) {
        const powers = superpowerMatch[1].split(',').map(p => p.trim().replace(/[.!?]/g, ''));
        setSuperpowers(powers.filter(p => p.length > 0));
        setInsight(fullText.replace(/SUPERPOWERS:.*/i, '').trim());
      } else {
        setInsight(fullText.trim());
      }
    } catch (err) {
      console.error("Gemini Error:", err);
      setError(err.message || "Unknown error");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      generateInsight();
    } else {
      setInsight('');
      setSuperpowers([]);
      setError(false);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-apple-bg/80 backdrop-blur-md"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-lg bg-apple-card border border-apple-border rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden max-h-[85vh] flex flex-col"
          >
            {/* Animated Background Pulse */}
            {loading && (
              <motion.div 
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.1, 0.3, 0.1]
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 pointer-events-none"
                style={{ background: `radial-gradient(circle, ${accentColor}44 0%, transparent 70%)` }}
              />
            )}

            <div className="relative z-10 flex flex-col h-full max-h-full p-8 min-h-0">
              <div className="flex items-center gap-3 mb-6 flex-shrink-0">
                <span className="text-3xl">🔮</span>
                <h2 className="text-2xl font-bold text-apple-text">{t.aiMotivator}</h2>
              </div>

              <div className="min-h-[150px] flex flex-col flex-grow overflow-y-auto custom-scrollbar pr-2">
                {loading ? (
                  <div className="space-y-4 my-auto">
                    <p className="text-apple-secondary italic animate-pulse">{t.aiLoading}</p>
                    <div className="h-2 w-full bg-apple-border rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="h-full w-1/3"
                        style={{ backgroundColor: accentColor }}
                      />
                    </div>
                  </div>
                ) : error ? (
                  <div className="text-center my-auto">
                    <p className="text-red-500 font-medium mb-2">{t.aiError}</p>
                    <p className="text-xs text-red-400 opacity-80">{error}</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-apple-text text-lg leading-relaxed whitespace-pre-wrap italic font-medium"
                    >
                      "{insight}"
                    </motion.div>

                    {superpowers.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="pt-6 border-t border-apple-border/50"
                      >
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-apple-secondary mb-4">
                          {lang === 'sk' ? 'Tvoje superschopnosti' : 'Your Superpowers'}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {superpowers.map((power, i) => (
                            <motion.span 
                              key={i}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ 
                                type: 'spring', 
                                damping: 12, 
                                stiffness: 200, 
                                delay: 0.5 + (i * 0.1) 
                              }}
                              className="px-4 py-2 rounded-full bg-apple-bg border border-apple-border shadow-sm flex items-center gap-2"
                            >
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} />
                              <span className="text-[15px] font-bold text-apple-text">{power}</span>
                            </motion.span>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              <button 
                onClick={onClose}
                style={{ backgroundColor: accentColor }}
                className="w-full mt-8 py-4 rounded-2xl text-white font-bold shadow-lg active:scale-95 transition-all flex-shrink-0"
              >
                {t.aiClose}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
