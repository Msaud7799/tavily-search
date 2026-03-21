'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface MarkdownRenderProps {
  content: string;
}

/*----------
 * مكون تحويل وتقديم نصوص ماركداون (MarkdownRender).
 * يأخذ محتوى مكتوب من الذكاء الاصطناعي ويُحوله لوسوم HTML وعناصر رسومية مقروءة بوضوح.
 *
 * @param {string} content - النص بصيغة ماركداون.
 * @returns {JSX.Element} حاوية للمحتوى المنسق مع تفاعلات للروابط والجداول.
----------*/
export default function MarkdownRender({ content }: MarkdownRenderProps) {
  return (
    <div className="prose prose-invert prose-blue max-w-none prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 prose-th:text-blue-300 prose-a:text-blue-400 hover:prose-a:text-blue-300 prose-img:rounded-xl">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
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
          a: ({ node, ...props }) => (
            <a target="_blank" rel="noopener noreferrer" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
