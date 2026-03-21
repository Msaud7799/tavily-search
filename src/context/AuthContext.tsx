'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setUser: () => {},
  checkAuth: async () => {},
  logout: async () => {},
});

/*----------
 * خطاف (Hook) مخصص لكي يسهل على أي مكون (Component) في التطبيق 
 * الوصول لبيانات المصادقة الدائمة والتفاعل معها مثل (user, checkAuth, logout).
----------*/
export const useAuth = () => useContext(AuthContext);

/*----------
 * مزود المصادقة (Auth Provider): هو المكون الذي يغلف التطبيق ليوفر حالة المستخدم (تسجيل الدخول/الخروج)
 * لجميع المكونات الفرعية.
----------*/
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /*----------
   * إرسال طلب للواجهة الخلفية (Backend) للتحقق مما إذا كان المستخدم مسجل دخوله فعلاً
   * وذلك من خلال التوكن المحفوظ في ملفات تعريف الارتباط.
  ----------*/
  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  /*----------
   * دالة لتسجيل خروج المستخدم. تقوم بإرسال طلب لإلغاء الجلسة من الواجهة الخلفية
   * ومن ثم تمسح بيانات المستخدم من الحالة (State).
  ----------*/
  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setUser, checkAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
