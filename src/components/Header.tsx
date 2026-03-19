'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { LogOut, User as UserIcon, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto max-w-4xl px-4 py-4 flex flex-row items-center justify-between">
        <Link href="/" className="text-xl font-bold bg-gradient-to-l from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          البحث العميق  بستخدام الذكاء الأصطناعي 
        </Link>
        
        <nav className="flex flex-row items-center gap-4">
          {!loading && user ? (
            <div className="flex items-center gap-4">
              <Link href="/history" className="text-sm text-slate-300 hover:text-white transition-colors flex items-center gap-1.5">
                <Clock size={16} />
                <span>السجل</span>
              </Link>
              <span className="text-sm text-slate-300 flex items-center gap-2">
                <UserIcon size={16} />
                <span>أهلاً بك، {user.name}</span>
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
                title="تسجيل خروج"
              >
                <LogOut size={16} />
                <span>خروج</span>
              </button>
            </div>
          ) : !loading && !user ? (
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-sm text-slate-300 hover:text-white transition-colors">
                تسجيل الدخول
              </Link>
              <Link href="/signup" className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-full transition-colors shadow-lg shadow-blue-500/20">
                حساب جديد
              </Link>
            </div>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
