'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Sun, Moon, User, Key, Eye, EyeOff, Copy, Check,
  ExternalLink, Github, Info, Save, ChevronRight, Sparkles,
  Shield, Palette, Code2, BookOpen, Star, GitFork,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const APP_VERSION = '1.0.0';
const DEV_NAME = 'Mohamed Alromaihi';
const GITHUB_URL = 'https://github.com/Msaud7799/tavily-search';

/* ───────── helpers ───────── */
function TokenInput({
  label,
  value,
  onChange,
  placeholder,
  siteUrl,
  siteName,
  siteIcon,
  saved,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  siteUrl: string;
  siteName: string;
  siteIcon: React.ReactNode;
  saved: boolean;
}) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-200">{label}</label>
        {saved && (
          <span className="text-[10px] text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Check className="w-2.5 h-2.5" /> محفوظ
          </span>
        )}
      </div>
      <div className="relative group">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          dir="ltr"
          className="w-full pl-20 pr-4 py-3 rounded-xl border border-white/10 bg-black/30 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/60 focus:bg-black/50 text-sm font-mono transition-all"
        />
        <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShow(!show)}
            title={show ? 'إخفاء' : 'إظهار'}
            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-white/10 transition-all"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={copy}
            title="نسخ"
            disabled={!value}
            className="p-1.5 rounded-lg text-gray-500 hover:text-green-400 hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <a
        href={siteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-blue-400/70 hover:text-blue-400 transition-colors group/link"
      >
        {siteIcon}
        <span>احصل على مفتاح {siteName}</span>
        <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
      </a>
    </div>
  );
}

/* ───────── Section Button ───────── */
type Section = 'theme' | 'profile' | 'tokens' | 'about';
function NavBtn({
  section, active, onClick, icon, label,
}: { section: Section; active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
        active
          ? 'bg-blue-600/20 border border-blue-500/30 text-blue-300'
          : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
      }`}
    >
      {icon}
      <span>{label}</span>
      {active && <ChevronRight className="w-4 h-4 mr-auto" />}
    </button>
  );
}

/* ───────── Main Component ───────── */
export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  const [activeSection, setActiveSection] = useState<Section>('theme');

  // Profile
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [bio, setBio] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);

  // Tokens
  const [tavilyKey, setTavilyKey] = useState('');
  const [hfKey, setHfKey] = useState('');
  const [tavilyKeySaved, setTavilyKeySaved] = useState(false);
  const [hfKeySaved, setHfKeySaved] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);

  // Load from localStorage on client
  useEffect(() => {
    setBio(localStorage.getItem('user-bio') || '');
    const tk = localStorage.getItem('tavily-key') || '';
    const hk = localStorage.getItem('hf-key') || '';
    setTavilyKey(tk);
    setHfKey(hk);
    setTavilyKeySaved(!!tk);
    setHfKeySaved(!!hk);
  }, []);

  // Sync user name
  useEffect(() => {
    if (user?.name) setDisplayName(user.name);
  }, [user]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const saveProfile = () => {
    localStorage.setItem('user-bio', bio);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const saveTokens = () => {
    if (tavilyKey) {
      localStorage.setItem('tavily-key', tavilyKey);
      setTavilyKeySaved(true);
    }
    if (hfKey) {
      localStorage.setItem('hf-key', hfKey);
      setHfKeySaved(true);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleOverlayClick}
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-2xl bg-[#0d1117] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: '88vh' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-base">الإعدادات</h2>
                  <p className="text-gray-500 text-xs">تخصيص التطبيق وإدارة التفضيلات</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-1 min-h-0" dir="rtl">
              {/* Sidebar Nav */}
              <div className="w-48 shrink-0 border-l border-white/10 bg-black/20 p-3 space-y-1 overflow-y-auto">
                <NavBtn section="theme" active={activeSection === 'theme'} onClick={() => setActiveSection('theme')} icon={<Palette className="w-4 h-4" />} label="المظهر" />
                <NavBtn section="profile" active={activeSection === 'profile'} onClick={() => setActiveSection('profile')} icon={<User className="w-4 h-4" />} label="الملف الشخصي" />
                <NavBtn section="tokens" active={activeSection === 'tokens'} onClick={() => setActiveSection('tokens')} icon={<Key className="w-4 h-4" />} label="مفاتيح API" />
                <div className="pt-2 border-t border-white/10 mt-2">
                  <NavBtn section="about" active={activeSection === 'about'} onClick={() => setActiveSection('about')} icon={<Info className="w-4 h-4" />} label="حول التطبيق" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                  {/* ── Theme Section ── */}
                  {activeSection === 'theme' && (
                    <motion.div
                      key="theme"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="p-6 space-y-5"
                    >
                      <div>
                        <h3 className="text-white font-bold text-base mb-1">المظهر والألوان</h3>
                        <p className="text-gray-500 text-xs">اختر مظهر التطبيق المفضل لديك</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {/* Dark Mode Card */}
                        <button
                          onClick={() => setTheme('dark')}
                          className={`relative rounded-2xl p-4 border-2 transition-all text-right ${
                            theme === 'dark'
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                          }`}
                        >
                          {theme === 'dark' && (
                            <div className="absolute top-2 left-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                          <div className="w-full aspect-video rounded-xl bg-slate-900 border border-white/10 mb-3 overflow-hidden flex flex-col p-2 gap-1.5">
                            <div className="h-2 bg-white/10 rounded w-3/4" />
                            <div className="h-1.5 bg-white/5 rounded w-1/2" />
                            <div className="mt-auto h-3 bg-blue-600/40 rounded" />
                          </div>
                          <div className="flex items-center gap-2">
                            <Moon className="w-4 h-4 text-blue-400" />
                            <span className="text-sm font-medium text-white">الوضع الليلي</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">مريح للعين في الإضاءة المنخفضة</p>
                        </button>

                        {/* Light Mode Card */}
                        <button
                          onClick={() => setTheme('light')}
                          className={`relative rounded-2xl p-4 border-2 transition-all text-right ${
                            theme === 'light'
                              ? 'border-amber-400 bg-amber-400/10'
                              : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                          }`}
                        >
                          {theme === 'light' && (
                            <div className="absolute top-2 left-2 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                          <div className="w-full aspect-video rounded-xl bg-slate-100 border border-black/10 mb-3 overflow-hidden flex flex-col p-2 gap-1.5">
                            <div className="h-2 bg-black/10 rounded w-3/4" />
                            <div className="h-1.5 bg-black/5 rounded w-1/2" />
                            <div className="mt-auto h-3 bg-blue-500/30 rounded" />
                          </div>
                          <div className="flex items-center gap-2">
                            <Sun className="w-4 h-4 text-amber-400" />
                            <span className="text-sm font-medium text-white">الوضع النهاري</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">واضح ومريح في الضوء الساطع</p>
                        </button>
                      </div>

                      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0">
                          {theme === 'dark' ? <Moon className="w-4 h-4 text-blue-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
                        </div>
                        <div>
                          <p className="text-sm text-white font-medium">
                            الوضع الحالي: {theme === 'dark' ? 'الليلي' : 'النهاري'}
                          </p>
                          <p className="text-xs text-gray-500">يتم حفظ تفضيلك تلقائياً</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ── Profile Section ── */}
                  {activeSection === 'profile' && (
                    <motion.div
                      key="profile"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="p-6 space-y-5"
                    >
                      <div>
                        <h3 className="text-white font-bold text-base mb-1">الملف الشخصي</h3>
                        <p className="text-gray-500 text-xs">إدارة معلومات حسابك الشخصية</p>
                      </div>

                      {/* Avatar */}
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 via-violet-500 to-fuchsia-500 flex items-center justify-center text-2xl font-bold text-white shadow-xl shadow-blue-500/20">
                            {(displayName || user?.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-[#0d1117]" />
                        </div>
                        <div>
                          <p className="text-white font-semibold">{displayName || user?.name || 'مستخدم'}</p>
                          <p className="text-gray-500 text-xs">{user?.email || 'غير مسجّل الدخول'}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-semibold text-gray-200 mb-1.5 block">الاسم المعروض</label>
                          <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="اسمك الكامل"
                            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-black/30 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/60 text-sm transition-all"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-semibold text-gray-200 mb-1.5 block">نبذة شخصية</label>
                          <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="اكتب نبذة قصيرة عن نفسك..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-black/30 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/60 text-sm transition-all resize-none"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-semibold text-gray-200 mb-1.5 block">البريد الإلكتروني</label>
                          <input
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="w-full px-4 py-3 rounded-xl border border-white/5 bg-black/20 text-gray-500 text-sm cursor-not-allowed"
                            dir="ltr"
                          />
                          <p className="text-xs text-gray-600 mt-1">البريد الإلكتروني لا يمكن تغييره هنا</p>
                        </div>
                      </div>

                      <button
                        onClick={saveProfile}
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all ${
                          profileSaved
                            ? 'bg-green-600 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20'
                        }`}
                      >
                        {profileSaved ? (
                          <><Check className="w-4 h-4" /> تم الحفظ</>
                        ) : (
                          <><Save className="w-4 h-4" /> حفظ التغييرات</>
                        )}
                      </button>
                    </motion.div>
                  )}

                  {/* ── Tokens Section ── */}
                  {activeSection === 'tokens' && (
                    <motion.div
                      key="tokens"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="p-6 space-y-6"
                    >
                      <div>
                        <h3 className="text-white font-bold text-base mb-1">مفاتيح API</h3>
                        <p className="text-gray-500 text-xs">أدخل مفاتيحك الخاصة لاستخدام الخدمات</p>
                      </div>

                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2.5">
                        <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-300/80">
                          تُحفظ المفاتيح محلياً في متصفحك فقط ولا تُرسل إلى أي خادم خارجي.
                        </p>
                      </div>

                      {/* Tavily */}
                      <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center gap-2.5 mb-1">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white">T</div>
                          <span className="text-sm font-bold text-white">Tavily API</span>
                        </div>
                        <TokenInput
                          label="مفتاح Tavily"
                          value={tavilyKey}
                          onChange={(v) => { setTavilyKey(v); setTavilyKeySaved(false); }}
                          placeholder="tvly-xxxxxxxxxxxxxxxx"
                          siteUrl="https://app.tavily.com"
                          siteName="Tavily"
                          siteIcon={<span className="text-[10px] font-bold bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">T</span>}
                          saved={tavilyKeySaved}
                        />
                      </div>

                      {/* HuggingFace */}
                      <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center gap-2.5 mb-1">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-xs font-bold text-white">🤗</div>
                          <span className="text-sm font-bold text-white">HuggingFace API</span>
                        </div>
                        <TokenInput
                          label="مفتاح HuggingFace"
                          value={hfKey}
                          onChange={(v) => { setHfKey(v); setHfKeySaved(false); }}
                          placeholder="hf_xxxxxxxxxxxxxxxx"
                          siteUrl="https://huggingface.co/settings/tokens"
                          siteName="HuggingFace"
                          siteIcon={<span className="text-[10px] font-bold bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">🤗</span>}
                          saved={hfKeySaved}
                        />
                      </div>

                      <button
                        onClick={saveTokens}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-medium text-sm transition-all shadow-lg shadow-blue-500/20"
                      >
                        <Save className="w-4 h-4" /> حفظ المفاتيح
                      </button>
                    </motion.div>
                  )}

                  {/* ── About Section ── */}
                  {activeSection === 'about' && (
                    <motion.div
                      key="about"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="p-6 space-y-5"
                    >
                      {/* App Logo + Name */}
                      <div className="text-center py-4">
                        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-blue-500 via-violet-500 to-fuchsia-600 flex items-center justify-center shadow-2xl shadow-blue-500/30 mb-4">
                          <Sparkles className="w-9 h-9 text-white" />
                        </div>
                        <h3 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">
                          Tavily Search
                        </h3>
                        <div className="flex items-center justify-center gap-2 mt-2">
                          <span className="text-xs text-gray-500 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                            v{APP_VERSION}
                          </span>
                          <span className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-3 py-1 rounded-full">
                            Stable
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-4 space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="w-4 h-4 text-blue-400" />
                          <span className="text-sm font-bold text-white">عن التطبيق</span>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed">
                          منصة بحث ذكية متكاملة تجمع قوة <span className="text-blue-400 font-medium">Tavily API</span> مع قدرات الذكاء الاصطناعي لـ <span className="text-yellow-400 font-medium">HuggingFace</span>، مما يتيح لك إجراء بحث عميق ومتعمق، استخراج محتوى صفحات الويب، الزحف على المواقع، ورسم خرائط للمواقع — كل ذلك في واجهة عربية سلسة وأنيقة.
                        </p>
                      </div>

                      {/* Features */}
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { icon: '🔍', label: 'بحث ذكي' },
                          { icon: '📄', label: 'استخراج محتوى' },
                          { icon: '🕷️', label: 'زحف المواقع' },
                          { icon: '🗺️', label: 'خرائط المواقع' },
                          { icon: '🧠', label: 'ذكاء اصطناعي' },
                          { icon: '🔬', label: 'بحث معمّق' },
                        ].map((f) => (
                          <div key={f.label} className="flex items-center gap-2 bg-white/[0.03] border border-white/8 rounded-xl px-3 py-2.5">
                            <span className="text-base">{f.icon}</span>
                            <span className="text-xs text-gray-300 font-medium">{f.label}</span>
                          </div>
                        ))}
                      </div>

                      {/* Developer */}
                      <div className="bg-gradient-to-br from-violet-900/30 to-blue-900/30 border border-violet-500/20 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Code2 className="w-4 h-4 text-violet-400" />
                          <span className="text-sm font-bold text-white">المطوّر</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-lg font-bold text-white shadow-lg">
                            M
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-semibold text-sm">{DEV_NAME}</p>
                            <p className="text-gray-500 text-xs">Full-Stack Developer</p>
                          </div>
                          <a
                            href={GITHUB_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-xs text-gray-300 hover:text-white transition-all group"
                          >
                            <Github className="w-3.5 h-3.5 group-hover:text-white" />
                            <span>GitHub</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100" />
                          </a>
                        </div>
                      </div>

                      {/* GitHub Repo Link */}
                      <a
                        href={GITHUB_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all group"
                      >
                        <Github className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                        <div className="flex-1 text-right">
                          <p className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">المستودع على GitHub</p>
                          <p className="text-xs text-gray-600 truncate" dir="ltr">github.com/Msaud7799/tavily-search</p>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Star className="w-3.5 h-3.5" />
                          <GitFork className="w-3.5 h-3.5" />
                        </div>
                      </a>

                      <p className="text-center text-xs text-gray-600 pt-2">
                        صُنع بـ ❤️ في المملكة العربية السعودية · {new Date().getFullYear()}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
