'use client';

import { FileText, Languages, Code2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';

interface ChatActionsProps {
  onShortcut: (text: string) => void;
}

const CHAT_SHORTCUTS = [
  { label: 'لخّص', icon: <FileText className="h-4 w-4" />, prompt: 'لخّص لي: ' },
  { label: 'اشرح', icon: <Sparkles className="h-4 w-4" />, prompt: 'اشرح لي: ' },
  { label: 'ترجم', icon: <Languages className="h-4 w-4" />, prompt: 'ترجم لي: ' },
  { label: 'أصلح الكود', icon: <Code2 className="h-4 w-4" />, prompt: 'أصلح هذا الكود: ' },
];

export default function ChatActions({ onShortcut }: ChatActionsProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex gap-2 justify-center flex-wrap"
    >
      {CHAT_SHORTCUTS.map((shortcut) => (
        <button
          key={shortcut.label}
          type="button"
          onClick={() => onShortcut(shortcut.prompt)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
          style={{
            background: isLight
              ? 'rgba(99,102,241,0.05)'
              : 'rgba(255,255,255,0.04)',
            color: isLight ? '#64748b' : '#9ca3af',
            border: isLight
              ? '1px solid rgba(99,102,241,0.1)'
              : '1px solid rgba(255,255,255,0.06)',
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = isLight
              ? 'rgba(16,185,129,0.08)'
              : 'rgba(16,185,129,0.10)';
            e.currentTarget.style.color = isLight ? '#059669' : '#34d399';
            e.currentTarget.style.borderColor = isLight
              ? 'rgba(16,185,129,0.2)'
              : 'rgba(16,185,129,0.25)';
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = isLight
              ? 'rgba(99,102,241,0.05)'
              : 'rgba(255,255,255,0.04)';
            e.currentTarget.style.color = isLight ? '#64748b' : '#9ca3af';
            e.currentTarget.style.borderColor = isLight
              ? 'rgba(99,102,241,0.1)'
              : 'rgba(255,255,255,0.06)';
          }}
        >
          {shortcut.icon}
          <span>{shortcut.label}</span>
        </button>
      ))}
    </motion.div>
  );
}
