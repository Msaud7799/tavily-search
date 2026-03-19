'use client';

import { ResearchResponse } from '@/types';
import { BookOpen, ExternalLink, CheckCircle2, Copy, Check, Languages, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import MarkdownRender from './MarkdownRender';
import { useState } from 'react';

interface ResearchViewerProps {
  data: ResearchResponse;
}

function getFaviconUrl(url: string) {
  try {
    const hostname = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch {
    return '';
  }
}

export default function ResearchViewer({ data }: ResearchViewerProps) {
  const [copied, setCopied] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);

  const contentToRender = (showTranslation && translatedContent) ? translatedContent : (data.content || '');

  const handleCopy = () => {
    navigator.clipboard.writeText(contentToRender);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTranslate = async () => {
    if (translatedContent) {
      setShowTranslation(true);
      return;
    }
    setIsTranslating(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'قم بترجمة هذا التقرير إلى اللغة العربية بدقة مع الحفاظ الكامل على التنسيق (Markdown). لا تقم بإضافة أي نصوص إضافية غير الترجمة نفسها، وتأكد من الحفاظ على بنية البيانات.',
          context: data.content
        })
      });
      const result = await res.json();
      if (result.answer) {
        setTranslatedContent(result.answer);
        setShowTranslation(true);
      }
    } catch (err) {
      console.error('Translation error:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-8 sm:mt-16 space-y-6" dir="rtl">
      {/* Stats bar */}
      <div className="flex justify-between items-end text-sm text-gray-500 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            اكتمل البحث المعمّق
          </span>
          {data.sources && (
            <span className="text-xs text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">
              {data.sources.length} مصدر
            </span>
          )}
        </div>
        {data.response_time && (
          <span dir="ltr">⏱ {data.response_time.toFixed(2)}s</span>
        )}
      </div>

      {/* Research Report */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-violet-900/40 to-purple-900/40 backdrop-blur-xl border border-violet-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-l from-violet-400 via-purple-500 to-fuchsia-600" />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-500/20 rounded-xl">
              <BookOpen className="h-5 w-5 text-violet-400" />
            </div>
            <h2 className="text-xl font-bold text-white">تقرير البحث المعمّق</h2>
            {data.model && (
              <span className="text-[10px] text-violet-300 bg-violet-500/20 px-2 py-0.5 rounded-full hidden sm:inline-block">
                {data.model}
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {!showTranslation ? (
              <button
                onClick={handleTranslate}
                disabled={isTranslating}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-gray-300 transition-colors disabled:opacity-50"
              >
                {isTranslating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Languages className="h-3.5 w-3.5" />}
                {isTranslating ? 'جارٍ الترجمة...' : 'ترجمة للعربية'}
              </button>
            ) : (
              <button
                onClick={() => setShowTranslation(false)}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg text-xs font-medium text-blue-300 transition-colors"
              >
                <Languages className="h-3.5 w-3.5" />
                عرض الأصل الإنجليزي
              </button>
            )}
            
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-gray-300 transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'تم النسخ' : 'نسخ التقرير'}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="mt-8">
          <MarkdownRender content={contentToRender} />
        </div>
      </motion.div>

      {/* Sources */}
      {data.sources && data.sources.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl"
        >
          <h3 className="text-lg font-bold text-white mb-4">المصادر</h3>
          <div className="grid gap-2">
            {data.sources.map((source, index) => {
              const favicon = source.favicon || getFaviconUrl(source.url);
              return (
                <a
                  key={index}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-black/20 hover:bg-black/30 border border-white/5 hover:border-violet-500/30 group transition-all"
                >
                  {favicon && (
                    <img
                      src={favicon}
                      alt=""
                      width={16}
                      height={16}
                      className="rounded-sm shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <span className="text-violet-400 group-hover:text-violet-300 text-sm font-medium flex-1 truncate transition-colors">
                    {source.title}
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 text-gray-600 group-hover:text-violet-400 shrink-0 transition-colors" />
                </a>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
