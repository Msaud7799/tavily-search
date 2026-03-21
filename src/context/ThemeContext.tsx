'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
});

/*----------
 * خطاف (Hook) مخصص للوصول السهل إلى سياق المظاهر (الوضع الليلي والنهاري) في التطبيق.
----------*/
export const useTheme = () => useContext(ThemeContext);

/*----------
 * مزود المظاهر (Theme Provider): مكون يغلف التطبيق لإدارة وحفظ المظهر المختار (Light/Dark)،
 * سواء في الذاكرة المحلية (LocalStorage) أو على مستوى صفحة الويب.
----------*/
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    const stored = localStorage.getItem('app-theme') as Theme | null;
    const initial = stored || 'dark';
    setThemeState(initial);
    applyTheme(initial);
  }, []);

  /*----------
   * وظيفة داخلية لتطبيق الكلاسات (CSS Classes) المتعلقة بالمظهر على الجذر (html).
  ----------*/
  const applyTheme = (t: Theme) => {
    const root = document.documentElement;
    if (t === 'light') {
      root.classList.add('light-mode');
      root.classList.remove('dark-mode');
    } else {
      root.classList.add('dark-mode');
      root.classList.remove('light-mode');
    }
  };

  /*----------
   * وظيفة عامة لتغيير المظهر، تقوم بتحديث الحالة، حفظه في التخزين المحلي (LocalStorage)، وتطبيقه.
  ----------*/
  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('app-theme', t);
    applyTheme(t);
  };

  /*----------
   * وظيفة تعكس المظهر الحالي بصورة مباشرة، من ليلي إلى نهاري والعكس.
  ----------*/
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
