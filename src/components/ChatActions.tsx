'use client';

import { FileText, Languages, Code2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

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
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300"
          style={{
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-tertiary)',
            border: '1px solid var(--border-primary)',
          }}
          onMouseOver={e => {
            e.currentTarget.style.backgroundColor = 'rgba(16,185,129,0.12)';
            e.currentTarget.style.color = '#34d399';
            e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)';
          }}
          onMouseOut={e => {
            e.currentTarget.style.backgroundColor = 'var(--bg-card)';
            e.currentTarget.style.color = 'var(--text-tertiary)';
            e.currentTarget.style.borderColor = 'var(--border-primary)';
          }}
        >
          {shortcut.icon}
          <span>{shortcut.label}</span>
        </button>
      ))}
    </motion.div>
  );
}
