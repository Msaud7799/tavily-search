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
}

/*----------
 * تقوم هذه الدالة بمسح كل عمليات البحث المخزنة من المتصفح (LocalStorage).
----------*/
export function clearSearchHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/*----------
 * تحذف هذه الدالة عنصر بحث واحد من السجل المحلي بناءً على نص الاستعلام.
 * @param query - نص البحث المراد حذفه.
----------*/
export function deleteFromSearchHistory(query: string): void {
  if (typeof window === 'undefined') return;
  const history = getSearchHistory();
  const filtered = history.filter((item) => item.query.toLowerCase() !== query.toLowerCase());
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}
