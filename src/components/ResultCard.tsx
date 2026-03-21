'use client';

import { SearchResult } from '../types';
import { ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

function getFaviconUrl(url: string) {
  try {
    const hostname = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch {
    return '';
  }
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export default function ResultCard({ result, index }: { result: SearchResult; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const faviconUrl = getFaviconUrl(result.url);
  const hostname = getHostname(result.url);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4 }}
      className="backdrop-blur-xl rounded-2xl p-4 sm:p-6 shadow-xl transition-all group w-full"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-primary)',
      }}
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 sm:mb-3">
        {faviconUrl && (
          <img
            src={faviconUrl}
            alt=""
            width={18}
            height={18}
            className="rounded-sm shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <span className="text-[11px] sm:text-xs font-mono truncate max-w-[200px] sm:max-w-md" style={{ color: 'var(--text-tertiary)' }} dir="ltr">{hostname}</span>
      </div>

      {/* Title */}
      <a
        href={result.url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-bold text-base sm:text-lg hover:opacity-80 transition-colors block mb-2 sm:mb-3 leading-relaxed"
        style={{ color: 'var(--accent-blue)' }}
      >
        <span className="flex items-start gap-2">
          <span className="flex-1 break-words">{result.title}</span>
          <ExternalLink className="h-4 w-4 shrink-0 mt-1" style={{ color: 'var(--text-muted)' }} />
        </span>
      </a>

      {/* Content */}
      <p className={`leading-relaxed text-xs sm:text-sm break-words ${expanded ? '' : 'line-clamp-3'}`} style={{ color: 'var(--text-secondary)' }}>
        {result.content}
      </p>

      {result.content && result.content.length > 200 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs mt-2 transition-colors"
          style={{ color: 'var(--accent-blue)' }}
        >
          {expanded ? 'عرض أقل ▲' : 'عرض المزيد ▼'}
        </button>
      )}

      {/* Score */}
      {result.score && (
        <div className="mt-2 sm:mt-3 flex justify-start">
          <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
            ملاءمة: {(result.score * 100).toFixed(0)}%
          </span>
        </div>
      )}
    </motion.div>
  );
}
