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
import { Download, Camera, ChevronDown, MessageSquare, Plus, Minus, Search, FileText, FileCode2, Copy, CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState, useMemo } from "react";

const RESULTS_PER_PAGE = 5;

export default function Home() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { mode, setMode, setChatMessages, setCurrentChatId } = useAppMode();
  const isLight = theme === "light";

  const [selectedModelId, setSelectedModelId] = useState(
    "Omni"
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

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [useAI, setUseAI] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);

  // Zoom feature for search
  const [fontSize, setFontSize] = useState(0.9375); // default ~15px
  const zoomIn  = () => setFontSize((s) => Math.min(parseFloat((s + 0.0625).toFixed(4)), 1.5));
  const zoomOut = () => setFontSize((s) => Math.max(parseFloat((s - 0.0625).toFixed(4)), 0.7));

  // Export & Copy dropdowns state
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const [copiedState, setCopiedState] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
        setShowCopyMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const generateOutputContent = (format: "md" | "txt") => {
    let content = "";
    
    // Add title/query
    const title = imageQuery || lastQuery || "نتائج البحث";
    content += format === "md" ? `# ${title}\n\n` : `${title}\n======================\n\n`;

    if (imageCaption) {
      content += format === "md" ? `**تحليل الصورة:**\n${imageCaption}\n\n` : `تحليل الصورة:\n${imageCaption}\n\n`;
    }

    if (aiAnswer) {
      content += format === "md" ? `## الإجابة الذكية:\n${aiAnswer}\n\n` : `الإجابة الذكية:\n----------------\n${aiAnswer}\n\n`;
    }

    if (searchResponse?.answer) {
      content += format === "md" ? `## إجابة Tavily:\n${searchResponse.answer}\n\n` : `إجابة Tavily:\n----------------\n${searchResponse.answer}\n\n`;
    }

    if (searchResponse?.results && searchResponse.results.length > 0) {
      content += format === "md" ? `## المصادر:\n` : `المصادر:\n--------\n`;
      searchResponse.results.forEach((r, i) => {
        content += format === "md" ? `${i + 1}. [${r.title}](${r.url})\n   ${r.content}\n\n` : `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.content}\n\n`;
      });
    }

    return content;
  };

  const handleExport = (format: "md" | "txt") => {
    setShowExportMenu(false);
    const content = generateOutputContent(format);
    if (!content.trim()) return;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `نتائج_البحث_${Date.now()}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async (format: "md" | "txt") => {
    setShowCopyMenu(false);
    const content = generateOutputContent(format);
    if (!content.trim()) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 2000);
    } catch {}
  };

  const [lastQuery, setLastQuery] = useState("");

  const resultsRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of results when new results come in
  useEffect(() => {
    if (resultsRef.current && (searchResponse || extractResponse || crawlResponse || mapResponse || researchResponse)) {
      resultsRef.current.scrollTop = 0;
    }
  }, [searchResponse, extractResponse, crawlResponse, mapResponse, researchResponse]);

  // Restore search view state from sessionStorage on mount to survive refresh
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedData = sessionStorage.getItem("current-search-view");
        if (savedData) {
          const parsed = JSON.parse(savedData);
          setLastQuery(parsed.lastQuery || "");
          setActiveAction(parsed.activeAction || "search");
          setAiAnswer(parsed.aiAnswer || null);
          setImageCaption(parsed.imageCaption || null);
          setImageQuery(parsed.imageQuery || null);
          setSearchResponse(parsed.searchResponse || null);
          setExtractResponse(parsed.extractResponse || null);
          setCrawlResponse(parsed.crawlResponse || null);
          setMapResponse(parsed.mapResponse || null);
          setResearchResponse(parsed.researchResponse || null);
        }
      } catch (e) { console.error(e); }
    }
  }, []);

  // Save current search view state to sessionStorage to survive refresh
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("current-search-view", JSON.stringify({
        lastQuery,
        activeAction,
        aiAnswer,
        imageCaption,
        imageQuery,
        searchResponse,
        extractResponse,
        crawlResponse,
        mapResponse,
        researchResponse
      }));
    }
  }, [lastQuery, activeAction, aiAnswer, imageCaption, imageQuery, searchResponse, extractResponse, crawlResponse, mapResponse, researchResponse]);

  const clearAllResponses = () => {
    setIsAILoading(false);
    setSearchResponse(null);
    setAiAnswer("");
    setExtractResponse(null);
    setCrawlResponse(null);
    setMapResponse(null);
    setResearchResponse(null);
    setError("");
    setVisibleCount(RESULTS_PER_PAGE);
    setCurrentHistoryId(null);
    abortControllerRef.current = new AbortController();
    setImageCaption(null);
    setImageQuery(null);
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
    setChatMessages([]);
    setMode("chat");
  };

  const handleLoadSearch = (item: any) => {
    setMode("search");
    clearAllResponses();
    setLastQuery(item.query);
    setActiveAction(item.action);
    setAiAnswer(item.aiAnswer || null);
    
    if (item.data) {
      switch (item.action) {
        case "search": setSearchResponse(item.data); break;
        case "extract": setExtractResponse(item.data); break;
        case "crawl": setCrawlResponse(item.data); break;
        case "map": setMapResponse(item.data); break;
        case "research": setResearchResponse(item.data); break;
      }
    }
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  // --- handleStopSearch ---
  const handleStopSearch = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setIsAILoading(false);
      setIsAnalyzingImage(false);
    }
  };

  const handleSearch = async (
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
  ) => {
    setIsLoading(true);
    clearAllResponses();
    setActiveAction(action);

    try {
      let finalBaseQuery = query;
      if (advancedSettings?.exactPhrase && advancedSettings.exactPhrase.trim() !== '') {
        finalBaseQuery += ` "${advancedSettings.exactPhrase.trim()}"`;
      }
      if (advancedSettings?.excludeWords && advancedSettings.excludeWords.trim() !== '') {
        const excludes = advancedSettings.excludeWords.split(/\s+/).filter(w => w).map(w => `-${w}`).join(' ');
        if (excludes) finalBaseQuery += ` ${excludes}`;
      }

      let searchQuery = finalBaseQuery;

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
          signal: abortControllerRef.current?.signal,
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

        if (finalBaseQuery) {
          searchQuery = `${finalBaseQuery} ${searchQuery}`;
        }
      }

      if (searchQuery) {
        addToSearchHistory(searchQuery);
        setLastQuery(searchQuery);
      }

      let requestBody: Record<string, any> = { action };

      switch (action) {
        case "search":
          const cleanDomain = (domain: string) => {
            let d = domain.trim();
            d = d.replace(/^https?:\/\//i, ""); // Remove http:// or https://
            d = d.split('/')[0];                // Keep only the hostname part (ignores paths like /*)
            d = d.replace(/^\*\.?/g, "");       // Remove leading wildcards like *. or *
            return d;
          };

          const incDomains = advancedSettings?.includeDomains?.split(',').map(cleanDomain).filter(d => !!d);
          const excDomains = advancedSettings?.excludeDomains?.split(',').map(cleanDomain).filter(d => !!d);

          requestBody = {
            ...requestBody,
            query: searchQuery,
            search_depth: searchDepth,
            include_answer: includeAnswer,
            max_results: maxResults,
            ...(incDomains && incDomains.length > 0 && { include_domains: incDomains }),
            ...(excDomains && excDomains.length > 0 && { exclude_domains: excDomains }),
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
        signal: abortControllerRef.current?.signal,
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
            signal: abortControllerRef.current?.signal,
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
      if (err.name === "AbortError") {
        console.log("تم إيقاف البحث من قِبل المستخدم");
        return;
      }
      console.error(err);
      setError(err?.message || "حدث خطأ غير معروف أثناء البحث");
    } finally {
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
        onLoadSearch={handleLoadSearch}
      />

      {/* Main Content */}
      <div
        className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden transition-all duration-300"
        style={{
          background: isLight
            ? "linear-gradient(160deg, #f8fafc 0%, #eef2ff 50%, #f0f9ff 100%)"
            : "radial-gradient(ellipse at top, #0f172a 0%, #0c1325 50%, #030712 100%)",
          marginRight: !isSidebarOpen ? "48px" : "0",
        }}
      >
        {/* ═══ Mdel selector floating centered ═══ */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50">
          <ModelSelector
            selectedModelId={selectedModelId}
            onModelSelect={setSelectedModelId}
          />
        </div>

        {/* ═══ Content Area ═══ */}
        {mode === "search" ? (
          <div className="flex-1 flex flex-col overflow-hidden relative">
            
            {/* Export menu at top-left of content */}
            {(searchResponse || aiAnswer) && (
              <div className="absolute top-2 left-2 sm:top-3 sm:left-4 z-50 flex items-center gap-2" ref={menuRef}>
                
                {/* Copied Success Message */}
                <AnimatePresence>
                  {copiedState && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, x: -10 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.8, x: -10 }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 backdrop-blur-sm shadow-lg"
                    >
                      <CheckCircle2 className="w-4 h-4 animate-[bounce_1s_ease-in-out_infinite]" />
                      <span className="text-sm font-semibold">تم النسخ</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Copy Button */}
                <div className="relative">
                  <button
                    onClick={() => { setShowCopyMenu(!showCopyMenu); setShowExportMenu(false); }}
                    className="p-2 rounded-xl bg-slate-800/80 backdrop-blur border border-white/10 hover:bg-slate-700/80 transition-colors shadow-lg flex items-center gap-2 text-gray-300"
                    title="نسخ النتائج"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <AnimatePresence>
                    {showCopyMenu && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 mt-2 w-40 rounded-xl bg-slate-800 border border-white/10 shadow-xl overflow-hidden"
                      >
                        <div className="flex flex-col p-1 text-sm">
                          <button
                            onClick={() => handleCopy("md")}
                            className="flex items-center gap-2.5 px-3 py-2 text-gray-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors text-right"
                          >
                            <FileText className="w-4 h-4 text-blue-400" />
                            <span className="flex-1">نسخ كـ Markdown</span>
                          </button>
                          <button
                            onClick={() => handleCopy("txt")}
                            className="flex items-center gap-2.5 px-3 py-2 text-gray-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors text-right"
                          >
                            <FileCode2 className="w-4 h-4 text-emerald-400" />
                            <span className="flex-1">نسخ كنص (TXT)</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Export Button */}
                <div className="relative">
                  <button
                    onClick={() => { setShowExportMenu(!showExportMenu); setShowCopyMenu(false); }}
                    className="p-2 rounded-xl bg-slate-800/80 backdrop-blur border border-white/10 hover:bg-slate-700/80 transition-colors shadow-lg flex items-center gap-2 text-gray-300"
                    title="تنزيل النتائج"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <AnimatePresence>
                    {showExportMenu && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 mt-2 w-40 rounded-xl bg-slate-800 border border-white/10 shadow-xl overflow-hidden"
                      >
                        <div className="flex flex-col p-1 text-sm">
                          <button
                            onClick={() => handleExport("md")}
                            className="flex items-center gap-2.5 px-3 py-2 text-gray-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors text-right"
                          >
                            <FileText className="w-4 h-4 text-blue-400" />
                            <span className="flex-1">تنزيل بصيغة MD</span>
                          </button>
                          <button
                            onClick={() => handleExport("txt")}
                            className="flex items-center gap-2.5 px-3 py-2 text-gray-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors text-right"
                          >
                            <FileCode2 className="w-4 h-4 text-emerald-400" />
                            <span className="flex-1">تنزيل بصيغة TXT</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>
            )}

            {/* ── Scrollable results area (fills middle) ── */}
            <div ref={resultsRef} className="flex-1 overflow-y-auto px-3 sm:px-4 scroll-smooth">
              {/* Spacer to push initial content below the floating Top Bar */}
              <div className="h-20 sm:h-24 shrink-0" />
              <div className="max-w-4xl mx-auto py-6 relative" style={{ zoom: fontSize }}>
                {/* Content Starts Here */}

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

              {/* ── Zoom Controls Floating ── */}
              {hasResults && (
                <div className="sticky bottom-0 left-0 w-full flex justify-end px-3 sm:px-4 py-2 pointer-events-none pb-4">
                  <div className="pointer-events-auto flex items-center bg-slate-900/50 backdrop-blur border border-white/10 rounded-full shadow-lg">
                    <button
                      type="button"
                      onClick={zoomIn}
                      disabled={fontSize >= 1.5}
                      className="p-1.5 rounded-r-full hover:bg-white/10 transition-colors disabled:opacity-50"
                      title="تكبير النص"
                    >
                      <Plus className="w-4 h-4 text-gray-300" />
                    </button>
                    <div className="w-px h-4 bg-white/10 mx-1"></div>
                    <button
                      type="button"
                      onClick={zoomOut}
                      disabled={fontSize <= 0.7}
                      className="p-1.5 rounded-l-full hover:bg-white/10 transition-colors disabled:opacity-50"
                      title="تصغير النص"
                    >
                      <Minus className="w-4 h-4 text-gray-300" />
                    </button>
                  </div>
                </div>
              )}
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
                  onStopSearch={handleStopSearch}
                  isLoading={isLoading}
                  isAnalyzingImage={isAnalyzingImage}
                />

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
