import React from 'react';
import { m } from 'framer-motion';
import { useApp } from '../context/AppContext';

export function LandingPage({ handleLogin }) {
  const { t, lang, setLang } = useApp();
  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white selection:bg-[var(--accent-color)]/30 overflow-y-auto scroll-smooth transition-colors duration-500">
      {/* Premium Background Blobs - Optimized for performance */}
      <div className="fixed inset-0 z-0 opacity-20 dark:opacity-30 pointer-events-none">
        <m.div 
          animate={{ scale: [1, 1.1, 1], x: [-50, 50, -50], y: [-30, 30, -30] }} 
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }} 
          className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] rounded-full bg-orange-400 dark:bg-orange-600 blur-[100px]" 
        />
        <m.div 
          animate={{ scale: [1.1, 1, 1.1], x: [50, -50, 50], y: [30, -30, 30] }} 
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }} 
          className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-400 dark:bg-blue-600 blur-[100px]" 
        />
      </div>

      <div className="relative z-10 w-full max-w-2xl mx-auto px-6 py-12">
        {/* Intro Section */}
        <section className="min-h-[80vh] flex flex-col items-center justify-center text-center mb-20">
          <m.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="w-full flex flex-col items-center">
            <span className="inline-block px-3 py-1 rounded-full bg-black/10 dark:bg-white/20 border border-black/10 dark:border-white/20 text-[10px] font-bold uppercase tracking-[0.2em] mb-6 text-black/80 dark:text-white/80">{t.tagline}</span>
            <h1 className="text-7xl md:text-9xl font-black mb-6 tracking-tighter bg-gradient-to-b from-black dark:from-white to-black/60 dark:to-white/80 bg-clip-text text-transparent">{t.title}</h1>
            <p className="text-xl md:text-2xl text-black/85 dark:text-white/85 font-medium leading-relaxed max-w-lg mx-auto mb-10">{t.subtitle}</p>
            <button onClick={handleLogin} className="w-full max-w-sm bg-black dark:bg-white text-white dark:text-black py-5 rounded-[2rem] font-black text-xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 mx-auto">
              <svg className="w-7 h-7" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
              {t.login}
            </button>
          </m.div>
        </section>

        {/* Science Section */}
        <section className="py-20 border-t border-black/5 dark:border-white/10 overflow-hidden text-center">
          <m.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-12">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">{t.scienceTitle}</h2>
          </m.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
            <m.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-black/[0.02] dark:bg-white/5 p-8 rounded-[2.5rem] border border-black/[0.05] dark:border-white/10 flex flex-col h-[400px]">
              <h3 className="text-lg font-bold mb-10 opacity-70 uppercase tracking-widest">{t.graph1Title}</h3>
              <div className="flex-1 flex items-end justify-around gap-4 relative px-4 border-b border-black/10 dark:border-white/10 pb-8">
                <div className="flex-1 flex flex-col items-center gap-6 h-full justify-end relative">
                  <div className="w-full flex justify-center items-end gap-1.5 h-full">
                    <m.div initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ duration: 1.5, ease: "circOut" }} style={{ originY: 1 }} className="w-8 md:w-10 bg-red-500/60 rounded-t-xl h-[70%]" />
                    <m.div initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ duration: 1.5, ease: "circOut", delay: 0.2 }} style={{ originY: 1 }} className="w-8 md:w-10 bg-orange-500/40 rounded-t-xl h-[20%]" />
                  </div>
                  <div className="absolute -bottom-8 w-full"><span className="text-[10px] font-black uppercase tracking-widest opacity-60 block">{t.graph1Before}</span></div>
                </div>
                <div className="flex-1 flex flex-col items-center gap-6 h-full justify-end relative">
                  <div className="w-full flex justify-center items-end gap-1.5 h-full">
                    <m.div initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ duration: 1.5, ease: "circOut", delay: 0.4 }} style={{ originY: 1 }} className="w-8 md:w-10 bg-red-500/20 rounded-t-xl h-[15%]" />
                    <m.div initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ duration: 1.5, ease: "circOut", delay: 0.6 }} style={{ originY: 1 }} className="w-8 md:w-10 bg-orange-500 rounded-t-xl h-[95%] shadow-[0_0_40px_rgba(249,115,22,0.3)]" />
                  </div>
                  <div className="absolute -bottom-8 w-full"><span className="text-[10px] font-black uppercase tracking-widest block text-orange-600 dark:text-orange-500 font-bold">{t.graph1After}</span></div>
                </div>
              </div>
            </m.div>

            <m.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-black/[0.02] dark:bg-white/5 p-8 rounded-[2.5rem] border border-black/[0.05] dark:border-white/10 flex flex-col h-[400px] relative overflow-hidden text-center">
              <h3 className="text-lg font-bold mb-2 opacity-70 uppercase tracking-widest">{t.graph2Title}</h3>
              <p className="text-xs opacity-60 mb-10">{t.graph2Desc}</p>
              <div className="flex-1 relative mt-10 border-b border-black/10 dark:border-white/10 mb-8">
                <svg viewBox="0 0 200 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                  <m.path d="M0,95 C40,90 60,70 100,50 S160,10 200,5" fill="none" stroke="var(--accent-color)" strokeWidth="6" strokeLinecap="round" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} transition={{ duration: 2.5, ease: "easeInOut" }} />
                </svg>
              </div>
              <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mt-2"><span>Day 1</span><span>Day 100</span></div>
            </m.div>
          </div>
        </section>

        {/* Promo/Features Section */}
        <section className="py-20 border-t border-black/5 dark:border-white/10">
          <m.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center max-w-lg mx-auto mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">{t.promoTitle}</h2>
            <p className="text-lg text-black/70 dark:text-white/70 leading-relaxed italic">"{t.promoIntro}"</p>
          </m.div>

          <div className="grid gap-6">
            {[
              { icon: '🧠', title: t.promo1Title, desc: t.promo1Desc },
              { icon: '⚡️', title: t.promo2Title, desc: t.promo2Desc },
              { icon: '📈', title: t.promo3Title, desc: t.promo3Desc },
              { icon: '⛽️', title: t.promo4Title, desc: t.promo4Desc },
              { icon: '🔮', title: t.promo5Title, desc: t.promo5Desc }
            ].map((item, i) => (
              <m.div key={i} initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="bg-black/[0.03] dark:bg-white/5 border border-black/[0.05] dark:border-white/10 p-8 rounded-[2.5rem] flex flex-col md:flex-row gap-8 items-start transition-colors text-left">
                <span className="text-5xl shrink-0">{item.icon}</span>
                <div>
                  <h3 className="text-2xl font-black mb-2">{item.title}</h3>
                  <p className="text-black/75 dark:text-white/75 text-[17px] leading-relaxed">{item.desc}</p>
                </div>
              </m.div>
            ))}
          </div>
        </section>

        {/* App Items Section */}
        <section className="py-20 border-t border-black/5 dark:border-white/10 w-full text-center">
          <m.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="text-3xl font-black mb-12 uppercase tracking-tighter">{t.appTitle}</m.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-16">
            {[t.appItem1, t.appItem2, t.appItem3, t.appItem4].map((item, i) => (
              <m.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-black/[0.03] dark:bg-white/5 p-6 rounded-3xl border border-black/[0.05] dark:border-white/10 text-center"><p className="font-bold text-[17px]">⚡️ {item}</p></m.div>
            ))}
          </div>
          
          {/* Tip Section */}
          <m.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-orange-500/10 border border-orange-500/20 p-8 rounded-[2.5rem] max-w-lg mx-auto">
            <h3 className="text-xl font-black mb-3 text-orange-600 dark:text-orange-500 uppercase tracking-widest">{t.tipTitle}</h3>
            <p className="text-black/80 dark:text-white/90 text-[18px] leading-relaxed italic font-medium">{t.tipDesc}</p>
          </m.div>
        </section>

        {/* Final CTA */}
        <section className="py-20 text-center border-t border-black/5 dark:border-white/10">
          <m.button initial={{ scale: 0.9, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} onClick={handleLogin} className="w-full max-w-sm bg-black dark:bg-white text-white dark:text-black py-6 rounded-[2.5rem] font-black text-2xl shadow-2xl active:scale-95 transition-all mb-12 mx-auto block">{t.login}</m.button>
          
          <div className="flex justify-center gap-10">
            <button onClick={() => setLang('sk')} className={`text-xs font-black tracking-[0.4em] uppercase transition-colors ${lang === 'sk' ? 'text-black dark:text-white' : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'}`}>Slovenčina</button>
            <button onClick={() => setLang('en')} className={`text-xs font-black tracking-[0.4em] uppercase transition-colors ${lang === 'en' ? 'text-black dark:text-white' : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'}`}>English</button>
          </div>
        </section>
      </div>
    </div>
  );
}