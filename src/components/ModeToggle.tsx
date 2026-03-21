'use client';

import { Search, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { AppMode } from '@/types';

interface ModeToggleProps {
  mode: AppMode;
  onChange: (mode: AppMode) => void;
}

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div
      className="flex items-center rounded-xl p-0.5"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}
    >
      <button
        type="button"
        onClick={() => onChange('search')}
        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300`}
        style={{ color: mode === 'search' ? '#fff' : 'var(--text-tertiary)' }}
      >
        {mode === 'search' && (
          <motion.div
            layoutId="mode-toggle-bg"
            className="absolute inset-0 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/30"
            transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
          />
        )}
        <Search className="h-3.5 w-3.5 relative z-10" />
        <span className="relative z-10">بحث</span>
      </button>

      <button
        type="button"
        onClick={() => onChange('chat')}
        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300`}
        style={{ color: mode === 'chat' ? '#fff' : 'var(--text-tertiary)' }}
      >
        {mode === 'chat' && (
          <motion.div
            layoutId="mode-toggle-bg"
            className="absolute inset-0 bg-emerald-600 rounded-lg shadow-lg shadow-emerald-500/30"
            transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
          />
        )}
        <MessageSquare className="h-3.5 w-3.5 relative z-10" />
        <span className="relative z-10">محادثة</span>
      </button>
    </div>
  );
}
