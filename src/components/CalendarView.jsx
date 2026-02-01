import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function CalendarView({ logs, t, lang, accentColor, onSelectDate }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => {
    const day = new Date(year, month, 1).getDay();
    // Adjust for Monday start (0 = Monday, 6 = Sunday)
    return day === 0 ? 6 : day - 1;
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const monthName = new Date(year, month).toLocaleDateString(lang === 'sk' ? 'sk-SK' : 'en-US', { month: 'long', year: 'numeric' });
  
  const weekDays = lang === 'sk' 
    ? ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'] 
    : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getLogCountForDay = (day) => {
    const dateStr = new Date(year, month, day).toDateString();
    return logs.filter(l => l.timestamp && new Date(l.timestamp.seconds * 1000).toDateString() === dateStr).length;
  };

  const hasTopWinForDay = (day) => {
    const dateStr = new Date(year, month, day).toDateString();
    return logs.some(l => l.isTopWin && l.timestamp && new Date(l.timestamp.seconds * 1000).toDateString() === dateStr);
  };

  return (
    <div className="w-full">
      {/* Month Navigation */}
      <div className="flex justify-between items-center mb-6 px-2">
        <button onClick={prevMonth} className="p-2 text-apple-secondary hover:text-apple-text active:scale-90 transition-all">←</button>
        <h2 className="text-xl font-bold text-apple-text capitalize">{monthName}</h2>
        <button onClick={nextMonth} className="p-2 text-apple-secondary hover:text-apple-text active:scale-90 transition-all">→</button>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 mb-2">
        {weekDays.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-apple-secondary/50 uppercase tracking-wider py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {/* Empty cells for offset */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {/* Days */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const count = getLogCountForDay(day);
          const hasWin = hasTopWinForDay(day);
          const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
          const isSelected = selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;

          return (
            <motion.button
              key={day}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                const newDate = new Date(year, month, day);
                setSelectedDate(newDate);
                onSelectDate(newDate);
              }}
              className={`aspect-square rounded-xl relative flex flex-col items-center justify-center border transition-all duration-300
                ${isSelected 
                  ? 'bg-apple-card border-apple-border shadow-inner ring-2 ring-offset-2 ring-offset-apple-bg' 
                  : 'bg-apple-card/50 border-transparent hover:bg-apple-card hover:border-apple-border'}
              `}
              style={{ 
                borderColor: isSelected ? accentColor : undefined,
                boxShadow: isSelected ? `0 0 0 2px ${accentColor}` : undefined
              }}
            >
              <span className={`text-sm font-medium ${isToday ? 'text-[var(--accent-color)] font-bold' : 'text-apple-text'}`}>
                {day}
              </span>
              
              {/* Indicators */}
              <div className="flex gap-0.5 mt-1 h-1.5 items-end">
                 {hasWin && (
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.6)]" />
                 )}
                 {!hasWin && count > 0 && (
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor, opacity: Math.min(count * 0.3 + 0.2, 1) }} />
                 )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
