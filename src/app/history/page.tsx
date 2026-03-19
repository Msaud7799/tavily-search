'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Clock, Search, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface HistoryItem {
  _id: string;
  query: string;
  createdAt: string;
}

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
          <div className="space-y-4">
            {history.map((item) => (
              <div key={item._id} className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition">
                <div className="flex items-center gap-3">
                  <Search className="w-5 h-5 text-blue-500" />
                  <span className="text-slate-200 font-medium">{item.query}</span>
                </div>
                <div className="text-sm text-slate-500">
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
