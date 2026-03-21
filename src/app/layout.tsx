import type { Metadata } from 'next';
import { Cairo } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import Header from '@/components/Header';

const cairo = Cairo({ subsets: ['arabic', 'latin'] });

export const metadata: Metadata = {
  title: 'Tavily Search — محرك البحث الذكي',
  description: 'منصة بحث ذكية باستخدام Tavily API والذكاء الاصطناعي',
};

/*----------
 * المكون الجذري (RootLayout): يغلف صفحات التطبيق بالكامل.
 * يقوم بتهيئة اتجاه الصفحة (RTL) للغة العربية، وربط مزودات السياق (Providers)
 * للمصادقة والمظهر والخطوط.
 *
 * @param {children} - العناصر الفرعية أو مكونات الصفحة (Pages).
 * @returns {JSX.Element} كود الـ HTML الأساسي لتغليف التطبيق.
----------*/
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.className} bg-slate-950 min-h-screen antialiased text-white selection:bg-blue-500/30 flex flex-col`}>
        <AuthProvider>
          <ThemeProvider>
            <Header />
            <main className="flex-1">
              {children}
            </main>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
