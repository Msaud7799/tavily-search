import { ActionType } from '@/types';

export interface SavedResult {
  id: string;
  query: string;
  action: ActionType;
  date: string;
  data: any;
  aiAnswer?: string;
}

const STORAGE_KEY = 'tavily_full_results';
const MAX_RESULTS = 15; // To prevent QuotaExceededError

/*----------
 * تقوم هذه الدالة بجلب جميع نتائج البحث المحفوظة من التخزين المحلي (LocalStorage).
 * @returns تعيد مصفوفة من النتائج المحفوظة، أو مصفوفة فارغة إذا لم يكن هناك شيء محفوظ.
----------*/
export function getSavedResults(): SavedResult[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to parse saved results:', e);
    return [];
  }
}

/*----------
 * تستخدم هذه الدالة لحفظ نتيجة جديدة إلى قائمة النتائج المحفوظة بالتخزين المحلي.
 * @param query - نص الاستعلام أو البحث الذي قام به المستخدم.
 * @param action - نوع الإجراء (بحث، استخراج محتوى المطورين، الخ).
 * @param data - البيانات الفعلية الراجعة من العملية.
 * @param aiAnswer - (اختياري) الجواب المولد عبر الذكاء الاصطناعي بناءً على النتيجة.
 * @returns تعيد الكائن الجديد الذي تم إضافته وحفظه.
----------*/
export function saveResult(
  query: string,
  action: ActionType,
  data: any,
  aiAnswer?: string
): SavedResult {
  const results = getSavedResults();
  
  const newResult: SavedResult = {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
    query,
    action,
    date: new Date().toISOString(),
    data,
    aiAnswer
  };

  results.unshift(newResult);

  // Keep trying to save, if QuotaExceededError, pop the oldest and retry
  let saved = false;
  while (!saved && results.length > 0) {
    try {
      if (results.length > MAX_RESULTS) {
        results.length = MAX_RESULTS; // Hard cap
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
      saved = true;
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.code === 22 || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        console.warn('Storage quota exceeded, removing oldest result...');
        results.pop(); // Remove oldest
        if (results.length === 0) {
            console.error('Cannot even save one item, it is too large');
            break;
        }
      } else {
        console.error('Error saving result:', e);
        break;
      }
    }
  }
  
  return newResult;
}

/*----------
 * تقوم هذه الدالة بتحديث جزء من البيانات لنتيجة محددة سبق حفظها، من خلال تقديم مُعرّفها (id).
 * @param id - المُعرّف الفريد للنتيجة المراد تحديثها.
 * @param updates - الكائن الذي يحتوي على التحديثات والمفردات الجديدة.
----------*/
export function updateSavedResult(id: string, updates: Partial<SavedResult>) {
  if (typeof window === 'undefined') return;
  const results = getSavedResults();
  const index = results.findIndex(r => r.id === id);
  if (index !== -1) {
    results[index] = { ...results[index], ...updates };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
    } catch (e) {
      console.error('Failed to update saved result:', e);
    }
  }
}

/*----------
 * تقوم هذه الدالة بحذف نتيجة محفوظة باستخدام مُعرّف النتيجة (id).
 * @param id - المُعرّف الفريد للنتيجة المراد حذفها.
----------*/
export function deleteSavedResult(id: string) {
  if (typeof window === 'undefined') return;
  const results = getSavedResults().filter(r => r.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
  } catch (e) {
    console.error('Failed to delete saved result:', e);
  }
}

/*----------
 * تقوم هذه الدالة بمسح كافة النتائج المحفوظة نهائياً من التخزين المحلي (LocalStorage).
----------*/
export function clearSavedResults() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}
