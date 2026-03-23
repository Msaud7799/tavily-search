'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, Search, Settings2, Camera, Wrench, X,
  Loader2, CheckCircle2, Box, Copy, Check
} from 'lucide-react';
import { IconOmni } from './icons/IconOmni';

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  supports_image: boolean;
  supports_tools: boolean;
  logoUrl?: string;
  description_ar?: string;
}

interface TopModelSelectorProps {
  selectedModelId: string;
  onModelSelect: (modelId: string) => void;
}

export default function TopModelSelector({ selectedModelId, onModelSelect }: TopModelSelectorProps) {
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

  const selectedModel = models.find(m => m.id === selectedModelId);
  const displayTitle = selectedModel ? selectedModel.name : (selectedModelId === 'Omni' ? 'Omni (Auto Route)' : selectedModelId.split('/').pop() || 'اختر نموذجاً');
  const displayProvider = selectedModel ? selectedModel.provider : (selectedModelId === 'Omni' ? 'System' : selectedModelId.split('/')[0] || '');
  const isOmni = selectedModelId === 'Omni' || selectedModel?.name === 'Omni';
  const displayLogo = selectedModel ? selectedModel.logoUrl : (!isOmni ? `https://huggingface.co/api/avatars/${encodeURIComponent(displayProvider)}` : '');

  const filteredModels = models.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl backdrop-blur-md transition-all shadow-md group"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-primary)',
          color: 'var(--text-secondary)',
        }}
        title="تغيير نموذج الذكاء الاصطناعي"
      >
        {isOmni ? (
          <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-indigo-500 text-[1.2rem] pb-[2px]" style={{ border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-card)' }}>
            <IconOmni />
          </div>
        ) : displayLogo && (
          <img src={displayLogo} alt={displayProvider} className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover" style={{ border: '1px solid var(--border-primary)' }} />
        )}
        <div className="flex items-center gap-1.5" dir="ltr">
          <span className="text-xs sm:text-sm font-semibold tracking-wide max-w-[100px] sm:max-w-[200px] truncate" style={{ color: 'var(--text-primary)' }}>
            {displayTitle}
          </span>
          <span className="hidden sm:inline text-[10px] font-normal" style={{ color: 'var(--text-muted)' }}>
            by {displayProvider}
          </span>
        </div>
        <ChevronDown className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" dir="rtl">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl rounded-2xl overflow-hidden"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--border-primary)' }}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                    <Settings2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>النماذج المتاحة</h2>
                    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>اختر محرك الذكاء الاصطناعي</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Search */}
              <div className="p-4" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث عن نموذج أو مزوّد..."
                    className="w-full rounded-xl py-3 pr-12 pl-4 focus:outline-none transition-colors text-left"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-primary)',
                      color: 'var(--text-primary)',
                    }}
                    dir="ltr"
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>

              {/* Model List */}
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-40 space-y-4">
                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                    <p style={{ color: 'var(--text-tertiary)' }}>جاري جلب النماذج...</p>
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
                          onClick={() => { onModelSelect(model.id); setIsOpen(false); }}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onModelSelect(model.id); setIsOpen(false); } }}
                          className="flex flex-col items-start p-4 rounded-xl text-left transition-all cursor-pointer relative group/card"
                          style={{
                            backgroundColor: isSelected ? 'rgba(37,99,235,0.15)' : 'var(--bg-card)',
                            border: `1px solid ${isSelected ? 'var(--accent-blue)' : 'var(--border-secondary)'}`,
                          }}
                        >
                          <div className="flex items-start justify-between w-full mb-2">
                            <div className="flex items-center gap-2">
                              {model.id === 'Omni' ? (
                                <div className="flex items-center justify-center w-10 h-10 rounded-full text-indigo-500 text-[1.5rem]" style={{ backgroundColor: 'var(--bg-card)' }}>
                                  <IconOmni />
                                </div>
                              ) : model.logoUrl && (
                                <img src={model.logoUrl} alt={model.provider} className="w-10 h-10 rounded-full object-cover" style={{ backgroundColor: 'var(--bg-card)' }} />
                              )}
                              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: isSelected ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
                                {model.provider}
                              </span>
                            </div>
                            {isSelected && <CheckCircle2 className="h-4 w-4 text-blue-400" />}
                          </div>
                          <div className="flex items-start justify-between w-full mb-1">
                            <span className="font-bold truncate pr-1" style={{ color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }} title={model.name}>
                              {model.name}
                            </span>
                            <button
                              onClick={(e) => handleCopy(e, model.id)}
                              className="p-1.5 rounded-lg transition-colors flex-shrink-0 z-10"
                              style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)' }}
                              title="نسخ معرف النموذج"
                            >
                              {copiedId === model.id ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                          {model.description_ar && (
                            <p className="text-[11px] leading-relaxed mb-3 line-clamp-2 w-full pr-1 font-medium" style={{ color: 'var(--text-tertiary)' }} title={model.description_ar}>
                              {model.description_ar}
                            </p>
                          )}
                          <div className="mt-auto flex items-center gap-2 w-full pt-3" style={{ borderTop: `1px solid ${isSelected ? 'rgba(37,99,235,0.3)' : 'var(--border-secondary)'}` }}>
                            {model.supports_image ? (
                              <div className="flex items-center gap-1 text-[10px] text-indigo-400 bg-indigo-500/20 px-1.5 py-0.5 rounded">
                                <Camera className="h-3 w-3" /> Image
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded" style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-card)' }}>
                                <Box className="h-3 w-3" /> Text
                              </div>
                            )}
                            {model.supports_tools && (
                              <div className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                                <Wrench className="h-3 w-3" /> Tools
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10" style={{ color: 'var(--text-muted)' }}>
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
