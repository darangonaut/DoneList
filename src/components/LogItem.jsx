import React, { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { useApp } from '../context/AppContext';

export const LogItem = memo(function LogItem({ log, onDelete, onUpdate, onTagClick, onShare, isSelectable = false, onSelect, getTagColor }) {
  const { t, triggerHaptic, formatTimestamp } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(log.text);
  const inputRef = useRef(null);
  const longPressTimer = useRef(null);
  const x = useMotionValue(0);
  const itemScale = useMotionValue(1);
  const opacity = useTransform(x, [-70, -20], [1, 0]);
  const scale = useTransform(x, [-70, -20], [1, 0.5]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const startPress = () => {
    if (isSelectable || isEditing) return;
    longPressTimer.current = setTimeout(() => {
      animate(itemScale, [1, 1.03, 1], { duration: 0.3, ease: "easeInOut" });
      setIsEditing(true);
      if (triggerHaptic) triggerHaptic('medium');
    }, 500);
  };

  const cancelPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleUpdate = () => {
    if (editText.trim() !== '' && editText !== log.text) {
      onUpdate(log.id, editText);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleUpdate();
    if (e.key === 'Escape') {
      setEditText(log.text);
      setIsEditing(false);
    }
  };

  const handleDragEnd = (event, info) => {
    if (info.offset.x > -40) {
      animate(x, 0, { type: "spring", stiffness: 400, damping: 25 });
    } else {
      animate(x, -80, { type: "spring", stiffness: 400, damping: 25 });
    }
  };

  const renderTextWithTags = (text) => {
    if (!text) return '';
    const parts = text.split(/(#\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('#')) {
        const color = getTagColor(part);
        return (
          <span 
            key={i} 
            onClick={(e) => { e.stopPropagation(); if (onTagClick) onTagClick(part); }}
            className="inline-block px-3 py-1 rounded-md text-[14px] font-bold mx-0.5 cursor-pointer active:scale-90 transition-transform relative z-20 shadow-sm border border-black/5" 
            style={{ backgroundColor: `${color}25`, color: color }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const { isTopWin, isWeeklyTop, isMonthlyTop } = log;
  const isSpecial = isTopWin || isWeeklyTop || isMonthlyTop;

  return (
    <motion.div 
      whileTap={{ scale: 0.98 }}
      className={`relative overflow-hidden rounded-[2rem] mb-4 shadow-sm 
      ${isMonthlyTop ? 'shadow-[0_20px_50px_rgba(168,85,247,0.25)]' : 
        isWeeklyTop ? 'shadow-[0_15px_40px_rgba(96,165,250,0.2)]' : 
        isTopWin ? 'shadow-[0_10px_30px_rgba(250,204,21,0.15)]' : ''}`}
      >
      {/* Animated Border for Special Wins */}
      {isSpecial && (
        <motion.div 
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-[2rem] z-0 p-[2px]"
          style={{ 
            background: isMonthlyTop 
              ? 'linear-gradient(45deg, #A855F7, #EC4899, #A855F7)' 
              : isWeeklyTop 
                ? 'linear-gradient(45deg, #3B82F6, #60A5FA, #3B82F6)'
                : 'linear-gradient(45deg, #F59E0B, #FBBF24, #F59E0B)'
          }}
        >
          <div className="w-full h-full bg-apple-bg rounded-[calc(2rem-2px)]" />
        </motion.div>
      )}

      {!isSelectable && (
        <motion.div style={{ opacity, scale }} className="absolute inset-y-0 right-0 w-20 bg-red-500 flex items-center justify-center z-0">
          <button 
            onClick={() => onDelete(log)} 
            aria-label={t.delete || "Vymazať"}
            className="w-full h-full flex items-center justify-center text-white text-3xl font-bold"
          >
            −
          </button>
        </motion.div>
      )}
      
      <motion.div 
        drag={isEditing || isSelectable ? false : "x"} 
        dragConstraints={{ left: -80, right: 0 }} 
        dragElastic={0.1} 
        dragDirectionLock={true}
        onDragEnd={handleDragEnd}
        style={{ x, scale: itemScale }} 
        onClick={() => isSelectable && onSelect(log.id)}
        className={`bg-apple-card/80 backdrop-blur-2xl p-5 border flex justify-between items-center relative z-10 rounded-[2rem] touch-pan-y
          ${isSelectable ? 'cursor-pointer active:scale-95' : ''} 
          ${isMonthlyTop ? 'border-purple-500/40' : isWeeklyTop ? 'border-blue-400/40' : isTopWin ? 'border-yellow-400/40' : 'border-apple-border/70'}`}
      >
        <div className="flex flex-col pr-4 flex-1 select-none text-apple-text">
          {isEditing ? (
            <input 
              ref={inputRef} 
              type="text" 
              maxLength={280}
              aria-label="Upraviť zápis"
              value={editText} 
              onChange={(e) => setEditText(e.target.value)} 
              onBlur={handleUpdate} 
              onKeyDown={handleKeyDown} 
              className="bg-transparent border-none p-0 focus:ring-0 outline-none text-[17px] leading-tight font-bold w-full" 
            />
          ) : (
            <div 
              onPointerDown={startPress}
              onPointerUp={cancelPress}
              onPointerLeave={cancelPress}
              onPointerCancel={cancelPress}
              className="text-[17px] leading-tight font-medium cursor-text whitespace-pre-wrap break-words flex items-start gap-2 select-none touch-manipulation"
            >
              {isMonthlyTop ? <span className="text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" role="img" aria-label="Trophy">🏆</span> : 
               isWeeklyTop ? <span className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" role="img" aria-label="Jewel">💎</span> : 
               isTopWin ? <span className="text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" role="img" aria-label="Star">🌟</span> : null}
              <span>{renderTextWithTags(log.text)}</span>
            </div>
          )}
          <span className="text-[13px] font-bold text-apple-secondary/90 mt-1.5">{formatTimestamp(log.timestamp)}</span>
        </div>

        {isSpecial && !isSelectable && !isEditing && (
          <button 
            onClick={(e) => { e.stopPropagation(); onShare(log); }}
            aria-label="Zdieľať víťazstvo"
            className="p-4 -mr-4 text-apple-text active:scale-90 transition-transform opacity-60 hover:opacity-100"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        )}
      </motion.div>
    </motion.div>
  );
});