'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, X, Trash2, Search, FileText, Globe, Map as MapIcon, BookOpen } from 'lucide-react';
import { getSavedResults, SavedResult, deleteSavedResult, clearSavedResults } from '@/lib/resultHistory';
import { ActionType } from '@/types';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadResult: (result: SavedResult) => void;
}

/*----------
 * إرجاع الأيقونة المعبرة بناءً على نوع العملية أو الإجراء المختار.
 * @param {ActionType} action - نوع الإجراء.
----------*/
const getActionIcon = (action: ActionType) => {
  switch (action) {
    case 'search': return <Search className="w-4 h-4" />;
    case 'extract': return <FileText className="w-4 h-4" />;
    case 'crawl': return <Globe className="w-4 h-4" />;
    case 'map': return <MapIcon className="w-4 h-4" />;
    case 'research': return <BookOpen className="w-4 h-4" />;
  }
};

/*----------
 * إرجاع المسمى العربي المناسب المعبر عن الإجراء بدلاً من الاسم الإنجليزي.
 * @param {ActionType} action - نوع الإجراء.
----------*/
const getActionLabel = (action: ActionType) => {
  switch (action) {
    case 'search': return 'بحث';
    case 'extract': return 'استخراج';
    case 'crawl': return 'زحف';
    case 'map': return 'خريطة';
    case 'research': return 'بحث معمّق';
  }
};

/*----------
 * مكون الشريط الجانبي للسجل (HistorySidebar).
 * يُمثل شريطاً يظهر من الجانب ليُطلع المستخدم على محفوظاته لعمليات البحث وأدوات Tavily،
 * ويسمح بالتفاعل معها وإعادتها.
 *
 * @param {boolean} isOpen - حالة فتح أو إغلاق الشريط.
 * @param {Function} onClose - دالة يتم استدعاؤها للإغلاق.
 * @param {Function} onLoadResult - دالة تستدعى عند اختيار نتيجة لعرضها في الشاشة الرئيسية.
 * @returns {JSX.Element} قائمة جانبية تفاعلية.
----------*/
export default function HistorySidebar({ isOpen, onClose, onLoadResult }: HistorySidebarProps) {
  const [results, setResults] = useState<SavedResult[]>([]);

  useEffect(() => {
    if (isOpen) {
      setResults(getSavedResults());
    }
  }, [isOpen]);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteSavedResult(id);
    setResults(getSavedResults());
  };

  const handleClear = () => {
    if (confirm('هل أنت متأكد من مسح جميع النتائج المحفوظة؟')) {
      clearSavedResults();
      setResults([]);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm bg-slate-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl z-50 flex flex-col"
            dir="rtl"
          >
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-2 text-white">
                <History className="w-5 h-5 text-blue-400" />
                <h2 className="font-semibold text-lg">النتائج المحفوظة</h2>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                aria-label="إغلاق الشاشة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {results.length === 0 ? (
                <div className="text-center text-gray-500 mt-16 px-4">
                  <div className="bg-white/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <History className="w-8 h-8 opacity-50 text-blue-400" />
                  </div>
                  <h3 className="text-gray-300 font-medium mb-1">لا توجد نتائج محفوظة بعد</h3>
                  <p className="text-sm">قم بإجراء بحث أو استخدام إحدى الأدوات ليتم حفظ النتيجة هنا تلقائياً.</p>
                </div>
              ) : (
                results.map((res) => (
                  <div
                    key={res.id}
                    onClick={() => {
                      onLoadResult(res);
                      onClose();
                    }}
                    className="group bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 hover:border-blue-500/30 transition-all cursor-pointer relative shadow-lg"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400`}>
                        {getActionIcon(res.action)}
                        <span>{getActionLabel(res.action)}</span>
                      </div>
                      <span className="text-[11px] font-medium text-gray-500">
                        {new Date(res.date).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-200 line-clamp-2 leading-relaxed" dir="auto">{res.query}</p>
                    
                    <button
                      onClick={(e) => handleDelete(e, res.id)}
                      className="absolute bottom-2 left-2 p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      title="حذف هذه النتيجة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {results.length > 0 && (
              <div className="p-4 border-t border-white/10 bg-black/20">
                <button
                  onClick={handleClear}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10 hover:border-red-500/40 rounded-xl transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  مسح السجل بالكامل
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
