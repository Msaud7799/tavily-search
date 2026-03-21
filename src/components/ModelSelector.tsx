'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  Search, 
  Settings2, 
  Camera, 
  Wrench, 
  X,
  Loader2,
  CheckCircle2,
  Box,
  Copy,
  Check
} from 'lucide-react';

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  supports_image: boolean;
  supports_tools: boolean;
  logoUrl?: string;
  description_ar?: string;
}

interface ModelSelectorProps {
  selectedModelId: string;
  onModelSelect: (modelId: string) => void;
  variant?: 'default' | 'sidebar' | 'empty-state';
}

/*----------
 * مكون اختيار النموذج (ModelSelector).
 * قائمة منسدلة واجهة بحث (Modal) تتيح للمستخدم الاستعلام واختيار نموذج اللغة المطلوب.
 *
 * @param {string} selectedModelId - معرّف النموذج المختار حالياً.
 * @param {Function} onModelSelect - دالة تُستدعى حين يختار المستخدم نموذجاً جديداً.
 * @param {string} variant - شكل زر التفعيل (الافتراضي أو مخصص للشريط الجانبي).
 * @returns {JSX.Element} واجهة لاختيار النموذج المفضل.
----------*/
export default function ModelSelector({ selectedModelId, onModelSelect, variant = 'default' }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState<AIModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };
  
  // Fetch models only when the modal opens for the first time
  useEffect(() => {
    if (isOpen && models.length === 0) {
      const fetchModels = async () => {
        setIsLoading(true);
        try {
          const res = await fetch('/api/models');
          if (res.ok) {
            const data = await res.json();
            setModels(data.models || []);
          }
        } catch (error) {
          console.error("Failed to fetch models", error);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchModels();
    }
  }, [isOpen, models.length]);

  // If a model is selected but we haven't loaded models yet, we just show its ID
  const selectedModel = models.find(m => m.id === selectedModelId);
  const displayTitle = selectedModel ? selectedModel.name : (selectedModelId === 'Omni' ? 'Omni (Auto Route)' : selectedModelId.split('/').pop() || 'اختر نموذجاً');
  const displayProvider = selectedModel ? selectedModel.provider : (selectedModelId === 'Omni' ? 'System' : selectedModelId.split('/')[0] || '');
  const displayLogo = selectedModel ? selectedModel.logoUrl : (selectedModelId === 'Omni' ? 'https://huggingface.co/api/avatars/huggingface' : `https://huggingface.co/api/avatars/${encodeURIComponent(displayProvider)}`);

  const filteredModels = models.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Trigger Button */}
      {variant === 'sidebar' ? (
        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setIsOpen(true)}>
          <div className="flex items-center gap-2 text-sm text-gray-300">
             <Box size={16} className="text-gray-500" />
             <span>Models</span>
          </div>
          <span className="text-xs bg-white/10 text-gray-400 px-1.5 rounded">{models.length > 0 ? models.length : 124}</span>
        </div>
      ) : variant === 'empty-state' ? (
         <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/30 text-gray-200 px-5 py-3 rounded-2xl backdrop-blur-md transition-all shadow-xl group"
          title="تغيير نموذج الذكاء الاصطناعي"
        >
          {displayLogo && (
            <img src={displayLogo} alt={displayProvider} className="w-8 h-8 rounded-full bg-white/10 object-cover border border-white/20 shadow-md" />
          )}
          <span className="text-sm font-semibold text-white tracking-wide truncate">
            {displayTitle} <span className="text-gray-500 text-xs font-normal">by {displayProvider}</span>
          </span>
          <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-blue-400 transition-colors mr-2" />
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 lg:gap-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/30 text-gray-200 px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl backdrop-blur-md transition-all shadow-lg group w-fit"
          title="تغيير نموذج الذكاء الاصطناعي"
        >
          {displayLogo && (
            <img src={displayLogo} alt={displayProvider} className="w-10 h-10 rounded-full bg-white/10 object-cover" />
          )}
          <div className="flex flex-col items-start leading-tight" dir="ltr">
            <span className="text-xs text-gray-400 font-medium group-hover:text-gray-300 transition-colors">{displayProvider}</span>
            <span className="text-sm font-bold text-white tracking-wide truncate max-w-[120px] lg:max-w-[180px]">
              {displayTitle}
            </span>
          </div>
          <div className="w-px h-6 bg-white/10 mx-1 hidden lg:block" />
          <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-blue-400 transition-colors" />
        </button>
      )}

      {/* Full Modal----------*/}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" dir="rtl">
            {/* Backdrop----------*/}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            {/* Modal Content----------*/}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-4xl max-h-[85vh] mt-25 flex flex-col bg-slate-900 border border-white/10 shadow-2xl rounded-2xl overflow-hidden"
            >
              {/* Header----------*/}
              <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                    <Settings2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">النماذج المتاحة</h2>
                    <p className="text-sm text-gray-400">اختر محرك الذكاء الاصطناعي لعمليات البحث والتحليل</p>
                  </div>
                </div>
                
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Search Bar----------*/}
              <div className="p-4 border-b border-white/5">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث عن نموذج أو مزوّد (مثل: Llama, Qwen, DeepSeek)..."
                    className="w-full bg-black/40 border border-white/10 text-white placeholder-gray-500 rounded-xl py-3 pr-12 pl-4 focus:outline-none focus:border-blue-500 transition-colors ltr:pr-4 ltr:pl-12 text-left"
                    dir="ltr"
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                </div>
                
                {/* Legend----------*/}
                <div className="flex flex-wrap items-center gap-4 mt-4 px-2 text-xs">
                  <span className="text-gray-500">العلامات:</span>
                  <div className="flex items-center gap-1.5 text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded-md">
                    <Camera className="h-3.5 w-3.5" />
                    <span>يدعم الصور (VLM)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded-md">
                    <Wrench className="h-3.5 w-3.5" />
                    <span>يدعم الأدوات (MCP)</span>
                  </div>
                </div>
              </div>

              {/* Model List----------*/}
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-40 space-y-4">
                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                    <p className="text-gray-400">جاري جلب النماذج من HuggingFace...</p>
                  </div>
                ) : filteredModels.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" dir="ltr">
                    {filteredModels.map((model) => {
                      const isSelected = selectedModelId === model.id;
                      return (
                        <div
                          key={model.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            onModelSelect(model.id);
                            setIsOpen(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onModelSelect(model.id);
                              setIsOpen(false);
                            }
                          }}
                          className={`flex flex-col items-start p-4 rounded-xl text-left border transition-all cursor-pointer relative group/card ${
                            isSelected 
                              ? 'bg-blue-600/20 border-blue-500 hover:bg-blue-600/30' 
                              : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-start justify-between w-full mb-2">
                            <div className="flex items-center gap-2">
                              {model.logoUrl && (
                                <img src={model.logoUrl} alt={model.provider} className="w-10 h-10 rounded-full bg-white/10 object-cover" />
                              )}
                              <span className={`text-xs font-semibold uppercase tracking-wider ${isSelected ? 'text-blue-300' : 'text-gray-500'}`}>
                                {model.provider}
                              </span>
                            </div>
                            {isSelected && <CheckCircle2 className="h-4 w-4 text-blue-400" />}
                          </div>
                          
                          <div className="flex items-start justify-between w-full mb-1">
                            <span className={`font-bold truncate pr-1 ${isSelected ? 'text-white' : 'text-gray-200'}`} title={model.name}>
                              {model.name}
                            </span>
                            <button
                              onClick={(e) => handleCopy(e, model.id)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex-shrink-0 z-10"
                              title="نسخ معرف النموذج (ID)"
                            >
                              {copiedId === model.id ? (
                                <Check className="h-3.5 w-3.5 text-green-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                          
                          {model.description_ar && (
                            <p className="text-[11px] leading-relaxed text-gray-400 mb-3 line-clamp-2 w-full pr-1 font-medium" title={model.description_ar}>
                              {model.description_ar}
                            </p>
                          )}
                          
                          <div className={`mt-auto flex items-center gap-2 w-full pt-3 border-t ${isSelected ? 'border-blue-500/30' : 'border-white/10'}`}>
                            {model.supports_image ? (
                              <div className="flex items-center gap-1 text-[10px] text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded" title="Vision Model (VLM)">
                                <Camera className="h-3 w-3" /> Image
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
                                <Box className="h-3 w-3" /> Text
                              </div>
                            )}
                            
                            {model.supports_tools && (
                              <div className="flex items-center gap-1 text-[10px] text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded" title="Tool Calling (MCP)">
                                <Wrench className="h-3 w-3" /> Tools
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-500">
                    لم يتم العثور على نماذج تطابق بحثك.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
