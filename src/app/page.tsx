"use client";

import AnswerSection from "@/components/AnswerSection";
import ChatWindow from "@/components/ChatWindow";
import CrawlViewer from "@/components/CrawlViewer";
import ExtractViewer from "@/components/ExtractViewer";
import MapViewer from "@/components/MapViewer";
import ModelSelector from "@/components/ModelSelector";
import ResearchViewer from "@/components/ResearchViewer";
import ResultCard from "@/components/ResultCard";
import SearchBox from "@/components/SearchBox";
import Sidebar from "@/components/Sidebar";
import { useAppMode } from "@/context/AppModeContext";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import {
  SavedResult,
  saveResult,
  updateSavedResult,
} from "@/lib/resultHistory";
import { addToSearchHistory } from "@/lib/searchHistory";
import {
  ActionType,
  CrawlResponse,
  ExtractResponse,
  MapResponse,
  ResearchResponse,
  TavilyResponse,
} from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, ChevronDown, MessageSquare, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const RESULTS_PER_PAGE = 5;

export default function Home() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { mode, setMode, setChatMessages, setCurrentChatId } = useAppMode();
  const isLight = theme === "light";

  const [selectedModelId, setSelectedModelId] = useState(
    "meta-llama/Llama-3.3-70B-Instruct"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [activeAction, setActiveAction] = useState<ActionType>("search");
  const [error, setError] = useState<string | null>(null);

  const [imageCaption, setImageCaption] = useState<string | null>(null);
  const [imageQuery, setImageQuery] = useState<string | null>(null);

  const [searchResponse, setSearchResponse] = useState<TavilyResponse | null>(null);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(RESULTS_PER_PAGE);

  const [extractResponse, setExtractResponse] = useState<ExtractResponse | null>(null);
  const [crawlResponse, setCrawlResponse] = useState<CrawlResponse | null>(null);
  const [mapResponse, setMapResponse] = useState<MapResponse | null>(null);
  const [researchResponse, setResearchResponse] = useState<ResearchResponse | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);

  const resultsRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of results when new results come in
  useEffect(() => {
    if (resultsRef.current && (searchResponse || extractResponse || crawlResponse || mapResponse || researchResponse)) {
      resultsRef.current.scrollTop = 0;
    }
  }, [searchResponse, extractResponse, crawlResponse, mapResponse, researchResponse]);

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

  const handleNewChat = () => {
    setCurrentChatId(null);
    setChatMessages([]);
    setMode("chat");
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

      if (imageFile && action === "search") {
        setIsAnalyzingImage(true);
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(imageFile);
        });

        const analyzeRes = await fetch("/api/analyze-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: base64,
            userQuery: query || undefined,
            model: selectedModelId,
          }),
        });

        const analyzeData = await analyzeRes.json();
        setIsAnalyzingImage(false);

        if (!analyzeRes.ok) {
          throw new Error(analyzeData.error || "فشل في تحليل الصورة");
        }

        setImageCaption(analyzeData.caption);
        setImageQuery(analyzeData.optimizedQuery);
        searchQuery = analyzeData.optimizedQuery || analyzeData.caption;

        if (query) {
          searchQuery = `${query} ${searchQuery}`;
        }
      }

      if (searchQuery) {
        addToSearchHistory(searchQuery);
      }

      let requestBody: Record<string, any> = { action };

      switch (action) {
        case "search":
          requestBody = {
            ...requestBody,
            query: searchQuery,
            search_depth: searchDepth,
            include_answer: includeAnswer,
            max_results: maxResults,
          };
          break;
        case "extract":
          requestBody = { ...requestBody, urls: query, extract_depth: "basic" };
          break;
        case "crawl":
          requestBody = { ...requestBody, url: query, max_depth: 2, max_breadth: 10, limit: 20 };
          break;
        case "map":
          requestBody = { ...requestBody, url: query, max_depth: 2, max_breadth: 20, limit: 50 };
          break;
        case "research":
          requestBody = { ...requestBody, query: searchQuery, model: "auto" };
          break;
      }

      const res = await fetch("/api/tavily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "حدث خطأ");

      switch (action) {
        case "search": setSearchResponse(data); break;
        case "extract": setExtractResponse(data); break;
        case "crawl": setCrawlResponse(data); break;
        case "map": setMapResponse(data); break;
        case "research": setResearchResponse(data); break;
      }

      let savedId: string | null = null;
      try {
        const saved = saveResult(searchQuery || query, action, data);
        savedId = saved.id;
        setCurrentHistoryId(savedId);
      } catch (e) {
        console.error("Error saving to history", e);
      }

      if (user) {
        try {
          await fetch("/api/history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: searchQuery || query, action, data }),
          });
        } catch (e) {
          console.error("Error saving to DB history", e);
        }
      }

      setIsLoading(false);

      if (action === "search" && useAI && data.results?.length > 0) {
        setIsAILoading(true);
        const context = data.results
          .slice(0, 10)
          .map((r: any, i: number) => `[${i + 1}] ${r.title}\n${r.content}`)
          .join("\n\n");

        try {
          const aiRes = await fetch("/api/ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: searchQuery, context }),
          });
          const aiData = await aiRes.json();
          if (aiRes.ok) {
            setAiAnswer(aiData.answer);
            if (savedId) updateSavedResult(savedId, { aiAnswer: aiData.answer });
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

  const getLoadingLabel = () => {
    if (isAnalyzingImage) return "جارٍ تحليل الصورة بالذكاء الاصطناعي...";
    switch (activeAction) {
      case "search": return "جارٍ البحث المتعمّق...";
      case "extract": return "جارٍ استخراج المحتوى...";
      case "crawl": return "جارٍ الزحف على الموقع...";
      case "map": return "جارٍ رسم خريطة الموقع...";
      case "research": return "جارٍ البحث المعمّق... قد يستغرق حتى دقيقتين";
    }
  };

  const hasResults = searchResponse || extractResponse || crawlResponse || mapResponse || researchResponse || isLoading || error;

  return (
    <div className="flex h-screen overflow-hidden" dir="rtl">
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen((v) => !v)}
        onNewChat={handleNewChat}
      />

      {/* Main Content */}
      <div
        className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden"
        style={{
          background: isLight
            ? "linear-gradient(160deg, #f8fafc 0%, #eef2ff 50%, #f0f9ff 100%)"
            : "radial-gradient(ellipse at top, #0f172a 0%, #0c1325 50%, #030712 100%)",
        }}
      >
        {/* ═══ Top bar — Model selector centered ═══ */}
        <div
          className="shrink-0 flex items-center justify-center px-4 sm:px-6 py-3 relative"
          style={{
            borderBottom: isLight
              ? "1px solid rgba(99,102,241,0.06)"
              : "1px solid rgba(255,255,255,0.04)",
          }}
        >
          {/* Sidebar toggle (absolute left) */}
          {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="absolute right-4 p-2 rounded-lg transition-colors"
              style={{
                color: isLight ? "#64748b" : "#6b7280",
                background: isLight ? "rgba(99,102,241,0.05)" : "rgba(255,255,255,0.04)",
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 3v18" />
              </svg>
            </button>
          )}

          {/* Model selector centered */}
          <ModelSelector
            selectedModelId={selectedModelId}
            onModelSelect={setSelectedModelId}
          />
        </div>

        {/* ═══ Content Area ═══ */}
        {mode === "search" ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* ── Scrollable results area (fills middle) ── */}
            <div ref={resultsRef} className="flex-1 overflow-y-auto px-3 sm:px-4">
              <div className="max-w-4xl mx-auto py-6">
                {/* Loading */}
                {(isLoading || isAnalyzingImage) && (
                  <div className="text-center mt-8">
                    <div
                      className="inline-flex items-center gap-3 rounded-full px-6 py-3"
                      style={{
                        background: isLight ? "rgba(99,102,241,0.06)" : "rgba(255,255,255,0.05)",
                        color: isLight ? "#4f46e5" : "#9ca3af",
                      }}
                    >
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <span>{getLoadingLabel()}</span>
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="max-w-3xl mx-auto mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center space-y-2">
                    <p>{error}</p>
                    {(error.includes("مدفوعة") || error.includes("ترقية")) && (
                      <a href="https://app.tavily.com" target="_blank" rel="noopener noreferrer"
                        className="inline-block mt-2 text-sm text-blue-400 hover:text-blue-300 underline transition-colors">
                        🔗 ترقية حساب Tavily
                      </a>
                    )}
                  </div>
                )}

                {/* Image Analysis Info */}
                {activeAction === "search" && imageCaption && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto mt-6">
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

                {/* Search Results */}
                {activeAction === "search" && searchResponse && (
                  <div className="space-y-6 mt-4">
                    <div className="flex justify-between items-end text-sm border-b pb-4"
                      style={{ color: isLight ? "#64748b" : "#6b7280", borderColor: isLight ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.08)" }}>
                      <span>تم العثور على {totalResults} نتيجة</span>
                      <span dir="ltr">⏱ {searchResponse.response_time?.toFixed(2)}s</span>
                    </div>

                    {(searchResponse.answer || isAILoading || aiAnswer) && (
                      <AnswerSection answer={searchResponse.answer || ""} aiAnswer={aiAnswer || undefined} isAILoading={isAILoading} />
                    )}

                    <div className="grid gap-5">
                      <AnimatePresence>
                        {searchResponse.results?.slice(0, visibleCount).map((result, index) => (
                          <ResultCard key={result.url + index} result={result} index={index} />
                        ))}
                      </AnimatePresence>
                    </div>

                    {hasMore && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center pt-4">
                        <button onClick={handleShowMore}
                          className="flex items-center gap-2 bg-white/[0.07] hover:bg-white/[0.12] backdrop-blur-md border border-white/15 text-gray-300 hover:text-white px-8 py-3 rounded-xl transition-all shadow-lg group">
                          <span>عرض المزيد من النتائج</span>
                          <ChevronDown className="h-4 w-4 group-hover:translate-y-0.5 transition-transform" />
                        </button>
                      </motion.div>
                    )}

                    {totalResults > 0 && (
                      <p className="text-center text-xs pt-2" style={{ color: isLight ? "#94a3b8" : "#4b5563" }}>
                        يتم عرض {Math.min(visibleCount, totalResults)} من أصل {totalResults} نتيجة
                      </p>
                    )}
                  </div>
                )}

                {activeAction === "extract" && extractResponse && <ExtractViewer data={extractResponse} />}
                {activeAction === "crawl" && crawlResponse && <CrawlViewer data={crawlResponse} />}
                {activeAction === "map" && mapResponse && <MapViewer data={mapResponse} />}
                {activeAction === "research" && researchResponse && <ResearchViewer data={researchResponse} />}

                {/* Empty state */}
                {!hasResults && (
                  <div className="flex flex-col items-center justify-center min-h-[50vh]">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center"
                    >
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                        style={{
                          background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
                          boxShadow: "0 4px 20px rgba(59,130,246,0.25)",
                        }}
                      >
                        <Search className="w-7 h-7 text-white" />
                      </div>
                      <p className="text-sm max-w-sm mx-auto leading-relaxed"
                        style={{ color: isLight ? "#94a3b8" : "#4b5563" }}>
                        ابدأ بكتابة سؤالك في حقل البحث بالأسفل
                      </p>
                    </motion.div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Bottom: Search Input + Mode Toggle ── */}
            <div
              className="shrink-0 px-4 sm:px-6 pb-4 pt-2"
              style={{
                borderTop: isLight
                  ? "1px solid rgba(99,102,241,0.06)"
                  : "1px solid rgba(255,255,255,0.04)",
              }}
            >
              <div className="max-w-3xl mx-auto space-y-3">
                {/* Search Box */}
                <SearchBox
                  onSearch={handleSearch}
                  isLoading={isLoading}
                  isAnalyzingImage={isAnalyzingImage}
                />

                {/* Mode Toggle */}
                <div className="flex items-center justify-center">
                  <div
                    className="flex items-center gap-1 p-1 rounded-xl"
                    style={{
                      background: isLight ? "rgba(99,102,241,0.06)" : "rgba(255,255,255,0.04)",
                      border: isLight ? "1px solid rgba(99,102,241,0.1)" : "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <button type="button" onClick={() => setMode("search")}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300"
                      style={{
                        background: mode === "search" ? (isLight ? "#4f46e5" : "#3b82f6") : "transparent",
                        color: mode === "search" ? "#ffffff" : (isLight ? "#94a3b8" : "#6b7280"),
                        boxShadow: mode === "search" ? (isLight ? "0 2px 8px rgba(79,70,229,0.3)" : "0 2px 8px rgba(59,130,246,0.3)") : "none",
                      }}
                    >
                      <Search className="h-3.5 w-3.5" />
                      بحث
                    </button>
                    <button type="button" onClick={() => setMode("chat")}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300"
                      style={{
                        background: mode === "chat" ? (isLight ? "#059669" : "#10b981") : "transparent",
                        color: mode === "chat" ? "#ffffff" : (isLight ? "#94a3b8" : "#6b7280"),
                        boxShadow: mode === "chat" ? (isLight ? "0 2px 8px rgba(5,150,105,0.3)" : "0 2px 8px rgba(16,185,129,0.3)") : "none",
                      }}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      محادثة
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ═══ Chat Mode ═══ */
          <ChatWindow selectedModelId={selectedModelId} />
        )}
      </div>
    </div>
  );
}
