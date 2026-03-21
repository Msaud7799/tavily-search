'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { LogOut, Clock, Settings, Sun, Moon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import SettingsPanel from './SettingsPanel';
import { motion } from 'framer-motion';

/*----------
 * مكون الترويسة (Header).
 * يُمثل الشريط العلوي للتطبيق، يحتوي على شعار التطبيق، صورة أفتار المستخدم من جوجل،
 * روابط التنقل (السجل، تسجيل الدخول/خروج)، وأزرار تبديل المظهر (ليلي/نهاري).
 * 
 * @returns {JSX.Element} شريط علوي (Navbar) يثبت بالأعلى عند التمرير.
----------*/
export default function Header() {
  const { user, logout, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <>
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto max-w-5xl px-4 py-3.5 flex flex-row items-center justify-between gap-3">
          
          {/* Logo----------*/}
          <Link href="/" className="text-lg font-bold bg-gradient-to-l from-blue-400 to-emerald-400 bg-clip-text text-transparent shrink-0">
            البحث العميق بستخدام الذكاء الأصطناعي
          </Link>

          {/* Actions----------*/}
          <nav className="flex flex-row items-center gap-2">
            {!loading && user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/history"
                  className="text-sm text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/5"
                >
                  <Clock size={15} />
                  <span className="hidden sm:inline">السجل</span>
                </Link>

                {/* أفتار المستخدم + الاسم ----------*/}
                <div className="flex items-center gap-2 px-2 py-1.5">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-7 h-7 rounded-full border-2 border-blue-500/50 object-cover shadow-lg shadow-blue-500/10"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="hidden sm:inline text-sm text-slate-300 max-w-[100px] truncate">
                    {user.name}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-400/5"
                  title="تسجيل خروج"
                >
                  <LogOut size={15} />
                  <span className="hidden sm:inline">خروج</span>
                </button>
              </div>
            ) : !loading && !user ? (
              <div className="flex items-center gap-2">
                <Link href="/login" className="text-sm text-slate-300 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5">
                  تسجيل الدخول
                </Link>
                <Link href="/signup" className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-full transition-colors shadow-lg shadow-blue-500/20">
                  حساب جديد
                </Link>
              </div>
            ) : null}

            {/* Theme Toggle----------*/}
            <motion.button
              onClick={toggleTheme}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 border border-white/5 hover:border-white/15 transition-all"
              title={theme === 'dark' ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
            >
              {theme === 'dark'
                ? <Sun size={16} className="text-amber-400" />
                : <Moon size={16} className="text-blue-400" />
              }
            </motion.button>

            {/* Settings Button----------*/}
            <motion.button
              onClick={() => setSettingsOpen(true)}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 border border-white/5 hover:border-blue-500/30 transition-all"
              title="الإعدادات"
            >
              <Settings size={16} className="hover:rotate-45 transition-transform duration-300" />
            </motion.button>
          </nav>
        </div>
      </header>

      {/* Settings Panel----------*/}
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
