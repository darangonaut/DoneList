import React from 'react';
import { motion } from 'framer-motion';

export function LandingPage({ t, lang, setLang, handleLogin }) {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white selection:bg-[var(--accent-color)]/30 overflow-y-auto scroll-smooth transition-colors duration-500">
      <div className="fixed inset-0 z-0 opacity-30 dark:opacity-40 pointer-events-none">
        <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0], x: [-100, 100, -100], y: [-50, 50, -50] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] rounded-full bg-orange-400 dark:bg-orange-600 blur-[120px]" />
        <motion.div animate={{ scale: [1.2, 1, 1.2], rotate: [0, -120, 0], x: [100, -100, 100], y: [50, -50, 50] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full bg-blue-400 dark:bg-blue-600 blur-[120px]" />
        <motion.div animate={{ scale: [1, 1.3, 1], x: [0, 50, 0], y: [0, 100, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-purple-400 dark:bg-purple-600 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-2xl mx-auto px-6 py-12">
        <section className="min-h-[70vh] flex flex-col items-center justify-center text-center mb-12">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="w-full flex flex-col items-center">
            <span className="inline-block px-3 py-1 rounded-full bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/20 text-[10px] font-bold uppercase tracking-[0.2em] mb-6 text-black/60 dark:text-white/60">{t.tagline}</span>
            <h1 className="text-7xl md:text-9xl font-black mb-6 tracking-tighter bg-gradient-to-b from-black dark:from-white to-black/40 dark:to-white/60 bg-clip-text text-transparent">{t.title}</h1>
            <p className="text-xl md:text-2xl text-black/60 dark:text-white/60 font-medium leading-relaxed max-w-lg mx-auto mb-10">{t.subtitle}</p>
            <button onClick={handleLogin} className="w-full max-w-sm bg-black dark:bg-white text-white dark:text-black py-5 rounded-[2rem] font-black text-xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 mx-auto">
              <svg className="w-7 h-7" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
              {t.login}
            </button>
            {window.location.hostname !== 'localhost' && !window.location.hostname.includes('firebaseapp.com') && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-xs text-left max-w-sm">
                <p className="font-bold mb-1">⚠️ Vývojársky režim:</p>
                <p>Ak sa prihlásenie zasekne, pridaj túto adresu do Firebase Console (Auth → Settings → Authorized domains):</p>
                <code className="block bg-black/5 dark:bg-white/10 p-1.5 mt-2 rounded font-mono text-center select-all cursor-pointer" onClick={(e) => { navigator.clipboard.writeText(window.location.hostname); alert('Skopírované!'); }}>
                  {window.location.hostname}
                </code>
              </div>
            )}
          </motion.div>
        </section>

        <section className="py-16 border-t border-black/5 dark:border-white/10 overflow-hidden text-center">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-12">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-2">{t.scienceTitle}</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-black/[0.02] dark:bg-white/5 p-6 md:p-8 rounded-[2rem] border border-black/[0.05] dark:border-white/10 flex flex-col h-[400px]">
              <h3 className="text-lg font-bold mb-10 opacity-80">{t.graph1Title}</h3>
              <div className="flex-1 flex items-end justify-around gap-4 relative px-4 border-b border-black/10 dark:border-white/10 pb-8">
                <div className="flex-1 flex flex-col items-center gap-6 h-full justify-end relative">
                  <div className="w-full flex justify-center items-end gap-1.5 h-full">
                    <motion.div initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ duration: 1.5, ease: "circOut" }} style={{ originY: 1 }} className="w-8 md:w-10 bg-red-500 rounded-t-xl h-[70%]" />
                    <motion.div initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ duration: 1.5, ease: "circOut", delay: 0.2 }} style={{ originY: 1 }} className="w-8 md:w-10 bg-[var(--accent-color)]/30 rounded-t-xl h-[20%]" />
                  </div>
                  <div className="absolute -bottom-8 w-full"><span className="text-[9px] font-black uppercase tracking-widest opacity-40 block">{t.graph1Before}</span></div>
                </div>
                <div className="flex-1 flex flex-col items-center gap-6 h-full justify-end relative">
                  <div className="w-full flex justify-center items-end gap-1.5 h-full">
                    <motion.div initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ duration: 1.5, ease: "circOut", delay: 0.4 }} style={{ originY: 1 }} className="w-8 md:w-10 bg-red-500/20 rounded-t-xl h-[15%]" />
                    <motion.div initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ duration: 1.5, ease: "circOut", delay: 0.6 }} style={{ originY: 1 }} className="w-8 md:w-10 bg-[var(--accent-color)] rounded-t-xl h-[95%] shadow-[0_0_40px_var(--accent-color)]" />
                  </div>
                  <div className="absolute -bottom-8 w-full"><span className="text-[9px] font-black uppercase tracking-widest block">{t.graph1After}</span></div>
                </div>
              </div>
              <div className="mt-12 flex justify-center gap-6 text-[9px] font-bold uppercase tracking-widest opacity-50">
                <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red-500" />{t.graph1Failures}</span>
                <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[var(--accent-color)]" />{t.graph1Successes}</span>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-black/[0.02] dark:bg-white/5 p-6 md:p-8 rounded-[2rem] border border-black/[0.05] dark:border-white/10 flex flex-col h-[400px] relative overflow-hidden text-center">
              <h3 className="text-lg font-bold mb-2 opacity-80">{t.graph2Title}</h3>
              <p className="text-xs opacity-40 mb-10">{t.graph2Desc}</p>
              <div className="flex-1 relative mt-10 border-b border-black/10 dark:border-white/10 mb-8">
                <svg viewBox="0 0 200 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGradientMain" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-color)" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="var(--accent-color)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <motion.path d="M0,95 C40,90 60,70 100,50 S160,10 200,5" fill="none" stroke="var(--accent-color)" strokeWidth="6" strokeLinecap="round" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} transition={{ duration: 2.5, ease: "easeInOut" }} />
                  <motion.path d="M0,95 C40,90 60,70 100,50 S160,10 200,5 L200,100 L0,100 Z" fill="url(#chartGradientMain)" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 1.5, delay: 1 }} />
                </svg>
              </div>
              <div className="flex justify-between text-[9px] font-black uppercase tracking-[0.3em] opacity-30 mt-2"><span>Day 1</span><span>Day 100</span></div>
            </motion.div>
          </div>
        </section>

        <section className="py-16 border-t border-black/5 dark:border-white/10">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center max-w-lg mx-auto mb-12">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">{t.promoTitle}</h2>
            <p className="text-lg text-black/40 dark:text-white/50 leading-relaxed italic">"{t.promoIntro}"</p>
          </motion.div>

          <div className="grid gap-6">
            {[
              { icon: '🧠', title: t.promo1Title, desc: t.promo1Desc },
              { icon: '⚡️', title: t.promo2Title, desc: t.promo2Desc },
              { icon: '📈', title: t.promo3Title, desc: t.promo3Desc },
              { icon: '⛽️', title: t.promo4Title, desc: t.promo4Desc },
              { icon: '🔮', title: t.promo5Title, desc: t.promo5Desc }
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="bg-black/[0.03] dark:bg-white/5 border border-black/[0.05] dark:border-white/10 p-6 md:p-8 rounded-[2rem] flex flex-col md:flex-row gap-6 items-start transition-colors text-left">
                <span className="text-4xl shrink-0">{item.icon}</span>
                <div>
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-black/50 dark:text-white/50 text-[17px] leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="py-16 border-t border-black/5 dark:border-white/10 w-full text-center">
          <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="text-2xl font-bold mb-10">{t.appTitle}</motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-12">
            {[t.appItem1, t.appItem2, t.appItem3, t.appItem4].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-black/[0.03] dark:bg-white/5 p-5 rounded-2xl border border-black/[0.05] dark:border-white/10 text-center"><p className="font-bold text-[15px]">⚡️ {item}</p></motion.div>
            ))}
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-[var(--accent-color)]/10 border border-[var(--accent-color)]/20 p-6 md:p-8 rounded-[2rem] max-w-lg mx-auto">
            <h3 className="text-lg font-bold mb-2 text-[var(--accent-color)]">{t.tipTitle}</h3>
            <p className="text-black/60 dark:text-white/70 text-[17px] leading-relaxed">{t.tipDesc}</p>
          </motion.div>
        </section>

        <section className="py-16 text-center">
          <button onClick={handleLogin} className="w-full max-w-sm bg-black dark:bg-white text-white dark:text-black py-5 rounded-[2rem] font-black text-xl shadow-2xl active:scale-95 transition-all mb-10 mx-auto block">{t.login}</button>
          <div className="flex justify-center gap-10">
            <button onClick={() => setLang('sk')} className={`text-xs font-bold tracking-[0.4em] uppercase transition-colors ${lang === 'sk' ? 'text-black dark:text-white' : 'text-black/30 dark:text-white/30'}`}>Slovenčina</button>
            <button onClick={() => setLang('en')} className={`text-xs font-bold tracking-[0.4em] uppercase transition-colors ${lang === 'en' ? 'text-black dark:text-white' : 'text-black/30 dark:text-white/30'}`}>English</button>
          </div>
        </section>
      </div>
    </div>
  );
}
