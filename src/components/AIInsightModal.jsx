import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export function AIInsightModal({ isOpen, onClose, logs, t, lang, accentColor }) {
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateInsight = async () => {
    if (!API_KEY) {
      setError(lang === 'sk' ? "Chýba API kľúč. Reštartuj prosím server (npm run dev)." : "Missing API Key. Please restart the server (npm run dev).");
      return;
    }
    setLoading(true);
    setError('');
    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      // Filter logs for the last 7 days
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const recentLogs = logs
        .filter(l => l.timestamp && new Date(l.timestamp.seconds * 1000) > lastWeek)
        .map(l => `- ${l.text} (${l.tags?.join(', ') || ''})`)
        .join('\n');

      if (!recentLogs) {
        setInsight(lang === 'sk' ? "Ešte nemám dostatok tvojich víťazstiev na analýzu. Napíš aspoň jeden úspech za posledných 7 dní!" : "I don't have enough of your victories to analyze yet. Write at least one achievement from the last 7 days!");
        setLoading(false);
        return;
      }

      const prompt = `${t.aiPrompt}\n\nLogs:\n${recentLogs}`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      setInsight(text);
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
            className="w-full max-w-lg bg-apple-card border border-apple-border rounded-[2.5rem] p-8 shadow-2xl relative z-10 overflow-hidden"
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

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">🔮</span>
                <h2 className="text-2xl font-bold text-apple-text">{t.aiMotivator}</h2>
              </div>

              <div className="min-h-[150px] flex flex-col justify-center">
                {loading ? (
                  <div className="space-y-4">
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
                  <div className="text-center">
                    <p className="text-red-500 font-medium mb-2">{t.aiError}</p>
                    <p className="text-xs text-red-400 opacity-80">{error}</p>
                  </div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-apple-text text-lg leading-relaxed whitespace-pre-wrap italic font-medium"
                  >
                    "{insight}"
                  </motion.div>
                )}
              </div>

              <button 
                onClick={onClose}
                style={{ backgroundColor: accentColor }}
                className="w-full mt-8 py-4 rounded-2xl text-white font-bold shadow-lg active:scale-95 transition-all"
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
