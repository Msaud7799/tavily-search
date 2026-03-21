'use client';

import { SearchHistoryItem } from '@/types';

const STORAGE_KEY = 'tavily_search_history';
const MAX_HISTORY = 50;

/*----------
 * تقوم هذه الدالة بجلب سجل عمليات البحث (Search History) المحفوظة في التخزين المحلي.
 * @returns تعيد مصفوفة من نصوص البحث المحفوظة وتواريخها.
----------*/
export function getSearchHistory(): SearchHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/*----------
 * تضيف هذه الدالة عملية بحث جديدة إلى سجل البحث الخاص بالمستخدم. 
 * كما تقوم بمزامنة السجل مع قاعدة البيانات الخلفية إن أمكن.
 * @param query - نص البحث الذي يراد إضافته للسجل.
----------*/
export function addToSearchHistory(query: string): void {
  if (typeof window === 'undefined') return;
  const history = getSearchHistory();
  // Remove duplicates
  const filtered = history.filter((item) => item.query.toLowerCase() !== query.toLowerCase());
  // Add to beginning
  filtered.unshift({ query, timestamp: Date.now() });
  // Limit size
  const trimmed = filtered.slice(0, MAX_HISTORY);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));

  // Sync with backend async (will only save if user session is valid via cookies)
  fetch('/api/history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  }).catch(() => {
    // silently fail if not logged in or offline
  });
}

/*----------
 * تقوم هذه الدالة بمسح كل عمليات البحث المخزنة من المتصفح (LocalStorage).
----------*/
export function clearSearchHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
