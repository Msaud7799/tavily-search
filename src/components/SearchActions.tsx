'use client';

import { Search, FileText, Globe, Map, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { ActionType } from '@/types';

const SEARCH_TOOLS: { key: ActionType; label: string; icon: React.ReactNode }[] = [
  { key: 'research', label: 'بحث معمّق', icon: <BookOpen className="h-4 w-4" /> },
  { key: 'map', label: 'خريطة', icon: <Map className="h-4 w-4" /> },
  { key: 'crawl', label: 'زحف', icon: <Globe className="h-4 w-4" /> },
  { key: 'extract', label: 'استخراج', icon: <FileText className="h-4 w-4" /> },
];

interface SearchActionsProps {
  activeAction: ActionType;
  onActionChange: (action: ActionType) => void;
}

export default function SearchActions({ activeAction, onActionChange }: SearchActionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex gap-2 justify-center flex-wrap"
    >
      <button
        onClick={() => onActionChange('search')}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300"
        style={{
          backgroundColor: activeAction === 'search' ? 'var(--accent-blue)' : 'var(--bg-card)',
          color: activeAction === 'search' ? '#fff' : 'var(--text-tertiary)',
          border: `1px solid ${activeAction === 'search' ? 'var(--accent-blue)' : 'var(--border-primary)'}`,
          boxShadow: activeAction === 'search' ? '0 4px 12px rgba(59,130,246,0.25)' : 'none',
          transform: activeAction === 'search' ? 'scale(1.02)' : 'scale(1)',
        }}
      >
        <Search className="h-4 w-4" />
        <span>بحث</span>
      </button>

      {SEARCH_TOOLS.map((tool) => (
        <button
          key={tool.key}
          onClick={() => onActionChange(tool.key)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300"
          style={{
            backgroundColor: activeAction === tool.key ? 'var(--accent-blue)' : 'var(--bg-card)',
            color: activeAction === tool.key ? '#fff' : 'var(--text-tertiary)',
            border: `1px solid ${activeAction === tool.key ? 'var(--accent-blue)' : 'var(--border-primary)'}`,
            boxShadow: activeAction === tool.key ? '0 4px 12px rgba(59,130,246,0.25)' : 'none',
            transform: activeAction === tool.key ? 'scale(1.02)' : 'scale(1)',
          }}
        >
          {tool.icon}
          <span>{tool.label}</span>
        </button>
      ))}
    </motion.div>
  );
}
