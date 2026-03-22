"use client";

import SettingsPanel from "@/components/SettingsPanel";
import { useAppMode } from "@/context/AppModeContext";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileText,
  Globe,
  LogOut,
  Map as MapIcon,
  Menu,
  MessageSquare,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ChatItem } from "@/types";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onNewChat: () => void;
}

export default function Sidebar({ isOpen, onToggle, onNewChat }: SidebarProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const {
    mode,
    setMode,
    chatHistory,
    searchHistory,
    fetchChatHistory,
    fetchSearchHistory,
    isHistoryLoading,
    currentChatId,
    setCurrentChatId,
    setChatMessages,
  } = useAppMode();

  const isLight = theme === "light";
  const [activeTab, setActiveTab] = useState<"chats" | "search">("chats");
  const [showSettings, setShowSettings] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (user) {
      fetchChatHistory();
      fetchSearchHistory();
    }
  }, [user, fetchChatHistory, fetchSearchHistory]);

  const handleLoadChat = async (chat: ChatItem) => {
    setMode("chat");
    setCurrentChatId(chat._id);
    setChatMessages(chat.messages || []);
    if (window.innerWidth < 768) onToggle();
  };

  const handleClearDbHistory = async () => {
    if (!user) return;
    if (confirm("هل أنت متأكد من مسح سجل البحث من قاعدة البيانات؟")) {
      await fetch("/api/history", { method: "DELETE" }).catch(() => {});
      await fetchSearchHistory();
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "search": return <Search className="w-3.5 h-3.5" />;
      case "extract": return <FileText className="w-3.5 h-3.5" />;
      case "crawl": return <Globe className="w-3.5 h-3.5" />;
      case "map": return <MapIcon className="w-3.5 h-3.5" />;
      case "research": return <BookOpen className="w-3.5 h-3.5" />;
      default: return <Search className="w-3.5 h-3.5" />;
    }
  };

  return (
    <>
      {/* ═══ Settings Panel (Modal) ═══ */}
      <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile toggle button */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed top-4 right-4 z-50 md:hidden p-2.5 rounded-xl shadow-lg border transition-all"
          style={{
            background: isLight ? "rgba(255,255,255,0.9)" : "rgba(15,20,35,0.9)",
            borderColor: isLight ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.1)",
            color: isLight ? "#334155" : "#d1d5db",
          }}
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* ═══════════════════════════════════════════════════════
       *  Collapsed bar (Desktop only) — شريط مطوي
       *  يظهر كشريط رفيع مع ">" للفتح + tooltip
       * ═══════════════════════════════════════════════════════ */}
      {!isOpen && (
        <div
          className="hidden md:flex fixed top-0 right-0 h-screen w-[48px] flex-col items-center z-40"
          style={{
            background: isLight
              ? "linear-gradient(180deg, #f1f5f9 0%, #e8ecf4 100%)"
              : "linear-gradient(180deg, #0d1117 0%, #0a0e18 100%)",
            borderLeft: isLight
              ? "1px solid rgba(99,102,241,0.12)"
              : "1px solid rgba(255,255,255,0.06)",
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Expand button with tooltip */}
          <div className="relative mt-4">
            <button
              onClick={onToggle}
              className="p-2.5 rounded-xl transition-all duration-200"
              style={{
                background: isHovered
                  ? isLight ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.08)"
                  : "transparent",
                color: isLight ? "#64748b" : "#6b7280",
              }}
            >
              <PanelLeftClose className="w-5 h-5" style={{ transform: "scaleX(-1)" }} />
            </button>

            {/* Tooltip */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, x: 8, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-1/2 -translate-y-1/2 left-[-130px] whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium pointer-events-none"
                  style={{
                    background: isLight ? "#1e293b" : "#f1f5f9",
                    color: isLight ? "#f1f5f9" : "#1e293b",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                  }}
                >
                  توسيع القائمة الجانبية
                  {/* Arrow */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 rotate-45"
                    style={{ background: isLight ? "#1e293b" : "#f1f5f9" }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mini icons when collapsed */}
          <div className="flex-1 flex flex-col items-center gap-3 mt-6">
            <button
              onClick={() => { onToggle(); onNewChat(); }}
              className="p-2 rounded-xl transition-all hover:scale-110"
              style={{
                background: isLight
                  ? "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)"
                  : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                color: "white",
                boxShadow: "0 2px 8px rgba(59,130,246,0.25)",
              }}
              title="محادثة جديدة"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom mini icons */}
          <div className="mb-4 flex flex-col items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl transition-colors"
              style={{ color: isLight ? "#64748b" : "#6b7280" }}
              title={isLight ? "الوضع الداكن" : "الوضع الفاتح"}
            >
              {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <button
              onClick={() => { onToggle(); setTimeout(() => setShowSettings(true), 300); }}
              className="p-2 rounded-xl transition-colors"
              style={{ color: isLight ? "#64748b" : "#6b7280" }}
              title="الإعدادات"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
       *  Expanded Sidebar — السايد بار المفتوح
       * ═══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed md:relative top-0 right-0 h-screen z-50 md:z-auto flex flex-col overflow-hidden shrink-0"
            style={{
              background: isLight
                ? "linear-gradient(180deg, #f1f5f9 0%, #e8ecf4 100%)"
                : "linear-gradient(180deg, #0d1117 0%, #0a0e18 100%)",
              borderLeft: isLight
                ? "1px solid rgba(99,102,241,0.12)"
                : "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex flex-col h-full w-[280px]" dir="rtl">
              {/* Header */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      boxShadow: "0 2px 8px rgba(16,185,129,0.3)",
                    }}
                  >
                    <span className="text-white text-sm font-bold">AI</span>
                  </div>
                  <div>
                    <h1
                      className="text-sm font-bold"
                      style={{ color: isLight ? "#1e293b" : "#f1f5f9" }}
                    >
                      البحث العميق
                    </h1>
                  </div>
                </div>
                <button
                  onClick={onToggle}
                  className="p-1.5 rounded-lg transition-all duration-200 hover:scale-105"
                  style={{ color: isLight ? "#64748b" : "#6b7280" }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = isLight
                      ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.06)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                  title="طي القائمة الجانبية"
                >
                  <PanelLeftOpen className="w-4 h-4" style={{ transform: "scaleX(-1)" }} />
                </button>
              </div>

              {/* Tabs */}
              <div className="px-3 mb-2">
                <div
                  className="flex items-center gap-1 p-1 rounded-xl"
                  style={{
                    background: isLight ? "rgba(99,102,241,0.06)" : "rgba(255,255,255,0.04)",
                  }}
                >
                  <button
                    onClick={() => setActiveTab("chats")}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
                    style={{
                      background:
                        activeTab === "chats"
                          ? isLight ? "white" : "rgba(255,255,255,0.08)"
                          : "transparent",
                      color:
                        activeTab === "chats"
                          ? isLight ? "#4f46e5" : "#60a5fa"
                          : isLight ? "#94a3b8" : "#6b7280",
                      boxShadow:
                        activeTab === "chats"
                          ? isLight ? "0 1px 3px rgba(0,0,0,0.08)" : "0 1px 3px rgba(0,0,0,0.3)"
                          : "none",
                    }}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    المحادثات
                  </button>
                  <button
                    onClick={() => setActiveTab("search")}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
                    style={{
                      background:
                        activeTab === "search"
                          ? isLight ? "white" : "rgba(255,255,255,0.08)"
                          : "transparent",
                      color:
                        activeTab === "search"
                          ? isLight ? "#4f46e5" : "#60a5fa"
                          : isLight ? "#94a3b8" : "#6b7280",
                      boxShadow:
                        activeTab === "search"
                          ? isLight ? "0 1px 3px rgba(0,0,0,0.08)" : "0 1px 3px rgba(0,0,0,0.3)"
                          : "none",
                    }}
                  >
                    <Search className="w-3.5 h-3.5" />
                    البحث
                  </button>
                </div>
              </div>

              {/* New Chat Button */}
              <div className="px-3 mb-3">
                <button
                  onClick={() => { onNewChat(); setMode("chat"); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200"
                  style={{
                    background: isLight
                      ? "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)"
                      : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                    color: "white",
                    boxShadow: isLight
                      ? "0 2px 8px rgba(79,70,229,0.3)"
                      : "0 2px 8px rgba(59,130,246,0.25)",
                  }}
                >
                  <Plus className="w-4 h-4" />
                  محادثة جديدة
                </button>
              </div>

              {/* History List */}
              <div className="flex-1 overflow-y-auto px-3 space-y-1">
                {activeTab === "chats" && (
                  <>
                    {!user ? (
                      <EmptyState icon={<MessageSquare className="w-10 h-10" />} text="سجّل الدخول لعرض محادثاتك" isLight={isLight} />
                    ) : isHistoryLoading ? (
                      <LoadingSpinner />
                    ) : chatHistory.length === 0 ? (
                      <EmptyState icon={<MessageSquare className="w-10 h-10" />} text="لا توجد محادثات بعد" isLight={isLight} />
                    ) : (
                      <>
                        <p className="text-[11px] font-medium px-2 pt-1 pb-2" style={{ color: isLight ? "#94a3b8" : "#4b5563" }}>
                          اليوم
                        </p>
                        {chatHistory.map((chat) => (
                          <button
                            key={chat._id}
                            onClick={() => handleLoadChat(chat)}
                            className="w-full text-right px-3 py-2.5 rounded-xl text-xs transition-all duration-150 flex items-center gap-2.5 group"
                            style={{
                              background: currentChatId === chat._id
                                ? isLight ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.06)"
                                : "transparent",
                              color: currentChatId === chat._id
                                ? isLight ? "#4f46e5" : "#e2e8f0"
                                : isLight ? "#475569" : "#9ca3af",
                            }}
                          >
                            <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-50" />
                            <span className="truncate flex-1">{chat.title}</span>
                          </button>
                        ))}
                      </>
                    )}
                  </>
                )}

                {activeTab === "search" && (
                  <>
                    {!user ? (
                      <EmptyState icon={<Search className="w-10 h-10" />} text="سجّل الدخول لعرض سجل البحث" isLight={isLight} />
                    ) : isHistoryLoading ? (
                      <LoadingSpinner />
                    ) : searchHistory.length === 0 ? (
                      <EmptyState icon={<Search className="w-10 h-10" />} text="لا يوجد سجل بحث بعد" isLight={isLight} />
                    ) : (
                      <>
                        {searchHistory.map((item) => (
                          <div
                            key={item._id}
                            className="px-3 py-2.5 rounded-xl text-xs transition-all duration-150 flex items-center gap-2.5 group cursor-default"
                            style={{ color: isLight ? "#475569" : "#9ca3af" }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.background = isLight
                                ? "rgba(99,102,241,0.06)" : "rgba(255,255,255,0.04)";
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.background = "transparent";
                            }}
                          >
                            {getActionIcon(item.action)}
                            <span className="truncate flex-1">{item.query}</span>
                          </div>
                        ))}
                        <div className="pt-2">
                          <button
                            onClick={handleClearDbHistory}
                            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-medium transition-colors"
                            style={{
                              color: isLight ? "#ef4444" : "#f87171",
                              background: isLight ? "rgba(239,68,68,0.06)" : "rgba(239,68,68,0.08)",
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                            مسح السجل
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <div
                className="p-3 space-y-1.5"
                style={{
                  borderTop: isLight
                    ? "1px solid rgba(99,102,241,0.08)"
                    : "1px solid rgba(255,255,255,0.05)",
                }}
              >
                {user && (
                  <div
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                    style={{
                      background: isLight ? "rgba(99,102,241,0.04)" : "rgba(255,255,255,0.03)",
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
                    >
                      {user.name?.[0] || user.email?.[0] || "م"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate"
                        style={{ color: isLight ? "#1e293b" : "#e2e8f0" }}>
                        {user.name || user.email}
                      </p>
                    </div>
                  </div>
                )}

                {/* Theme toggle */}
                <SidebarBtn
                  onClick={toggleTheme}
                  icon={isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  label={isLight ? "الوضع الداكن" : "الوضع الفاتح"}
                  isLight={isLight}
                />

                {/* Settings — opens SettingsPanel */}
                <SidebarBtn
                  onClick={() => setShowSettings(true)}
                  icon={<Settings className="w-4 h-4" />}
                  label="الإعدادات"
                  isLight={isLight}
                />

                {/* Logout */}
                {user && (
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-colors"
                    style={{ color: isLight ? "#ef4444" : "#f87171" }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = isLight
                        ? "rgba(239,68,68,0.06)" : "rgba(239,68,68,0.08)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>تسجيل خروج</span>
                  </button>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Helper Components ── */
function EmptyState({ icon, text, isLight }: { icon: React.ReactNode; text: string; isLight: boolean }) {
  return (
    <div className="text-center py-12 px-4">
      <div className="mx-auto mb-3 opacity-30" style={{ color: isLight ? "#6366f1" : "#60a5fa" }}>
        {icon}
      </div>
      <p className="text-xs" style={{ color: isLight ? "#94a3b8" : "#6b7280" }}>{text}</p>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="text-center py-12">
      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
    </div>
  );
}

function SidebarBtn({ onClick, icon, label, isLight }: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  isLight: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-colors"
      style={{ color: isLight ? "#64748b" : "#6b7280" }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = isLight
          ? "rgba(99,102,241,0.06)" : "rgba(255,255,255,0.04)";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
