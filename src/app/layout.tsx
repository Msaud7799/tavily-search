import type { Metadata } from 'next';
import { Cairo } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AppModeProvider } from '@/context/AppModeContext';

const cairo = Cairo({ subsets: ['arabic', 'latin'] });

export const metadata: Metadata = {
  title: 'AI Hub — البحث الذكي والمحادثة',
  description: 'منصة ذكاء اصطناعي متكاملة للبحث والمحادثة باستخدام Tavily API',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.className} bg-slate-950 min-h-screen antialiased text-white selection:bg-blue-500/30`}>
        <AuthProvider>
          <ThemeProvider>
            <AppModeProvider>
              {children}
            </AppModeProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
