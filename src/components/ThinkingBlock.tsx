"use client";

import MarkdownRender from "@/components/MarkdownRender";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

interface ThinkingBlockProps {
  content: string;
  loading?: boolean;
}

export default function ThinkingBlock({
  content,
  loading = false,
}: ThinkingBlockProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [wasLoading, setWasLoading] = useState(false);

  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      if (loading) {
        setIsOpen(true);
        setWasLoading(true);
      }
      return;
    }

    if (loading && !wasLoading) {
      setIsOpen(true);
    } else if (!loading && wasLoading) {
      setIsOpen(false);
    }
    setWasLoading(loading);
  }, [initialized, loading, wasLoading]);

  const previewText = useMemo(() => {
    return content
      .replace(/[#*`~\[\]]/g, "")
      .replace(/\n+/g, " ")
      .trim();
  }, [content]);

  return (
    <div
      className="my-3 rounded-xl border border-white/10 bg-white/5"
      dir="rtl"
    >
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full px-4 py-3 text-right"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 32 32"
            >
              <path
                className="stroke-gray-400"
                style={{
                  strokeWidth: 1.9,
                  fill: "none",
                  strokeLinecap: "round",
                  strokeLinejoin: "round",
                }}
                d="M16 6v3.33M16 6c0-2.65 3.25-4.3 5.4-2.62 1.2.95 1.6 2.65.95 4.04a3.63 3.63 0 0 1 4.61.16 3.45 3.45 0 0 1 .46 4.37 5.32 5.32 0 0 1 1.87 4.75c-.22 1.66-1.39 3.6-3.07 4.14M16 6c0-2.65-3.25-4.3-5.4-2.62a3.37 3.37 0 0 0-.95 4.04 3.65 3.65 0 0 0-4.6.16 3.37 3.37 0 0 0-.49 4.27 5.57 5.57 0 0 0-1.85 4.85 5.3 5.3 0 0 0 3.07 4.15M16 9.33v17.34m0-17.34c0 2.18 1.82 4 4 4m6.22 7.5c.67 1.3.56 2.91-.27 4.11a4.05 4.05 0 0 1-4.62 1.5c0 1.53-1.05 2.9-2.66 2.9A2.7 2.7 0 0 1 16 26.66m10.22-5.83a4.05 4.05 0 0 0-3.55-2.17m-16.9 2.18a4.05 4.05 0 0 0 .28 4.1c1 1.44 2.92 2.09 4.59 1.5 0 1.52 1.12 2.88 2.7 2.88A2.7 2.7 0 0 0 16 26.67M5.78 20.85a4.04 4.04 0 0 1 3.55-2.18"
              />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-gray-200">
                التفكير
              </span>
              <span className="text-xs text-gray-400">
                {isOpen ? "إخفاء" : "عرض"}
              </span>
            </div>

            {!isOpen ? (
              <div
                className={`mt-1 line-clamp-2 text-sm leading-relaxed text-gray-400 ${loading ? "animate-pulse" : ""}`}
              >
                {previewText}
              </div>
            ) : null}
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden px-4 pb-4"
          >
            <div className="prose prose-invert max-w-none text-sm text-gray-300">
              <MarkdownRender content={content} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
