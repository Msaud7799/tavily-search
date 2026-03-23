'use client';

import { FileText, Languages, Code2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';

interface ChatActionsProps {
  onShortcut: (text: string) => void;
}

const CHAT_SHORTCUTS = [
  { label: 'لخّص', icon: <FileText className="h-3 w-3" />, prompt: 'لخّص لي: ' },
  { label: 'اشرح', icon: <Sparkles className="h-3 w-3" />, prompt: 'اشرح لي: ' },
  { label: 'ترجم', icon: <Languages className="h-3 w-3" />, prompt: 'ترجم لي: ' },
  { label: 'أصلح الكود', icon: <Code2 className="h-3 w-3" />, prompt: 'أصلح هذا الكود: ' },
];

export default function ChatActions({ onShortcut }: ChatActionsProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex gap-1 justify-start sm:justify-center items-center h-full"
    >
      {CHAT_SHORTCUTS.map((shortcut) => (
        <button
          key={shortcut.label}
          type="button"
          onClick={() => onShortcut(shortcut.prompt)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 shrink-0 ${
            shortcut.label === 'لخّص' || shortcut.label === 'اشرح' ? 'hidden sm:flex' : 'flex'
          }`}
          style={{
            background: isLight ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.04)',
            color: isLight ? '#94a3b8' : '#6b7280',
            border: isLight ? '1px solid rgba(99,102,241,0.1)' : '1px solid rgba(255,255,255,0.06)',
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = isLight ? '#059669' : '#10b981';
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.boxShadow = isLight ? '0 2px 8px rgba(5,150,105,0.3)' : '0 2px 8px rgba(16,185,129,0.3)';
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = isLight ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.04)';
            e.currentTarget.style.color = isLight ? '#94a3b8' : '#6b7280';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {shortcut.icon}
          <span>{shortcut.label}</span>
        </button>
      ))}
    </motion.div>
  );
}
