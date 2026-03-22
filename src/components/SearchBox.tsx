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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSearchHistory, clearSearchHistory, addToSearchHistory } from '@/lib/searchHistory';
import { ActionType } from '@/types';

const TOOLS: { key: ActionType; label: string; icon: React.ReactNode; placeholder: string; description: string }[] = [
  {
    key: 'search',
    label: 'بحث',
    icon: <Search className="h-4 w-4" />,
    placeholder: 'اكتب سؤالك أو كلمات البحث هنا...',
    description: 'بحث ذكي في الويب',
  },
  {
    key: 'extract',
    label: 'استخراج',
    icon: <FileText className="h-4 w-4" />,
    placeholder: 'أدخل رابط URL لاستخراج المحتوى منه...',
    description: 'استخراج محتوى صفحة ويب',
  },
  {
    key: 'crawl',
    label: 'زحف',
    icon: <Globe className="h-4 w-4" />,
    placeholder: 'أدخل رابط الموقع للزحف عليه...',
    description: 'استكشاف موقع بالكامل',
  },
  {
    key: 'map',
    label: 'خريطة',
    icon: <Map className="h-4 w-4" />,
    placeholder: 'أدخل رابط الموقع لرسم خريطته...',
    description: 'اكتشاف بنية الموقع',
  },
  {
    key: 'research',
    label: 'بحث معمّق',
    icon: <BookOpen className="h-4 w-4" />,
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
    imageFile?: File | null
  ) => void;
  isLoading: boolean;
  isAnalyzingImage?: boolean;
}

/*----------
 * مكون صندوق البحث (SearchBox):
 * يُقدم واجهة للمستخدم لإدخال الاستعلامات واختيار نوع الإجراء (بحث، زحف، استخراج، إلخ).
 * يحتوي أيضاً على ميزات الرفع المرفقات كالصور والتعامل مع السجل المقترح.
----------*/
export default function SearchBox({ onSearch, isLoading, isAnalyzingImage }: SearchBoxProps) {
  const [query, setQuery] = useState('');
  const [activeAction, setActiveAction] = useState<ActionType>('search');
  const [searchDepth, setSearchDepth] = useState<'basic' | 'advanced'>('advanced');
  const [includeAnswer, setIncludeAnswer] = useState(true);
  const [maxResults, setMaxResults] = useState(10);
  const [useAI, setUseAI] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeTool = TOOLS.find((t) => t.key === activeAction)!;

  useEffect(() => {
    if (query.trim().length > 0) {
      const history = getSearchHistory();
      const filtered = history
        .filter((item) => item.query.toLowerCase().includes(query.toLowerCase()))
        .map((item) => item.query)
        .slice(0, 8);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      const history = getSearchHistory();
      const recent = history.map((item) => item.query).slice(0, 8);
      setSuggestions(recent);
    }
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

  /*----------
   * دالة معالجة اختيار صورة:
   * تقوم بالتحقق من نوع وحجم الملف المرفق قبل رفعه وعرض معاينة له.
  ----------*/
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      // Auto-switch to search mode when image is selected
      setActiveAction('search');
    }
  };

  /*----------
   * دالة لإزالة الصورة المختارة، حيث تقوم بمسح المعاينة والملف المُحمل تفادياً لإرساله.
  ----------*/
  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /*----------
   * التعامل مع إرسال فورم البحث:
   * تمنع التحديث الافتراضي، تتحقق من صحة وقوة الاستعلام وخاصة في نظام "الأبحاث"، ومن ثم تنقل المدخلات للدالة العليا.
  ----------*/
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() || selectedImage) {
      // Validate minimum query length for research mode
      if (activeAction === 'research' && query.trim().length < 10) {
        return;
      }
      setShowSuggestions(false);
      if (query.trim()) {
        addToSearchHistory(query.trim());
      }
      onSearch(query.trim(), activeAction, searchDepth, includeAnswer, maxResults, useAI, selectedImage);
    }
  };

  /*----------
   * عند النقر على إحدى نتائج البحث السابقة (المقترحات):
   * يتم وضعها في الصندوق وتدشين عملية البحث المباشر عنها.
  ----------*/
  const handleSelectSuggestion = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    addToSearchHistory(suggestion);
    onSearch(suggestion, activeAction, searchDepth, includeAnswer, maxResults, useAI, selectedImage);
  };

  /*----------
   * دالة تفريغ سجل البحث الماضي (تختفي المقترحات المرئية وتُمْسَح من الذاكرة المحلية).
  ----------*/
  const handleClearHistory = () => {
    clearSearchHistory();
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const resultCountOptions = [5, 10, 15, 20, 25, 30];

  /*----------
   * تُرجع النص المناسب لزر البحث بحسب نوع العملية التي تم اختيارها.
  ----------*/
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
    <div className="w-full max-w-3xl mx-auto space-y-4" dir="rtl">
      {/* Tool Selector Tabs----------*/}
      <div className="flex gap-1.5 justify-center flex-wrap">
        {TOOLS.map((tool) => (
          <button
            key={tool.key}
            onClick={() => {
              setActiveAction(tool.key);
              setQuery('');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 border ${
              activeAction === tool.key
                ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/25 scale-[1.02]'
                : 'bg-white/[0.06] text-gray-400 border-white/10 hover:bg-white/[0.12] hover:text-white hover:border-white/20'
            }`}
          >
            {tool.icon}
            <span>{tool.label}</span>
          </button>
        ))}
      </div>

      {/* Active tool description----------*/}
      <motion.p
        key={activeAction}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center text-xs text-gray-500"
      >
        {activeTool.description}
        {activeAction === 'research' && (
          <span className="mr-1 text-yellow-500/70">
            — أدخل موضوعاً تفصيلياً (10 أحرف على الأقل)
          </span>
        )}
      </motion.p>

      {/* Image Preview----------*/}
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
                className="max-h-48 max-w-full object-contain rounded-2xl"
              />
              {/* Analyzing overlay----------*/}
              {isAnalyzingImage && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 rounded-2xl">
                  <div className="w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-blue-300 text-sm font-medium">جارٍ تحليل الصورة...</span>
                </div>
              )}
              {/* Remove button----------*/}
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

      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
          {isLoading || isAnalyzingImage ? (
            <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
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
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            const history = getSearchHistory();
            const recent = query.trim()
              ? history.filter((i) => i.query.toLowerCase().includes(query.toLowerCase())).map((i) => i.query).slice(0, 8)
              : history.map((i) => i.query).slice(0, 8);
            setSuggestions(recent);
            if (recent.length > 0) setShowSuggestions(true);
          }}
          placeholder={selectedImage ? 'أضف وصفاً إضافياً (اختياري) أو اضغط بحث...' : activeTool.placeholder}
          className="w-full pr-14 pl-44 py-5 rounded-2xl border-2 border-white/20 bg-white/[0.07] backdrop-blur-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 shadow-2xl transition-all text-base"
          dir={activeAction === 'search' || activeAction === 'research' ? 'rtl' : 'ltr'}
          autoComplete="off"
        />

        {/* Hidden file input----------*/}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleImageSelect}
          className="hidden"
          id="image-upload"
        />

        <div className="absolute inset-y-0 left-2 flex items-center gap-1.5">
          {/* Camera/Image upload button----------*/}
          {activeAction === 'search' && !selectedImage && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl text-gray-300 hover:text-blue-400 hover:bg-white/10 transition-all"
              title="البحث بالصورة"
            >
              <ImagePlus className="h-5 w-5" />
            </button>
          )}

          {activeAction === 'search' && (
            <button
              type="button"
              onClick={() => setShowOptions(!showOptions)}
              className={`p-2 rounded-xl transition-all ${showOptions ? 'text-blue-400 bg-white/10' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
              title="إعدادات البحث"
            >
              <Settings className="h-5 w-5" />
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading || isAnalyzingImage || (!query.trim() && !selectedImage) || (activeAction === 'research' && query.trim().length > 0 && query.trim().length < 10)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-medium transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {selectedImage && !query.trim() ? (
              <Camera className="h-4 w-4" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            <span>{getButtonLabel()}</span>
          </button>
        </div>
      </form>

      {/* Autocomplete Suggestions Dropdown----------*/}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
            <motion.div
              ref={suggestionsRef}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="bg-slate-900/95 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
                <span className="text-xs text-gray-500 flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  عمليات البحث السابقة
                </span>
                <button
                  onClick={handleClearHistory}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  مسح الكل
                </button>
              </div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="w-full text-right px-4 py-3 text-gray-300 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-3 border-b border-white/5 last:border-0"
                >
                  <Clock className="h-4 w-4 text-gray-500 shrink-0" />
                  <span className="truncate">{suggestion}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

      {/* Options Panel (only for search)----------*/}
      <AnimatePresence>
        {showOptions && activeAction === 'search' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white/[0.07] backdrop-blur-lg border border-white/15 p-5 rounded-2xl space-y-5 text-white text-sm"
            dir="rtl"
          >
            {/* Row 1: Search Depth + Result Count----------*/}
            <div className="flex flex-wrap gap-8 justify-center">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-200">عمق البحث:</span>
                <div className="flex bg-black/30 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setSearchDepth('basic')}
                    className={`px-4 py-1.5 rounded-md transition-all text-sm ${searchDepth === 'basic' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                  >
                    عادي
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchDepth('advanced')}
                    className={`px-4 py-1.5 rounded-md transition-all text-sm ${searchDepth === 'advanced' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                  >
                    متقدّم
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-200">عدد النتائج:</span>
                <select
                  value={maxResults}
                  onChange={(e) => setMaxResults(Number(e.target.value))}
                  className="bg-black/30 border border-white/15 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {resultCountOptions.map((count) => (
                    <option key={count} value={count} className="bg-slate-900">
                      {count} نتيجة
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Toggles----------*/}
            <div className="flex flex-wrap gap-8 justify-center border-t border-white/10 pt-4">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-200">إجابة Tavily:</span>
                <button
                  type="button"
                  onClick={() => setIncludeAnswer(!includeAnswer)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${includeAnswer ? 'bg-blue-500' : 'bg-gray-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${includeAnswer ? '-translate-x-1' : '-translate-x-6'}`} />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-200 flex items-center gap-1.5">
                  <Brain className="h-4 w-4 text-purple-400" />
                  تحليل بالذكاء الاصطناعي:
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
