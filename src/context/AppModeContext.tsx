'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { AppMode, ChatItem, SearchRecord, ChatMessage } from '@/types';

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
}

const AppModeContext = createContext<AppModeContextType>({
  mode: 'search',
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
});

export const useAppMode = () => useContext(AppModeContext);

export const AppModeProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setMode] = useState<AppMode>('search');
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatItem[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchRecord[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const addChatMessage = useCallback((message: ChatMessage) => {
    setChatMessages((prev) => [...prev, message]);
  }, []);

  const fetchChatHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    try {
      const res = await fetch('/api/chats');
      if (res.ok) {
        const data = await res.json();
        setChatHistory(data.chats || []);
      }
    } catch (e) {
      console.error('Error fetching chat history', e);
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  const fetchSearchHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    try {
      const res = await fetch('/api/searches');
      if (res.ok) {
        const data = await res.json();
        setSearchHistory(data.searches || []);
      }
    } catch (e) {
      console.error('Error fetching search history', e);
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
      }}
    >
      {children}
    </AppModeContext.Provider>
  );
};
