"use client";

import { AppMode, ChatItem, ChatMessage, SearchRecord } from "@/types";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

interface AppModeContextType {
  // الوضع الحالي
  mode: AppMode;
  setMode: (mode: AppMode) => void;

  // المحادثة الحالية
  currentChatId: string | null;
  setCurrentChatId: (id: string | null) => void;
  chatMessages: ChatMessage[];
  setChatMessages: (messages: ChatMessage[]) => void;
  addChatMessage: (message: ChatMessage) => void;

  // سجلات المحادثات والبحث
  chatHistory: ChatItem[];
  setChatHistory: (chats: ChatItem[]) => void;
  searchHistory: SearchRecord[];
  setSearchHistory: (searches: SearchRecord[]) => void;

  // جلب البيانات
  fetchChatHistory: () => Promise<void>;
  fetchSearchHistory: () => Promise<void>;

  // تحميل
  isHistoryLoading: boolean;

  // حفظ البحث/الشات الأخير
  lastSearchQuery: string;
  setLastSearchQuery: (q: string) => void;
  lastChatDraft: string;
  setLastChatDraft: (d: string) => void;
}

const AppModeContext = createContext<AppModeContextType>({
  mode: "search",
  setMode: () => {},
  currentChatId: null,
  setCurrentChatId: () => {},
  chatMessages: [],
  setChatMessages: () => {},
  addChatMessage: () => {},
  chatHistory: [],
  setChatHistory: () => {},
  searchHistory: [],
  setSearchHistory: () => {},
  fetchChatHistory: async () => {},
  fetchSearchHistory: async () => {},
  isHistoryLoading: false,
  lastSearchQuery: "",
  setLastSearchQuery: () => {},
  lastChatDraft: "",
  setLastChatDraft: () => {},
});

export const useAppMode = () => useContext(AppModeContext);

export const AppModeProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  // استعادة الحالة من sessionStorage عند التحميل
  const [mode, _setMode] = useState<AppMode>("search");
  const [currentChatId, _setCurrentChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const [chatHistory, setChatHistory] = useState<ChatItem[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchRecord[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // حفظ البحث والمسودة
  const [lastSearchQuery, _setLastSearchQuery] = useState("");
  const [lastChatDraft, _setLastChatDraft] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedMode = sessionStorage.getItem("app-mode") as AppMode;
      if (savedMode) _setMode(savedMode);
      
      const savedId = sessionStorage.getItem("current-chat-id");
      if (savedId) _setCurrentChatId(savedId);

      try {
        const savedMsgs = sessionStorage.getItem("chat-messages");
        if (savedMsgs) setChatMessages(JSON.parse(savedMsgs));
      } catch {}

      const savedQuery = sessionStorage.getItem("last-search-query");
      if (savedQuery) _setLastSearchQuery(savedQuery);

      const savedDraft = sessionStorage.getItem("last-chat-draft");
      if (savedDraft) _setLastChatDraft(savedDraft);
    }
  }, []);

  // ── دوال مع حفظ تلقائي ──
  const setMode = useCallback((m: AppMode) => {
    _setMode(m);
    if (typeof window !== "undefined") sessionStorage.setItem("app-mode", m);
  }, []);

  const setCurrentChatId = useCallback((id: string | null) => {
    _setCurrentChatId(id);
    if (typeof window !== "undefined") {
      if (id) sessionStorage.setItem("current-chat-id", id);
      else sessionStorage.removeItem("current-chat-id");
    }
  }, []);

  const setLastSearchQuery = useCallback((q: string) => {
    _setLastSearchQuery(q);
    if (typeof window !== "undefined") sessionStorage.setItem("last-search-query", q);
  }, []);

  const setLastChatDraft = useCallback((d: string) => {
    _setLastChatDraft(d);
    if (typeof window !== "undefined") sessionStorage.setItem("last-chat-draft", d);
  }, []);

  // حفظ رسائل الشات عند التغيير
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("chat-messages", JSON.stringify(chatMessages));
    }
  }, [chatMessages]);

  const addChatMessage = useCallback((message: ChatMessage) => {
    setChatMessages((prev) => [...prev, message]);
  }, []);

  const fetchChatHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    try {
      const res = await fetch("/api/chats");
      if (res.ok) {
        const data = await res.json();
        setChatHistory(data.chats || []);
      }
    } catch (e) {
      console.error("Error fetching chat history", e);
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  const fetchSearchHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    try {
      const res = await fetch("/api/history");
      if (res.ok) {
        const data = await res.json();
        setSearchHistory(data.history || []);
      }
    } catch (e) {
      console.error("Error fetching search history", e);
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  return (
    <AppModeContext.Provider
      value={{
        mode,
        setMode,
        currentChatId,
        setCurrentChatId,
        chatMessages,
        setChatMessages,
        addChatMessage,
        chatHistory,
        setChatHistory,
        searchHistory,
        setSearchHistory,
        fetchChatHistory,
        fetchSearchHistory,
        isHistoryLoading,
        lastSearchQuery,
        setLastSearchQuery,
        lastChatDraft,
        setLastChatDraft,
      }}
    >
      {children}
    </AppModeContext.Provider>
  );
};
