'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Search,
  Loader2,
  Sparkles,
  Settings,
  Clock,
  X,
  Brain,
  Globe,
  FileText,
  Map,
  BookOpen,
  Camera,
  ImagePlus,
  Trash2,
  MessageSquare,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSearchHistory, clearSearchHistory, addToSearchHistory, deleteFromSearchHistory } from '@/lib/searchHistory';
import { ActionType } from '@/types';
import { useAppMode } from '@/context/AppModeContext';
import { useTheme } from '@/context/ThemeContext';

const TOOLS: { key: ActionType; label: string; icon: React.ReactNode; placeholder: string; description: string }[] = [
  {
    key: 'search',
    label: 'بحث',
    icon: <Search className="h-3.5 w-3.5" />,
    placeholder: 'اكتب سؤالك أو كلمات البحث هنا...',
    description: 'بحث ذكي في الويب',
  },
  {
    key: 'extract',
    label: 'استخراج',
    icon: <FileText className="h-3.5 w-3.5" />,
    placeholder: 'أدخل رابط URL لاستخراج المحتوى منه...',
    description: 'استخراج محتوى صفحة ويب',
  },
  {
    key: 'crawl',
    label: 'زحف',
    icon: <Globe className="h-3.5 w-3.5" />,
    placeholder: 'أدخل رابط الموقع للزحف عليه...',
    description: 'استكشاف موقع بالكامل',
  },
  {
    key: 'map',
    label: 'خريطة',
    icon: <Map className="h-3.5 w-3.5" />,
    placeholder: 'أدخل رابط الموقع لرسم خريطته...',
    description: 'اكتشاف بنية الموقع',
  },
  {
    key: 'research',
    label: 'بحث معمّق',
    icon: <BookOpen className="h-3.5 w-3.5" />,
    placeholder: 'أدخل موضوع البحث المعمّق...',
    description: 'تقرير بحثي شامل',
  },
];

interface SearchBoxProps {
  onSearch: (
    query: string,
    action: ActionType,
    searchDepth: string,
    includeAnswer: boolean,
    maxResults: number,
    useAI: boolean,
    imageFile?: File | null,
    advancedSettings?: {
      exactPhrase?: string;
      excludeWords?: string;
      includeDomains?: string;
      excludeDomains?: string;
    }
  ) => void;
  onStopSearch?: () => void;
  isLoading: boolean;
  isAnalyzingImage?: boolean;
}

export default function SearchBox({ onSearch, onStopSearch, isLoading, isAnalyzingImage }: SearchBoxProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { mode, setMode, lastSearchQuery, setLastSearchQuery } = useAppMode();
  const [query, setQuery] = useState(lastSearchQuery || '');
  const [activeAction, setActiveAction] = useState<ActionType>('search');
  const [searchDepth, setSearchDepth] = useState<'basic' | 'advanced'>('advanced');
  const [includeAnswer, setIncludeAnswer] = useState(true);
  const [maxResults, setMaxResults] = useState(10);
  const [useAI, setUseAI] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showAdvancedInputs, setShowAdvancedInputs] = useState(false);
  
  // Advanced search parameters
  const [exactPhrase, setExactPhrase] = useState('');
  const [excludeWords, setExcludeWords] = useState('');
  const [includeDomains, setIncludeDomains] = useState('');
  const [excludeDomains, setExcludeDomains] = useState('');

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeTool = TOOLS.find((t) => t.key === activeAction)!;

  const refreshSuggestions = (q: string) => {
    const history = getSearchHistory();
    if (q.trim().length > 0) {
      const filtered = history
        .filter((item) => item.query.toLowerCase().includes(q.toLowerCase()))
        .map((item) => item.query)
        .slice(0, 8);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      const recent = history.map((item) => item.query).slice(0, 8);
      setSuggestions(recent);
      setShowSuggestions(recent.length > 0);
    }
  };

  useEffect(() => {
    refreshSuggestions(query);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) return;
      if (file.size > 10 * 1024 * 1024) return;
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => { setImagePreview(reader.result as string); };
      reader.readAsDataURL(file);
      setActiveAction('search');
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() || selectedImage) {
      if (activeAction === 'research' && query.trim().length < 10) return;
      setShowSuggestions(false);
      onSearch(query.trim(), activeAction, searchDepth, includeAnswer, maxResults, useAI, selectedImage, {
        exactPhrase: exactPhrase.trim(),
        excludeWords: excludeWords.trim(),
        includeDomains: includeDomains.trim(),
        excludeDomains: excludeDomains.trim()
      });
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    onSearch(suggestion, activeAction, searchDepth, includeAnswer, maxResults, useAI, selectedImage, {
        exactPhrase: exactPhrase.trim(),
        excludeWords: excludeWords.trim(),
        includeDomains: includeDomains.trim(),
        excludeDomains: excludeDomains.trim()
    });
  };

  /* ─── حذف عنصر واحد من هيستوري الإنبوت ─── */
  const handleDeleteSuggestion = (e: React.MouseEvent, suggestion: string) => {
    e.stopPropagation();
    deleteFromSearchHistory(suggestion);
    refreshSuggestions(query);
  };

  const handleClearHistory = () => {
    clearSearchHistory();
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const resultCountOptions = [5, 10, 15, 20, 25, 30];

  const getButtonLabel = () => {
    if (selectedImage && !query.trim()) return 'بحث بالصورة';
    switch (activeAction) {
      case 'search': return 'بحث';
      case 'extract': return 'استخراج';
      case 'crawl': return 'زحف';
      case 'map': return 'خريطة';
      case 'research': return 'بحث معمّق';
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-3" dir="rtl">
      {/* ── Top Bar Container: Mode Toggle + Tool Tabs ── */}
      <div className="flex flex-row items-center justify-start gap-2 w-full overflow-x-auto scrollbar-none pb-2 sm:justify-center">
        {/* Mode Toggle */}
        <div
          className="flex items-center gap-1 p-0.5 rounded-xl shrink-0"
          style={{
            background: isLight ? "rgba(99,102,241,0.06)" : "rgba(255,255,255,0.04)",
            border: isLight ? "1px solid rgba(99,102,241,0.1)" : "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <button type="button" onClick={() => setMode("search")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300"
            style={{
              background: mode === "search" ? (isLight ? "#4f46e5" : "#3b82f6") : "transparent",
              color: mode === "search" ? "#ffffff" : (isLight ? "#94a3b8" : "#6b7280"),
              boxShadow: mode === "search" ? (isLight ? "0 2px 8px rgba(79,70,229,0.3)" : "0 2px 8px rgba(59,130,246,0.3)") : "none",
            }}
          >
            <Search className="h-3 w-3" />
            بحث
          </button>
          <button type="button" onClick={() => setMode("chat")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300"
            style={{
              background: mode === "chat" ? (isLight ? "#059669" : "#10b981") : "transparent",
              color: mode === "chat" ? "#ffffff" : (isLight ? "#94a3b8" : "#6b7280"),
              boxShadow: mode === "chat" ? (isLight ? "0 2px 8px rgba(5,150,105,0.3)" : "0 2px 8px rgba(16,185,129,0.3)") : "none",
            }}
          >
            <MessageSquare className="h-3 w-3" />
            محادثة
          </button>
        </div>

        {/* ── Tool Selector Tabs ── */}
        <div className="flex items-center gap-1 shrink-0">
        {TOOLS.map((tool) => (
          <button
            key={tool.key}
            onClick={() => { setActiveAction(tool.key); setQuery(''); }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all duration-300 border ${
                activeAction === tool.key
                  ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/25 scale-[1.02]'
                  : 'bg-white/[0.06] text-gray-400 border-white/10 hover:bg-white/[0.12] hover:text-white hover:border-white/20'
              }`}
          >
            {tool.icon}
            <span className="hidden xs:inline sm:inline">{tool.label}</span>
          </button>
        ))}
        </div>
      </div>

      {/* ── Active tool description ── */}
      {activeAction === 'research' && (
      <motion.p
        key={activeAction}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center text-xs text-gray-500"
      >
          <span className="mr-1 text-yellow-500/70">
            أدخل موضوعاً تفصيلياً (10 أحرف على الأقل)
          </span>
      </motion.p>
      )}

      {/* ── Image Preview ── */}
      <AnimatePresence>
        {imagePreview && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="relative mx-auto w-fit"
          >
            <div className="relative rounded-2xl overflow-hidden border-2 border-blue-500/30 bg-white/5 backdrop-blur-md shadow-xl shadow-blue-500/10">
              <img
                src={imagePreview}
                alt="الصورة المختارة"
                className="max-h-40 max-w-full object-contain rounded-2xl"
              />
              {isAnalyzingImage && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 rounded-2xl">
                  <div className="w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-blue-300 text-sm font-medium">جارٍ تحليل الصورة...</span>
                </div>
              )}
              {!isLoading && !isAnalyzingImage && (
                <button
                  onClick={handleRemoveImage}
                  className="absolute top-2 left-2 bg-red-500/80 hover:bg-red-500 text-white p-1.5 rounded-full transition-all shadow-lg backdrop-blur-sm"
                  title="إزالة الصورة"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="text-center text-xs text-gray-400 mt-2">
              {isAnalyzingImage ? 'يتم تحليل الصورة بالذكاء الاصطناعي...' : 'الصورة جاهزة للبحث — اضغط "بحث بالصورة"'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input Form ── */}
      <form onSubmit={handleSubmit} className="relative group w-full">

        {/* ── Autocomplete Suggestions Dropdown (ABSOLUTE UPWARDS) ── */}
        <AnimatePresence>
          {showSuggestions && suggestions.length > 0 && (
            <motion.div
              ref={suggestionsRef}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-[100%] mb-3 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl overflow-hidden z-50"
            >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
              <span className="text-xs text-gray-500 flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                عمليات البحث السابقة
              </span>
              <button
                onClick={handleClearHistory}
                className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-500/10"
              >
                <Trash2 className="h-3 w-3" />
                مسح الكل
              </button>
            </div>

            {/* Suggestion Items */}
            <div className="max-h-[50vh] overflow-y-auto custom-scrollbar">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="flex items-center border-b border-white/5 last:border-0 group hover:bg-white/10 transition-colors"
                >
                  <button
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="flex-1 text-right px-4 py-3 text-gray-300 hover:text-white transition-colors flex items-center gap-3"
                  >
                    <Clock className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                    <span className="truncate text-sm">{suggestion}</span>
                  </button>
                  <button
                    onClick={(e) => handleDeleteSuggestion(e, suggestion)}
                    className="opacity-0 group-hover:opacity-100 p-2 ml-2 mr-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-all shrink-0"
                    title="حذف من السجل"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Options Panel (search only, ABSOLUTE UPWARDS) ── */}
      <AnimatePresence>
        {showOptions && activeAction === 'search' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-[100%] mb-3 left-0 right-0 bg-slate-900/98 backdrop-blur-2xl border border-white/15 p-4 rounded-2xl space-y-4 text-white text-sm shadow-[0_0_30px_rgba(0,0,0,0.5)] z-50 overflow-y-auto max-h-[60vh] custom-scrollbar"
            dir="rtl"
          >
            {/* Row 1: Search Depth + Result Count */}
            <div className="flex flex-wrap gap-4 justify-center">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-200 text-xs sm:text-sm">عمق البحث:</span>
                <div className="flex bg-black/30 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setSearchDepth('basic')}
                    className={`px-3 py-1.5 rounded-md transition-all text-xs ${searchDepth === 'basic' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                  >
                    عادي
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchDepth('advanced')}
                    className={`px-3 py-1.5 rounded-md transition-all text-xs ${searchDepth === 'advanced' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                  >
                    متقدّم
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-200 text-xs sm:text-sm">عدد النتائج:</span>
                <select
                  value={maxResults}
                  onChange={(e) => setMaxResults(Number(e.target.value))}
                  className="bg-black/30 border border-white/15 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {resultCountOptions.map((count) => (
                    <option key={count} value={count} className="bg-slate-900">
                      {count} نتيجة
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Toggles */}
            <div className="flex flex-wrap gap-4 justify-center border-t border-white/10 pt-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-200 text-xs sm:text-sm">إجابة Tavily:</span>
                <button
                  type="button"
                  onClick={() => setIncludeAnswer(!includeAnswer)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${includeAnswer ? 'bg-blue-500' : 'bg-gray-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${includeAnswer ? '-translate-x-1' : '-translate-x-6'}`} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-200 text-xs sm:text-sm flex items-center gap-1">
                  <Brain className="h-3.5 w-3.5 text-purple-400" />
                  تحليل بالذكاء:
                </span>
                <button
                  type="button"
                  onClick={() => setUseAI(!useAI)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${useAI ? 'bg-purple-500' : 'bg-gray-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useAI ? '-translate-x-1' : '-translate-x-6'}`} />
                </button>
                {useAI && (
                  <span className="text-[10px] text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full">HuggingFace</span>
                )}
              </div>
            </div>

            {/* Row 3: Advanced Google-like Input Fields */}
            {activeAction === 'search' && (
              <div className="w-full flex flex-col gap-3 border-t border-white/10 pt-4 mt-2">
                <div 
                  className="flex justify-between items-center cursor-pointer group px-2" 
                  onClick={() => setShowAdvancedInputs(!showAdvancedInputs)}
                >
                  <span className="text-sm font-semibold text-gray-200 group-hover:text-blue-400 transition-colors">
                    بحث متقدم (مثل Google)
                  </span>
                  <span className="text-gray-400 group-hover:text-white transition-colors text-xs">
                    {showAdvancedInputs ? "إخفاء" : "عرض"}
                  </span>
                </div>
                
                <AnimatePresence>
                  {showAdvancedInputs && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }} 
                      animate={{ height: 'auto', opacity: 1 }} 
                      exit={{ height: 0, opacity: 0 }} 
                      className="flex flex-col gap-3 overflow-hidden px-2"
                    >
                      <input 
                        value={exactPhrase} 
                        onChange={(e) => setExactPhrase(e.target.value)} 
                        placeholder='العبارة بالكامل (مثال: فني أمن سيبراني)' 
                        className="bg-black/30 border border-white/15 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 w-full transition-colors" 
                      />
                      <input 
                        value={excludeWords} 
                        onChange={(e) => setExcludeWords(e.target.value)} 
                        placeholder="كلمات مستبعدة تماماً (افصل بمسافة)" 
                        className="bg-black/30 border border-white/15 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-red-500 w-full transition-colors" 
                      />
                      <input 
                        value={includeDomains} 
                        onChange={(e) => setIncludeDomains(e.target.value)} 
                        placeholder="البحث في مواقع محددة (مثال: linkedin.com, portfolio.com)" 
                        className="bg-black/30 border border-white/15 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 w-full transition-colors" 
                      />
                      <input 
                        value={excludeDomains} 
                        onChange={(e) => setExcludeDomains(e.target.value)} 
                        placeholder="استبعاد مواقع بالكامل (مثال: facebook.com)" 
                        className="bg-black/30 border border-white/15 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-orange-500 w-full transition-colors" 
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Inner Input Wrapper ── */}
      <div className="relative w-full">
        {/* Icon right */}
        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
          {isLoading || isAnalyzingImage ? (
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
          ) : (
            <span className="text-gray-400 group-focus-within:text-blue-500 transition-colors">
              {selectedImage ? <Camera className="h-5 w-5 text-blue-400" /> : activeTool.icon}
            </span>
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLastSearchQuery(e.target.value);
          }}
          onFocus={() => {
            const history = getSearchHistory();
            const recent = query.trim()
              ? history.filter((i) => i.query.toLowerCase().includes(query.toLowerCase())).map((i) => i.query).slice(0, 8)
              : history.map((i) => i.query).slice(0, 8);
            setSuggestions(recent);
            if (recent.length > 0) setShowSuggestions(true);
          }}
          placeholder={selectedImage ? 'أضف وصفاً إضافياً (اختياري)...' : activeTool.placeholder}
          className="w-full pr-12 pl-32 sm:pl-40 py-4 sm:py-5 rounded-2xl border-2 border-white/20 bg-white/[0.07] backdrop-blur-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 shadow-2xl transition-all text-sm sm:text-base"
          dir={activeAction === 'search' || activeAction === 'research' ? 'rtl' : 'ltr'}
          autoComplete="off"
        />

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleImageSelect}
          className="hidden"
          id="image-upload"
        />

        {/* Buttons left side */}
        <div className="absolute inset-y-0 left-2 flex items-center gap-1">
          {activeAction === 'search' && !selectedImage && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="hidden sm:flex p-2 rounded-xl text-gray-300 hover:text-blue-400 hover:bg-white/10 transition-all"
              title="البحث بالصورة"
            >
              <ImagePlus className="h-4 w-4" />
            </button>
          )}
          {activeAction === 'search' && (
            <button
              type="button"
              onClick={() => setShowOptions(!showOptions)}
              className={`p-2 rounded-xl transition-all ${showOptions ? 'text-blue-400 bg-white/10' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
              title="إعدادات البحث"
            >
              <Settings className="h-4 w-4" />
            </button>
          )}
          {isLoading ? (
            <button
              type="button"
              onClick={onStopSearch}
              className="bg-red-500 hover:bg-red-600 text-white px-3 sm:px-5 py-2 rounded-xl font-medium transition-all shadow-lg flex items-center gap-1.5"
            >
              <div className="h-3 w-3 bg-white rounded-[2px]" />
              <span className="text-xs sm:text-sm">إيقاف</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={isAnalyzingImage || (!query.trim() && !selectedImage) || (activeAction === 'research' && query.trim().length > 0 && query.trim().length < 10)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-5 py-2 rounded-xl font-medium transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {selectedImage && !query.trim() ? (
                <Camera className="h-4 w-4" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span className="text-xs sm:text-sm">{getButtonLabel()}</span>
            </button>
          )}
        </div>
      </div>
      </form>
    </div>
  );
}
