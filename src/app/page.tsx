'use client';

import { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import SearchBox from '@/components/SearchBox';
import ResultCard from '@/components/ResultCard';
import AnswerSection from '@/components/AnswerSection';
import ExtractViewer from '@/components/ExtractViewer';
import CrawlViewer from '@/components/CrawlViewer';
import MapViewer from '@/components/MapViewer';
import ResearchViewer from '@/components/ResearchViewer';
import HistorySidebar from '@/components/HistorySidebar';
import ModelSelector from '@/components/ModelSelector';
import { saveResult, updateSavedResult, SavedResult } from '@/lib/resultHistory';
import {
  ActionType,
  TavilyResponse,
  ExtractResponse,
  CrawlResponse,
  MapResponse,
  ResearchResponse,
} from '@/types';
import { Sparkles, ChevronDown, History, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { addToSearchHistory } from '@/lib/searchHistory';

const RESULTS_PER_PAGE = 5;

export default function Home() {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [selectedModelId, setSelectedModelId] = useState('meta-llama/Llama-3.3-70B-Instruct');
  const [isLoading, setIsLoading] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [activeAction, setActiveAction] = useState<ActionType>('search');
  const [error, setError] = useState<string | null>(null);

  // Image analysis info
  const [imageCaption, setImageCaption] = useState<string | null>(null);
  const [imageQuery, setImageQuery] = useState<string | null>(null);

  // Search state
  const [searchResponse, setSearchResponse] = useState<TavilyResponse | null>(null);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(RESULTS_PER_PAGE);

  // Other tool states
  const [extractResponse, setExtractResponse] = useState<ExtractResponse | null>(null);
  const [crawlResponse, setCrawlResponse] = useState<CrawlResponse | null>(null);
  const [mapResponse, setMapResponse] = useState<MapResponse | null>(null);
  const [researchResponse, setResearchResponse] = useState<ResearchResponse | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);

  const handleLoadResult = (savedResult: SavedResult) => {
    clearAllResponses();
    setActiveAction(savedResult.action);
    setCurrentHistoryId(savedResult.id);

    switch (savedResult.action) {
      case 'search':
        setSearchResponse(savedResult.data);
        if (savedResult.aiAnswer) setAiAnswer(savedResult.aiAnswer);
        break;
      case 'extract':
        setExtractResponse(savedResult.data);
        break;
      case 'crawl':
        setCrawlResponse(savedResult.data);
        break;
      case 'map':
        setMapResponse(savedResult.data);
        break;
      case 'research':
        setResearchResponse(savedResult.data);
        break;
    }
  };

  const clearAllResponses = () => {
    setSearchResponse(null);
    setAiAnswer(null);
    setExtractResponse(null);
    setCrawlResponse(null);
    setMapResponse(null);
    setResearchResponse(null);
    setError(null);
    setVisibleCount(RESULTS_PER_PAGE);
    setCurrentHistoryId(null);
    setImageCaption(null);
    setImageQuery(null);
  };

  const handleSearch = async (
    query: string,
    action: ActionType,
    searchDepth: string,
    includeAnswer: boolean,
    maxResults: number,
    useAI: boolean,
    imageFile?: File | null
  ) => {
    setIsLoading(true);
    clearAllResponses();
    setActiveAction(action);

    try {
      let searchQuery = query;

      // ── Image Analysis Flow ──
      if (imageFile && action === 'search') {
        setIsAnalyzingImage(true);

        // Convert image to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(imageFile);
        });

        // Send to analyze-image API
        const analyzeRes = await fetch('/api/analyze-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: base64,
            userQuery: query || undefined,
            model: selectedModelId,
          }),
        });

        const analyzeData = await analyzeRes.json();
        setIsAnalyzingImage(false);

        if (!analyzeRes.ok) {
          throw new Error(analyzeData.error || 'فشل في تحليل الصورة');
        }

        // Use the optimized query from image analysis
        setImageCaption(analyzeData.caption);
        setImageQuery(analyzeData.optimizedQuery);
        searchQuery = analyzeData.optimizedQuery || analyzeData.caption;

        // If user also typed something, combine it
        if (query) {
          searchQuery = `${query} ${searchQuery}`;
        }
      }

      // Save to history
      if (searchQuery) {
        addToSearchHistory(searchQuery);
      }

      let requestBody: Record<string, any> = { action };

      switch (action) {
        case 'search':
          requestBody = {
            ...requestBody,
            query: searchQuery,
            search_depth: searchDepth,
            include_answer: includeAnswer,
            max_results: maxResults,
          };
          break;
        case 'extract':
          requestBody = {
            ...requestBody,
            urls: query,
            extract_depth: 'basic',
          };
          break;
        case 'crawl':
          requestBody = {
            ...requestBody,
            url: query,
            max_depth: 2,
            max_breadth: 10,
            limit: 20,
          };
          break;
        case 'map':
          requestBody = {
            ...requestBody,
            url: query,
            max_depth: 2,
            max_breadth: 20,
            limit: 50,
          };
          break;
        case 'research':
          requestBody = {
            ...requestBody,
            query: searchQuery,
            model: 'auto',
          };
          break;
      }

      const res = await fetch('/api/tavily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'حدث خطأ');
      }

      // Set the appropriate response
      switch (action) {
        case 'search':
          setSearchResponse(data);
          break;
        case 'extract':
          setExtractResponse(data);
          break;
        case 'crawl':
          setCrawlResponse(data);
          break;
        case 'map':
          setMapResponse(data);
          break;
        case 'research':
          setResearchResponse(data);
          break;
      }

      let savedId: string | null = null;
      try {
        const saved = saveResult(searchQuery || query, action, data);
        savedId = saved.id;
        setCurrentHistoryId(savedId);
      } catch (e) { console.error('Error saving to history', e); }

      setIsLoading(false);

      // If AI analysis is enabled (search only)
      if (action === 'search' && useAI && data.results?.length > 0) {
        setIsAILoading(true);
        const context = data.results
          .slice(0, 10)
          .map((r: any, i: number) => `[${i + 1}] ${r.title}\n${r.content}`)
          .join('\n\n');

        try {
          const aiRes = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: searchQuery, context }),
          });
          const aiData = await aiRes.json();
          if (aiRes.ok) {
            setAiAnswer(aiData.answer);
            if (savedId) {
              updateSavedResult(savedId, { aiAnswer: aiData.answer });
            }
          }
        } catch {
          // AI is optional
        } finally {
          setIsAILoading(false);
        }
      }
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
      setIsAnalyzingImage(false);
    }
  };

  const totalResults = searchResponse?.results?.length || 0;
  const hasMore = visibleCount < totalResults;

  const handleShowMore = () => {
    setVisibleCount((prev) => Math.min(prev + RESULTS_PER_PAGE, totalResults));
  };

  // Loading label based on action
  const getLoadingLabel = () => {
    if (isAnalyzingImage) return 'جارٍ تحليل الصورة بالذكاء الاصطناعي...';
    switch (activeAction) {
      case 'search': return 'جارٍ البحث المتعمّق...';
      case 'extract': return 'جارٍ استخراج المحتوى...';
      case 'crawl': return 'جارٍ الزحف على الموقع...';
      case 'map': return 'جارٍ رسم خريطة الموقع...';
      case 'research': return 'جارٍ البحث المعمّق... قد يستغرق حتى دقيقتين';
    }
  };

  return (
    <main
      className="min-h-screen overflow-x-hidden pb-20"
      style={{
        background: isLight
          ? 'linear-gradient(160deg, #dbeafe 0%, #eef2ff 45%, #f0f9ff 100%)'
          : 'radial-gradient(ellipse at top, #0f2456 0%, #0c1325 50%, #000 100%)',
      }}
      dir="rtl"
    >
      {/* Background glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] blur-[120px] rounded-full pointer-events-none"
        style={{ backgroundColor: isLight ? 'rgba(99,102,241,0.12)' : 'rgba(37,99,235,0.20)' }}
      />

      <div className="container mx-auto px-3 sm:px-4 py-8 sm:py-16 relative z-10">
        
        {/* Toggle Sidebar Button */}
        <div className="absolute top-6 right-6 sm:top-8 sm:right-8 z-20">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex items-center justify-center gap-2 backdrop-blur-md transition-all shadow-lg px-4 py-2.5 rounded-xl border font-medium"
            style={{
              background: isLight ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.05)',
              borderColor: isLight ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.1)',
              color: isLight ? '#334155' : '#d1d5db',
            }}
          >
            <History className="w-5 h-5" style={{ color: isLight ? '#4f46e5' : '#60a5fa' }} />
            <span className="hidden sm:inline">النتائج المحفوظة</span>
          </button>
        </div>

        {/* Header & Model Selector */}
        <div className="flex flex-col items-center mb-10 sm:mb-16 space-y-4 sm:space-y-6">
          <ModelSelector 
            selectedModelId={selectedModelId} 
            onModelSelect={setSelectedModelId} 
          />
          <h1
            className={`text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text mb-2 mt-4 text-center ${
              isLight
                ? 'bg-gradient-to-r from-blue-700 to-indigo-700'
                : 'bg-gradient-to-r from-blue-400 to-indigo-300'
            }`}
          >
            محرك بحث Tavily
          </h1>
          <p
            className="text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed px-2 text-center"
            style={{ color: isLight ? '#334155' : '#9ca3af' }}
          >
            بحث ذكي ومتعمّق باستخدام الذكاء الاصطناعي — احصل على إجابات مفصّلة ونتائج دقيقة في ثوانٍ.
          </p>
        </div>

        {/* Search */}
        <SearchBox onSearch={handleSearch} isLoading={isLoading} isAnalyzingImage={isAnalyzingImage} />

        {/* Loading State */}
        {(isLoading || isAnalyzingImage) && (
          <div className="text-center mt-12">
            <div className="inline-flex items-center gap-3 text-gray-400 bg-white/5 rounded-full px-6 py-3">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span>{getLoadingLabel()}</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="max-w-3xl mx-auto mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center space-y-2">
            <p>{error}</p>
            {error.includes('مدفوعة') || error.includes('ترقية') ? (
              <a
                href="https://app.tavily.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-sm text-blue-400 hover:text-blue-300 underline transition-colors"
              >
                🔗 ترقية حساب Tavily
              </a>
            ) : null}
          </div>
        )}

        {/* ═══ Image Analysis Info ═══ */}
        {activeAction === 'search' && imageCaption && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto mt-6"
          >
            <div className="bg-gradient-to-r from-indigo-500/10 to-blue-500/10 backdrop-blur-md border border-indigo-500/20 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-indigo-300 text-sm font-medium">
                <Camera className="h-4 w-4" />
                <span>تحليل الصورة</span>
              </div>
              <p className="text-gray-300 text-sm" dir="ltr">
                <span className="text-gray-500">📝 Caption: </span>{imageCaption}
              </p>
              {imageQuery && (
                <p className="text-gray-300 text-sm" dir="ltr">
                  <span className="text-gray-500">🔍 Search query: </span>{imageQuery}
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* ═══ Search Results ═══ */}
        {activeAction === 'search' && searchResponse && (
          <div className="max-w-4xl mx-auto mt-8 sm:mt-16 space-y-6 sm:space-y-8">
            {/* Stats bar */}
            <div className="flex justify-between items-end text-sm text-gray-500 border-b border-white/10 pb-4">
              <span>تم العثور على {totalResults} نتيجة</span>
              <span dir="ltr">⏱ {searchResponse.response_time?.toFixed(2)}s</span>
            </div>

            {/* Answers Section */}
            {(searchResponse.answer || isAILoading || aiAnswer) && (
              <AnswerSection
                answer={searchResponse.answer || ''}
                aiAnswer={aiAnswer || undefined}
                isAILoading={isAILoading}
              />
            )}

            {/* Result cards */}
            <div className="grid gap-5">
              <AnimatePresence>
                {searchResponse.results?.slice(0, visibleCount).map((result, index) => (
                  <ResultCard key={result.url + index} result={result} index={index} />
                ))}
              </AnimatePresence>
            </div>

            {/* Show More button */}
            {hasMore && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center pt-4"
              >
                <button
                  onClick={handleShowMore}
                  className="flex items-center gap-2 bg-white/[0.07] hover:bg-white/[0.12] backdrop-blur-md border border-white/15 text-gray-300 hover:text-white px-8 py-3 rounded-xl transition-all shadow-lg group"
                >
                  <span>عرض المزيد من النتائج</span>
                  <ChevronDown className="h-4 w-4 group-hover:translate-y-0.5 transition-transform" />
                </button>
              </motion.div>
            )}

            {/* Pagination info */}
            {totalResults > 0 && (
              <p className="text-center text-xs text-gray-600 pt-2">
                يتم عرض {Math.min(visibleCount, totalResults)} من أصل {totalResults} نتيجة
              </p>
            )}
          </div>
        )}

        {/* ═══ Extract Results ═══ */}
        {activeAction === 'extract' && extractResponse && (
          <ExtractViewer data={extractResponse} />
        )}

        {/* ═══ Crawl Results ═══ */}
        {activeAction === 'crawl' && crawlResponse && (
          <CrawlViewer data={crawlResponse} />
        )}

        {/* ═══ Map Results ═══ */}
        {activeAction === 'map' && mapResponse && (
          <MapViewer data={mapResponse} />
        )}

        {/* ═══ Research Results ═══ */}
        {activeAction === 'research' && researchResponse && (
          <ResearchViewer data={researchResponse} />
        )}

        <HistorySidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onLoadResult={handleLoadResult}
        />
      </div>
    </main>
  );
}
