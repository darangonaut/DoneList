import React from 'react';
import { motion } from 'framer-motion';

export function BackgroundBlobs({ accentColor }) {
  return (
    <div className="fixed inset-0 z-0 opacity-[0.08] dark:opacity-[0.15] pointer-events-none transition-all duration-1000">
      <motion.div 
        animate={{ scale: [1, 1.2, 1], x: [-50, 50, -50], y: [-20, 20, -20] }} 
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }} 
        className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] rounded-full blur-[100px]" 
        style={{ backgroundColor: accentColor }} 
      />
      <motion.div 
        animate={{ scale: [1.2, 1, 1.2], x: [50, -50, 50], y: [20, -20, 20] }} 
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }} 
        className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[100px]" 
        style={{ backgroundColor: accentColor }} 
      />
    </div>
  );
}