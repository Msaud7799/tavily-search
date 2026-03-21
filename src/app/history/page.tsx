'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Clock, Search, Loader2, FileText, Globe, Map as MapIcon, BookOpen, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface HistoryItem {
  _id: string;
  query: string;
  action: 'search' | 'extract' | 'crawl' | 'map' | 'research';
  data: any;
  aiAnswer?: string;
  createdAt: string;
}

/*----------
 * دالة لإرجاع أيقونة الإجراء المناسبة.
----------*/
const getActionIcon = (action: string) => {
  switch (action) {
    case 'search': return <Search className="w-4 h-4" />;
    case 'extract': return <FileText className="w-4 h-4" />;
    case 'crawl': return <Globe className="w-4 h-4" />;
    case 'map': return <MapIcon className="w-4 h-4" />;
    case 'research': return <BookOpen className="w-4 h-4" />;
    default: return <Search className="w-4 h-4" />;
  }
};

/*----------
 * دالة لإرجاع المسمى العربي للإجراء.
----------*/
const getActionLabel = (action: string) => {
  switch (action) {
    case 'search': return 'بحث';
    case 'extract': return 'استخراج';
    case 'crawl': return 'زحف';
    case 'map': return 'خريطة';
    case 'research': return 'بحث معمّق';
    default: return 'بحث';
  }
};

/*----------
 * مكون صفحة السجل (History Page).
 * تعرض قائمة بجميع عمليات البحث القديمة للمستخدم المحفوظة في قاعدة البيانات.
 * النتائج تبقى موجودة حتى بعد تسجيل الخروج ويقدر يرجع لها.
 *
 * @returns {JSX.Element} صفحة تعرض عمليات البحث بالوقت والتاريخ ونوع العملية.
----------*/
export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchHistory();
    }
  }, [user, authLoading, router]);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="animate-spin text-blue-500 w-12 h-12" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <div className="flex items-center gap-3 mb-8">
        <Clock className="text-blue-400 w-8 h-8" />
        <h1 className="text-3xl font-bold">سجل البحث الخاص بك</h1>
        <span className="text-sm text-gray-500 bg-white/5 px-3 py-1 rounded-full">
          {history.length} عملية
        </span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        {history.length === 0 ? (
          <div className="text-center text-slate-400 py-12">
            <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p>لا يوجد أي سجل بحث حتى الآن.</p>
            <Link href="/" className="text-blue-400 mt-4 inline-block hover:underline">
              ابحث الآن
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div key={item._id} className="group flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800 hover:border-blue-500/30 transition-all">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* أيقونة نوع العملية */}
                  <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 shrink-0">
                    {getActionIcon(item.action)}
                    <span className="hidden sm:inline">{getActionLabel(item.action)}</span>
                  </div>
                  <span className="text-slate-200 font-medium truncate">{item.query}</span>
                </div>
                <div className="text-sm text-slate-500 shrink-0 mr-3">
                  {new Date(item.createdAt).toLocaleDateString('ar-EG', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
