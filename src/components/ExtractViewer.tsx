'use client';

import { ExtractResponse } from '@/types';
import { FileText, ExternalLink, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

interface ExtractViewerProps {
  data: ExtractResponse;
}

export default function ExtractViewer({ data }: ExtractViewerProps) {
  return (
    <div className="max-w-4xl mx-auto mt-8 sm:mt-16 space-y-6" dir="rtl">
      {/* Stats bar */}
      <div className="flex justify-between items-end text-sm text-gray-500 border-b border-white/10 pb-4">
        <span>تم استخراج {data.results?.length || 0} صفحة بنجاح</span>
        <span dir="ltr">⏱ {data.response_time?.toFixed(2)}s</span>
      </div>

      {/* Failed results */}
      {data.failed_results?.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>فشل استخراج {data.failed_results.length} رابط</span>
          </div>
          {data.failed_results.map((f, i) => (
            <p key={i} className="text-red-300/70 text-xs truncate" dir="ltr">{f.url}</p>
          ))}
        </div>
      )}

      {/* Extracted Content */}
      {data.results?.map((result, index) => (
        <ExtractCard key={result.url} result={result} index={index} />
      ))}
    </div>
  );
}

function ExtractCard({ result, index }: { result: ExtractResponse['results'][0]; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const contentPreview = result.raw_content?.slice(0, 500) || '';
  const isLong = (result.raw_content?.length || 0) > 500;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-6 shadow-xl"
    >
      <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-l from-emerald-400 via-teal-500 to-cyan-600 rounded-t-2xl" />
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-emerald-500/20 rounded-xl">
          <FileText className="h-5 w-5 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300 font-bold text-sm flex items-center gap-2 transition-colors"
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
          className="text-emerald-400 hover:text-emerald-300 text-xs mt-3 transition-colors"
        >
          {expanded ? 'عرض أقل ▲' : 'عرض الكل ▼'}
        </button>
      )}
    </motion.div>
  );
}
