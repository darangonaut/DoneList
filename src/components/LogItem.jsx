import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';

export function LogItem({ log, onDelete, onUpdate, onTagClick, lang, t, isSelectable = false, onSelect, getTagColor, formatTimestamp }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(log.text);
  const inputRef = useRef(null);
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-70, -20], [1, 0]);
  const scale = useTransform(x, [-70, -20], [1, 0.5]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

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
            className="inline-block px-2 py-0.5 rounded-md text-[14px] font-bold mx-0.5 cursor-pointer active:scale-90 transition-transform relative z-20" 
            style={{ backgroundColor: `${color}20`, color: color }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const { isTopWin, isWeeklyTop, isMonthlyTop } = log;

  return (
    <div className={`relative overflow-hidden rounded-2xl mb-3 shadow-sm transition-all duration-500 
      ${isMonthlyTop ? 'ring-2 ring-purple-500 shadow-[0_0_25px_rgba(168,85,247,0.4)]' : 
        isWeeklyTop ? 'ring-2 ring-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.3)]' : 
        isTopWin ? 'ring-2 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.2)]' : ''}`}>
      {!isSelectable && (
        <motion.div style={{ opacity, scale }} className="absolute inset-y-0 right-0 w-20 bg-red-500 flex items-center justify-center">
          <button onClick={() => onDelete(log)} className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">−</button>
        </motion.div>
      )}
      <motion.div 
        drag={isEditing || isSelectable ? false : "x"} 
        dragConstraints={{ left: -80, right: 0 }} 
        dragElastic={0.1} 
        style={{ x }} 
        onClick={() => isSelectable && onSelect(log.id)}
        className={`bg-apple-card/80 backdrop-blur-xl p-4 border flex justify-between items-center relative z-10 rounded-2xl touch-pan-y 
          ${isSelectable ? 'cursor-pointer active:scale-95 transition-transform' : ''} 
          ${isMonthlyTop ? 'border-purple-500/50' : isWeeklyTop ? 'border-blue-400/50' : isTopWin ? 'border-yellow-400/50' : 'border-apple-border'}`}
      >
        <div className="flex flex-col pr-4 flex-1 select-none text-apple-text">
          {isEditing ? (
            <input 
              ref={inputRef} 
              type="text" 
              maxLength={280}
              value={editText} 
              onChange={(e) => setEditText(e.target.value)} 
              onBlur={handleUpdate} 
              onKeyDown={handleKeyDown} 
              className="bg-transparent border-none p-0 focus:ring-0 outline-none text-[17px] leading-tight font-normal w-full" 
            />
          ) : (
            <div onClick={() => !isSelectable && setIsEditing(true)} className="text-[17px] leading-tight font-normal cursor-text whitespace-pre-wrap break-words flex items-start gap-2">
              {isMonthlyTop ? <span className="text-purple-500 shrink-0 mt-0.5">🏆</span> : 
               isWeeklyTop ? <span className="text-blue-400 shrink-0 mt-0.5">💎</span> : 
               isTopWin ? <span className="text-yellow-500 shrink-0 mt-0.5">🌟</span> : null}
              <span>{renderTextWithTags(log.text)}</span>
            </div>
          )}
          <span className="text-[13px] text-apple-secondary mt-1">{formatTimestamp(log.timestamp)}</span>
        </div>
      </motion.div>
    </div>
  );
}
