'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

/*----------
 * واجهة صفحة إنشاء الحساب الجديد (Signup Page).
 * تُمكّن المستخدم من التسجيل بإدخال معلوماته أو استخدام حساب جوجل الخاص به.
 *
 * @returns {JSX.Element} صفحة التسجيل وفيها مدخلات الاسم، البريد المدعوم، وكلمة المرور.
----------*/
export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { checkAuth } = useAuth();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        await checkAuth(); 
        router.push('/');
      } else {
        setError(data.message || 'حدث خطأ أثناء إنشاء الحساب');
      }
    } catch (err) {
      setError('تعذر الاتصال بالخادم. حاول مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    window.location.href = '/api/auth/google';
  };

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
        <h1 className="text-2xl font-bold mb-6 text-center text-white">إنشاء حساب جديد</h1>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 rounded-lg p-3 text-sm mb-6 text-center">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignup}
          className="w-full bg-white hover:bg-gray-100 text-gray-900 font-medium rounded-xl px-4 py-3 flex items-center justify-center gap-3 transition-colors shadow-sm mb-6"
        >
          <Image src="/google-login.svg" alt="Google Logo" width={24} height={24} />
          التسجيل باستخدام جوجل
        </button>

        <div className="relative flex items-center py-5">
          <div className="flex-grow border-t border-slate-700"></div>
          <span className="flex-shrink-0 mx-4 text-slate-500 text-sm">أو باستخدام البريد</span>
          <div className="flex-grow border-t border-slate-700"></div>
        </div>

        <form onSubmit={handleSignup} className="flex flex-col gap-5 mt-2">
          <div>
            <label className="block text-sm text-slate-400 mb-2">الاسم</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="اسمك الكامل"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="name@example.com"
              dir="ltr"
            />
          </div>
          
          <div>
            <label className="block text-sm text-slate-400 mb-2">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              dir="ltr"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white rounded-xl px-4 py-3 mt-4 flex justify-center transition-colors"
          >
            {isLoading ? <Loader2 className="animate-spin" size={24} /> : 'تسجيل حساب'}
          </button>
        </form>

        <p className="mt-6 text-center text-slate-400 text-sm">
          لديك حساب بالفعل؟{' '}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 transition-colors">
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}
