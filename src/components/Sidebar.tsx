"use client";

import SettingsPanel from "@/components/SettingsPanel";
import { useAppMode } from "@/context/AppModeContext";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  CheckSquare,
  FileText,
  Globe,
  LogIn,
  LogOut,
  Map as MapIcon,
  Menu,
  MessageSquare,
  Moon,
  Plus,
  Search,
  Settings,
  Square,
  Sun,
  Trash2,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChatItem } from "@/types";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onNewChat: () => void;
}

/* ─── Toast Component ─── */
interface ToastProps {
  message: string;
  type: "success" | "error" | "confirm";
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose: () => void;
  isLight: boolean;
}

function Toast({ message, type, onConfirm, onCancel, onClose, isLight }: ToastProps) {
  useEffect(() => {
    if (type !== "confirm") {
      const t = setTimeout(onClose, 3000);
      return () => clearTimeout(t);
    }
  }, [type, onClose]);

  const bgColor = isLight
    ? type === "error" ? "#fef2f2" : type === "confirm" ? "#fff7ed" : "#f0fdf4"
    : type === "error" ? "rgba(239,68,68,0.15)" : type === "confirm" ? "rgba(234,179,8,0.15)" : "rgba(16,185,129,0.15)";
  const borderColor = isLight
    ? type === "error" ? "#fecaca" : type === "confirm" ? "#fed7aa" : "#bbf7d0"
    : type === "error" ? "rgba(239,68,68,0.35)" : type === "confirm" ? "rgba(234,179,8,0.35)" : "rgba(16,185,129,0.35)";
  const textColor = isLight
    ? type === "error" ? "#dc2626" : type === "confirm" ? "#92400e" : "#166534"
    : type === "error" ? "#f87171" : type === "confirm" ? "#fbbf24" : "#34d399";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-2rem)] max-w-sm rounded-2xl shadow-2xl border px-4 py-3"
      style={{ background: bgColor, borderColor, color: textColor }}
    >
      <p className="text-sm font-medium text-center mb-0">{message}</p>
      {type === "confirm" && (
        <div className="flex gap-2 mt-3 justify-center">
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
            style={{ background: "#ef4444", color: "white" }}
          >
            نعم، احذف
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
            style={{
              background: isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.1)",
              color: isLight ? "#334155" : "#d1d5db",
            }}
          >
            إلغاء
          </button>
        </div>
      )}
    </motion.div>
  );
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
    setChatHistory,
    setSearchHistory,
  } = useAppMode();

  const isLight = theme === "light";
  const [activeTab, setActiveTab] = useState<"chats" | "search">("chats");
  const [showSettings, setShowSettings] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Multi-select state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Toast state
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "confirm";
    onConfirm?: () => void;
  } | null>(null);

  useEffect(() => {
    if (user) {
      fetchChatHistory();
      fetchSearchHistory();
    }
  }, [user, fetchChatHistory, fetchSearchHistory]);

  // Clear selection when switching tabs
  useEffect(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, [activeTab]);

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "confirm", onConfirm?: () => void) => {
      setToast({ message, type, onConfirm });
    },
    []
  );

  const closeToast = useCallback(() => setToast(null), []);

  const handleLoadChat = async (chat: ChatItem) => {
    if (selectionMode) return;
    setMode("chat");
    setCurrentChatId(chat._id);
    setChatMessages(chat.messages || []);
    if (window.innerWidth < 768) onToggle();
  };

  /* ─── Delete single chat ─── */
  const handleDeleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    showToast("هل تريد حذف هذه المحادثة؟", "confirm", async () => {
      closeToast();
      try {
        await fetch(`/api/chats/${chatId}`, { method: "DELETE" });
        setChatHistory(chatHistory.filter((c) => c._id !== chatId));
        if (currentChatId === chatId) {
          setCurrentChatId(null);
          setChatMessages([]);
        }
        showToast("تم حذف المحادثة", "success");
      } catch {
        showToast("فشل الحذف", "error");
      }
    });
  };

  /* ─── Delete single search ─── */
  const handleDeleteSearch = (e: React.MouseEvent, searchId: string) => {
    e.stopPropagation();
    showToast("هل تريد حذف هذا البحث؟", "confirm", async () => {
      closeToast();
      try {
        await fetch(`/api/history/${searchId}`, { method: "DELETE" });
        setSearchHistory(searchHistory.filter((s) => s._id !== searchId));
        showToast("تم حذف البحث", "success");
      } catch {
        showToast("فشل الحذف", "error");
      }
    });
  };

  /* ─── Toggle selection ─── */
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ─── Delete multiple ─── */
  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    const label = activeTab === "chats" ? "محادثة" : "بحث";
    showToast(`هل تريد حذف ${count} ${label}؟`, "confirm", async () => {
      closeToast();
      try {
        const ids = Array.from(selectedIds);
        if (activeTab === "chats") {
          await Promise.all(ids.map((id) => fetch(`/api/chats/${id}`, { method: "DELETE" })));
          setChatHistory(chatHistory.filter((c) => !selectedIds.has(c._id)));
          if (currentChatId && selectedIds.has(currentChatId)) {
            setCurrentChatId(null);
            setChatMessages([]);
          }
        } else {
          await Promise.all(ids.map((id) => fetch(`/api/history/${id}`, { method: "DELETE" })));
          setSearchHistory(searchHistory.filter((s) => !selectedIds.has(s._id)));
        }
        setSelectedIds(new Set());
        setSelectionMode(false);
        showToast(`تم حذف ${count} ${label} بنجاح`, "success");
      } catch {
        showToast("فشل الحذف", "error");
      }
    });
  };

  /* ─── Clear all DB search history ─── */
  const handleClearDbHistory = async () => {
    showToast("هل أنت متأكد من مسح كل سجل البحث؟", "confirm", async () => {
      closeToast();
      try {
        await fetch("/api/history", { method: "DELETE" });
        await fetchSearchHistory();
        showToast("تم مسح سجل البحث", "success");
      } catch {
        showToast("فشل المسح", "error");
      }
    });
  };

  /* ─── Clear all chat history ─── */
  const handleClearAllChats = async () => {
    showToast("هل أنت متأكد من مسح كل المحادثات؟", "confirm", async () => {
      closeToast();
      try {
        await fetch("/api/chats", { method: "DELETE" });
        setChatHistory([]);
        setCurrentChatId(null);
        setChatMessages([]);
        showToast("تم مسح جميع المحادثات", "success");
      } catch {
        showToast("فشل المسح", "error");
      }
    });
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

  const allSelected =
    activeTab === "chats"
      ? chatHistory.length > 0 && chatHistory.every((c) => selectedIds.has(c._id))
      : searchHistory.length > 0 && searchHistory.every((s) => selectedIds.has(s._id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      const ids = activeTab === "chats"
        ? chatHistory.map((c) => c._id)
        : searchHistory.map((s) => s._id);
      setSelectedIds(new Set(ids));
    }
  };

  return (
    <>
      {/* ═══ Settings Panel ═══ */}
      <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* ═══ Toast Notification ═══ */}
      <AnimatePresence>
        {toast && (
          <Toast
            key="toast"
            message={toast.message}
            type={toast.type}
            onConfirm={toast.onConfirm}
            onCancel={closeToast}
            onClose={closeToast}
            isLight={isLight}
          />
        )}
      </AnimatePresence>

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

      {/* Mobile toggle button — يظهر فقط عند إغلاق السايد بار */}
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

      {/* ═══ Collapsed bar (Desktop only) ═══ */}
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
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 rotate-45"
                    style={{ background: isLight ? "#1e293b" : "#f1f5f9" }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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

      {/* ═══ Expanded Sidebar ═══ */}
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
              {/* ── Header ── */}
              <div className="p-4 flex items-center justify-between shrink-0">
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
                    e.currentTarget.style.background = isLight ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.06)";
                  }}
                  onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
                  title="طي القائمة الجانبية"
                >
                  <PanelLeftOpen className="w-4 h-4" style={{ transform: "scaleX(-1)" }} />
                </button>
              </div>

              {/* ── Tabs ── */}
              <div className="px-3 mb-2 shrink-0">
                <div
                  className="flex items-center gap-1 p-1 rounded-xl"
                  style={{ background: isLight ? "rgba(99,102,241,0.06)" : "rgba(255,255,255,0.04)" }}
                >
                  <button
                    onClick={() => setActiveTab("chats")}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
                    style={{
                      background: activeTab === "chats" ? (isLight ? "white" : "rgba(255,255,255,0.08)") : "transparent",
                      color: activeTab === "chats" ? (isLight ? "#4f46e5" : "#60a5fa") : (isLight ? "#94a3b8" : "#6b7280"),
                      boxShadow: activeTab === "chats" ? (isLight ? "0 1px 3px rgba(0,0,0,0.08)" : "0 1px 3px rgba(0,0,0,0.3)") : "none",
                    }}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    المحادثات
                  </button>
                  <button
                    onClick={() => setActiveTab("search")}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
                    style={{
                      background: activeTab === "search" ? (isLight ? "white" : "rgba(255,255,255,0.08)") : "transparent",
                      color: activeTab === "search" ? (isLight ? "#4f46e5" : "#60a5fa") : (isLight ? "#94a3b8" : "#6b7280"),
                      boxShadow: activeTab === "search" ? (isLight ? "0 1px 3px rgba(0,0,0,0.08)" : "0 1px 3px rgba(0,0,0,0.3)") : "none",
                    }}
                  >
                    <Search className="w-3.5 h-3.5" />
                    البحث
                  </button>
                </div>
              </div>

              {/* ── New Chat Button ── */}
              <div className="px-3 mb-2 shrink-0">
                <button
                  onClick={() => { onNewChat(); setMode("chat"); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200"
                  style={{
                    background: isLight
                      ? "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)"
                      : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                    color: "white",
                    boxShadow: isLight ? "0 2px 8px rgba(79,70,229,0.3)" : "0 2px 8px rgba(59,130,246,0.25)",
                  }}
                >
                  <Plus className="w-4 h-4" />
                  محادثة جديدة
                </button>
              </div>

              {/* ── Selection Toolbar ── */}
              <AnimatePresence>
                {selectionMode && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-3 mb-2 shrink-0 overflow-hidden"
                  >
                    <div
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl"
                      style={{
                        background: isLight ? "rgba(239,68,68,0.06)" : "rgba(239,68,68,0.1)",
                        border: "1px solid rgba(239,68,68,0.2)",
                      }}
                    >
                      <button
                        onClick={toggleSelectAll}
                        className="flex items-center gap-1.5 text-[11px] font-medium"
                        style={{ color: isLight ? "#64748b" : "#9ca3af" }}
                      >
                        {allSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                        {allSelected ? "إلغاء الكل" : "تحديد الكل"}
                      </button>
                      <span className="text-[11px]" style={{ color: isLight ? "#ef4444" : "#f87171" }}>
                        {selectedIds.size} محدد
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={handleDeleteSelected}
                          disabled={selectedIds.size === 0}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all disabled:opacity-40"
                          style={{ background: "#ef4444", color: "white" }}
                        >
                          <Trash2 className="w-3 h-3" />
                          حذف
                        </button>
                        <button
                          onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); }}
                          className="p-1 rounded-lg transition-all"
                          style={{ color: isLight ? "#64748b" : "#6b7280" }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── History List ── */}
              <div className="flex-1 overflow-y-auto px-3 space-y-1 min-h-0">
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
                        <div className="flex items-center justify-between px-2 pt-1 pb-1">
                          <p className="text-[11px] font-medium" style={{ color: isLight ? "#94a3b8" : "#4b5563" }}>
                            اليوم
                          </p>
                          <button
                            onClick={() => setSelectionMode((v) => !v)}
                            className="text-[10px] px-2 py-0.5 rounded-md transition-all"
                            style={{
                              color: selectionMode ? (isLight ? "#4f46e5" : "#60a5fa") : (isLight ? "#94a3b8" : "#6b7280"),
                              background: selectionMode ? (isLight ? "rgba(99,102,241,0.1)" : "rgba(96,165,250,0.1)") : "transparent",
                            }}
                          >
                            {selectionMode ? "إلغاء التحديد" : "تحديد"}
                          </button>
                        </div>
                        {chatHistory.map((chat) => (
                          <div
                            key={chat._id}
                            onClick={() => selectionMode ? toggleSelect(chat._id) : handleLoadChat(chat)}
                            className="w-full text-right px-3 py-2.5 rounded-xl text-xs transition-all duration-150 flex items-center gap-2.5 group cursor-pointer relative"
                            style={{
                              background: selectedIds.has(chat._id)
                                ? isLight ? "rgba(99,102,241,0.12)" : "rgba(96,165,250,0.12)"
                                : currentChatId === chat._id
                                  ? isLight ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.06)"
                                  : "transparent",
                              color: currentChatId === chat._id
                                ? isLight ? "#4f46e5" : "#e2e8f0"
                                : isLight ? "#475569" : "#9ca3af",
                            }}
                          >
                            {selectionMode ? (
                              <div
                                className="w-3.5 h-3.5 shrink-0 rounded border-2 flex items-center justify-center transition-all"
                                style={{
                                  borderColor: selectedIds.has(chat._id) ? "#6366f1" : (isLight ? "#d1d5db" : "#4b5563"),
                                  background: selectedIds.has(chat._id) ? "#6366f1" : "transparent",
                                }}
                              >
                                {selectedIds.has(chat._id) && (
                                  <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            ) : (
                              <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-50" />
                            )}
                            <span className="truncate flex-1">{chat.title}</span>
                            {!selectionMode && (
                              <button
                                onClick={(e) => handleDeleteChat(e, chat._id)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded-md transition-all shrink-0"
                                style={{ color: isLight ? "#ef4444" : "#f87171" }}
                                title="حذف"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                        {/* Clear all chats button */}
                        {chatHistory.length > 0 && !selectionMode && (
                          <div className="pt-2">
                            <button
                              onClick={handleClearAllChats}
                              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-medium transition-colors"
                              style={{
                                color: isLight ? "#ef4444" : "#f87171",
                                background: isLight ? "rgba(239,68,68,0.06)" : "rgba(239,68,68,0.08)",
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                              مسح الكل
                            </button>
                          </div>
                        )}
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
                        <div className="flex items-center justify-between px-2 pt-1 pb-1">
                          <p className="text-[11px] font-medium" style={{ color: isLight ? "#94a3b8" : "#4b5563" }}>
                            السجل
                          </p>
                          <button
                            onClick={() => setSelectionMode((v) => !v)}
                            className="text-[10px] px-2 py-0.5 rounded-md transition-all"
                            style={{
                              color: selectionMode ? (isLight ? "#4f46e5" : "#60a5fa") : (isLight ? "#94a3b8" : "#6b7280"),
                              background: selectionMode ? (isLight ? "rgba(99,102,241,0.1)" : "rgba(96,165,250,0.1)") : "transparent",
                            }}
                          >
                            {selectionMode ? "إلغاء التحديد" : "تحديد"}
                          </button>
                        </div>
                        {searchHistory.map((item) => (
                          <div
                            key={item._id}
                            onClick={() => selectionMode && toggleSelect(item._id)}
                            className="px-3 py-2.5 rounded-xl text-xs transition-all duration-150 flex items-center gap-2.5 group relative"
                            style={{
                              color: isLight ? "#475569" : "#9ca3af",
                              cursor: selectionMode ? "pointer" : "default",
                              background: selectedIds.has(item._id)
                                ? isLight ? "rgba(99,102,241,0.12)" : "rgba(96,165,250,0.12)"
                                : "transparent",
                            }}
                            onMouseOver={(e) => {
                              if (!selectedIds.has(item._id))
                                e.currentTarget.style.background = isLight ? "rgba(99,102,241,0.06)" : "rgba(255,255,255,0.04)";
                            }}
                            onMouseOut={(e) => {
                              if (!selectedIds.has(item._id))
                                e.currentTarget.style.background = "transparent";
                            }}
                          >
                            {selectionMode ? (
                              <div
                                className="w-3.5 h-3.5 shrink-0 rounded border-2 flex items-center justify-center transition-all"
                                style={{
                                  borderColor: selectedIds.has(item._id) ? "#6366f1" : (isLight ? "#d1d5db" : "#4b5563"),
                                  background: selectedIds.has(item._id) ? "#6366f1" : "transparent",
                                }}
                              >
                                {selectedIds.has(item._id) && (
                                  <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            ) : (
                              getActionIcon(item.action)
                            )}
                            <span className="truncate flex-1">{item.query}</span>
                            {!selectionMode && (
                              <button
                                onClick={(e) => handleDeleteSearch(e, item._id)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded-md transition-all shrink-0"
                                style={{ color: isLight ? "#ef4444" : "#f87171" }}
                                title="حذف"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                        {!selectionMode && (
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
                        )}
                      </>
                    )}
                  </>
                )}
              </div>

              {/* ── Footer ── */}
              <div
                className="p-3 space-y-1.5 shrink-0"
                style={{
                  borderTop: isLight ? "1px solid rgba(99,102,241,0.08)" : "1px solid rgba(255,255,255,0.05)",
                }}
              >
                {user ? (
                  <div
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                    style={{ background: isLight ? "rgba(99,102,241,0.04)" : "rgba(255,255,255,0.03)" }}
                  >
                    {/* Avatar: Google photo or first letter */}
                    {user.avatar ? (
                      <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 ring-2 ring-emerald-500/30">
                        <Image
                          src={user.avatar}
                          alt={user.name || "avatar"}
                          width={36}
                          height={36}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
                      >
                        {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "م"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: isLight ? "#1e293b" : "#e2e8f0" }}>
                        {user.name || user.email}
                      </p>
                      {user.email && user.name && (
                        <p className="text-[10px] truncate mt-0.5" style={{ color: isLight ? "#94a3b8" : "#6b7280" }}>
                          {user.email}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  /* ── زر تسجيل الدخول عند عدم وجود مستخدم ── */
                  <Link
                    href="/login"
                    className="w-full flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200"
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
                    <LogIn className="w-4 h-4" />
                    تسجيل الدخول
                  </Link>
                )}

                <SidebarBtn
                  onClick={toggleTheme}
                  icon={isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  label={isLight ? "الوضع الداكن" : "الوضع الفاتح"}
                  isLight={isLight}
                />

                <SidebarBtn
                  onClick={() => setShowSettings(true)}
                  icon={<Settings className="w-4 h-4" />}
                  label="الإعدادات"
                  isLight={isLight}
                />

                {user && (
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-colors"
                    style={{ color: isLight ? "#ef4444" : "#f87171" }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = isLight ? "rgba(239,68,68,0.06)" : "rgba(239,68,68,0.08)";
                    }}
                    onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
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
        e.currentTarget.style.background = isLight ? "rgba(99,102,241,0.06)" : "rgba(255,255,255,0.04)";
      }}
      onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
