'use client';

import { CrawlResponse } from '@/types';
import { Globe, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

interface CrawlViewerProps {
  data: CrawlResponse;
}

export default function CrawlViewer({ data }: CrawlViewerProps) {
  return (
    <div className="max-w-4xl mx-auto mt-8 sm:mt-16 space-y-6" dir="rtl">
      {/* Stats bar */}
      <div className="flex justify-between items-end text-sm text-gray-500 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <span>تم الزحف على {data.results?.length || 0} صفحة</span>
          <span className="text-xs text-gray-600 bg-white/5 px-2 py-0.5 rounded-full" dir="ltr">
            {data.base_url}
          </span>
        </div>
        <span dir="ltr">⏱ {data.response_time?.toFixed(2)}s</span>
      </div>

      {/* Crawled Pages */}
      {data.results?.map((result, index) => (
        <CrawlCard key={result.url} result={result} index={index} />
      ))}
    </div>
  );
}

function CrawlCard({ result, index }: { result: CrawlResponse['results'][0]; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const contentPreview = result.raw_content?.slice(0, 400) || '';
  const isLong = (result.raw_content?.length || 0) > 400;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4 }}
      className="bg-gradient-to-br from-sky-900/30 to-blue-900/30 backdrop-blur-xl border border-sky-500/20 rounded-2xl p-6 shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-sky-500/20 rounded-xl">
          <Globe className="h-5 w-5 text-sky-400" />
        </div>
        <div className="flex-1 min-w-0">
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 hover:text-sky-300 font-bold text-sm flex items-center gap-2 transition-colors"
            dir="ltr"
          >
            <span className="truncate">{result.url}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          </a>
        </div>
      </div>

      {/* Content */}
      <div className="bg-black/30 rounded-xl p-4 border border-white/5">
        <pre className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap break-words font-sans">
          {expanded ? result.raw_content : contentPreview}
          {!expanded && isLong && '...'}
        </pre>
      </div>

      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sky-400 hover:text-sky-300 text-xs mt-3 transition-colors"
        >
          {expanded ? 'عرض أقل ▲' : 'عرض الكل ▼'}
        </button>
      )}
    </motion.div>
  );
}
