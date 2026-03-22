'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy, FileCode } from 'lucide-react';

interface MarkdownRenderProps {
  content: string;
}

/*----------
 * مكون CodeBlock لعرض كتل الكود مع syntax highlighting وزر النسخ.
 * يستخدم react-syntax-highlighter مع ثيم oneDark.
----------*/
function CodeBlock({ className, children, ...props }: any) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : '';
  const code = String(children).replace(/\n$/, '');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!match) {
    // Inline code
    return (
      <code
        className="bg-white/10 text-emerald-300 px-1.5 py-0.5 rounded-md text-[0.85em] font-mono border border-white/5"
        {...props}
      >
        {children}
      </code>
    );
  }

  return (
    <div className="group relative my-4 rounded-xl overflow-hidden border border-white/10 bg-[#1a1b26]">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.04] border-b border-white/10">
        <div className="flex items-center gap-2">
          <FileCode className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-xs font-mono text-gray-400 uppercase">
            {lang || 'code'}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all
            border border-white/10 hover:border-white/20 hover:bg-white/5"
          style={{
            color: copied ? '#34d399' : '#9ca3af',
          }}
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" /> تم النسخ
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" /> نسخ
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <SyntaxHighlighter
        style={oneDark}
        language={lang}
        PreTag="div"
        customStyle={{
          margin: 0,
          padding: '1rem 1.25rem',
          background: 'transparent',
          fontSize: '0.85rem',
          lineHeight: '1.6',
          direction: 'ltr',
          textAlign: 'left',
        }}
        codeTagProps={{
          style: {
            fontFamily: "'Fira Code', 'JetBrains Mono', 'Cascadia Code', monospace",
          }
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

/*----------
 * مكون تحويل وتقديم نصوص ماركداون (MarkdownRender).
 * يأخذ محتوى مكتوب من الذكاء الاصطناعي ويُحوله لوسوم HTML وعناصر رسومية مقروءة بوضوح.
 * يدعم:
 *  - Syntax Highlighting لكتل الكود
 *  - جداول RTL
 *  - روابط خارجية آمنة
 *  - صور بأطراف منحنية
 *
 * @param {string} content - النص بصيغة ماركداون.
 * @returns {JSX.Element} حاوية للمحتوى المنسق.
----------*/
export default function MarkdownRender({ content }: MarkdownRenderProps) {
  return (
    <div className="prose prose-invert prose-blue max-w-none prose-p:leading-relaxed prose-th:text-blue-300 prose-a:text-blue-400 hover:prose-a:text-blue-300 prose-img:rounded-xl prose-headings:font-bold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-li:marker:text-blue-400">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // ── Code Block with Syntax Highlighting ──
          code: CodeBlock,
          // ── Tables ──
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-6 rounded-xl border border-white/10 bg-white/5">
              <table className="w-full text-sm text-right" {...props} dir="rtl" />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th className="px-4 py-3 bg-white/5 font-semibold text-gray-200 border-b border-white/10" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-4 py-3 border-b border-white/5 text-gray-300" {...props} />
          ),
          // ── Links ──
          a: ({ node, ...props }) => (
            <a
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline decoration-blue-400/30 hover:decoration-blue-300/50 transition-colors"
              {...props}
            />
          ),
          // ── Blockquotes ──
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-r-4 border-blue-500/40 bg-blue-500/5 rounded-lg pr-4 py-2 my-4 not-italic"
              {...props}
            />
          ),
          // ── Horizontal Rule ──
          hr: ({ node, ...props }) => (
            <hr className="border-white/10 my-6" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
