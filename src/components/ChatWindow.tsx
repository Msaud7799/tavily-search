"use client";

import ChatActions from "@/components/ChatActions";
import MarkdownRender from "@/components/MarkdownRender";
import ThinkingBlock from "@/components/ThinkingBlock";
import { useAppMode } from "@/context/AppModeContext";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { AnimatePresence, motion } from "framer-motion";
import {
  Loader2,
  MessageSquare,
  Search,
  SendHorizonal,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const THINK_BLOCK_REGEX = /(<think>[\s\S]*?(?:<\/think>|$))/gi;
const THINK_BLOCK_TEST_REGEX = /(<think>[\s\S]*?(?:<\/think>|$))/i;

function stripThinkBlocks(content: string) {
  return content.replace(THINK_BLOCK_REGEX, "").trim();
}

interface ChatWindowProps {
  selectedModelId: string;
}

export default function ChatWindow({ selectedModelId }: ChatWindowProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { currentChatId, setCurrentChatId, chatMessages, addChatMessage, mode, setMode } =
    useAppMode();
  const isLight = theme === "light";

  const [message, setMessage] = useState("");
  const [enableThinking, setEnableThinking] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chatMessages.length]);

  // auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [message]);

  const canSend = useMemo(() => {
    return !isSending && !!message.trim();
  }, [isSending, message]);

  const onSend = async () => {
    if (!canSend) return;
    if (!user) return;

    const userContent = message.trim();
    setMessage("");
    setIsSending(true);

    addChatMessage({
      role: "user",
      content: userContent,
      timestamp: Date.now(),
    });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: currentChatId,
          message: userContent,
          model: selectedModelId,
          enableThinking,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Chat request failed");
      }

      if (data?.chatId && data.chatId !== currentChatId) {
        setCurrentChatId(data.chatId);
      }

      addChatMessage({
        role: "assistant",
        content: data.assistantMessage || "",
        timestamp: Date.now(),
      });
    } catch (e: any) {
      addChatMessage({
        role: "assistant",
        content: `حدث خطأ: ${e.message}`,
        timestamp: Date.now(),
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleShortcut = (promptText: string) => {
    setMessage(promptText);
    textareaRef.current?.focus();
  };

  const showIntro = chatMessages.length === 0;

  return (
    <div className="flex flex-col h-full w-full" dir="rtl">
      {/* Messages Area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 sm:px-8 py-6"
      >
        <div className="max-w-3xl mx-auto">
          {showIntro ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
                  style={{
                    background:
                      "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    boxShadow: "0 4px 20px rgba(16,185,129,0.3)",
                  }}
                >
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2
                  className="text-2xl font-bold mb-3"
                  style={{ color: isLight ? "#1e293b" : "#f1f5f9" }}
                >
                  أهلاً بك في المحادثة الذكية
                </h2>
                <p
                  className="text-sm max-w-md mx-auto leading-relaxed"
                  style={{ color: isLight ? "#64748b" : "#6b7280" }}
                >
                  اكتب أي سؤال أو استخدم الاختصارات بالأسفل لبدء محادثة جديدة
                  مع الذكاء الاصطناعي
                </p>
              </motion.div>
            </div>
          ) : (
            <div className="space-y-5">
              {chatMessages.map((m, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[88%] sm:max-w-[80%] rounded-2xl px-5 py-3.5 ${
                      m.role === "user"
                        ? ""
                        : ""
                    }`}
                    style={{
                      background:
                        m.role === "user"
                          ? isLight
                            ? "rgba(99,102,241,0.08)"
                            : "rgba(255,255,255,0.06)"
                          : isLight
                            ? "rgba(16,185,129,0.06)"
                            : "rgba(16,185,129,0.08)",
                      border:
                        m.role === "user"
                          ? isLight
                            ? "1px solid rgba(99,102,241,0.12)"
                            : "1px solid rgba(255,255,255,0.08)"
                          : isLight
                            ? "1px solid rgba(16,185,129,0.12)"
                            : "1px solid rgba(16,185,129,0.15)",
                    }}
                  >
                    {/* Role label */}
                    <div
                      className="text-[11px] font-semibold mb-1.5"
                      style={{
                        color:
                          m.role === "user"
                            ? isLight
                              ? "#4f46e5"
                              : "#60a5fa"
                            : isLight
                              ? "#059669"
                              : "#34d399",
                      }}
                    >
                      {m.role === "user" ? "أنت" : "المساعد الذكي"}
                    </div>

                    {m.role === "assistant" &&
                    THINK_BLOCK_TEST_REGEX.test(m.content) ? (
                      <AssistantMessage content={m.content} />
                    ) : (
                      <div
                        className="prose max-w-none text-sm leading-relaxed"
                        style={{
                          color: isLight ? "#1e293b" : "#e2e8f0",
                        }}
                      >
                        <MarkdownRender content={m.content} />
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              <AnimatePresence>
                {isSending && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex justify-end"
                  >
                    <div
                      className="rounded-2xl px-5 py-3.5 flex items-center gap-3"
                      style={{
                        background: isLight
                          ? "rgba(16,185,129,0.06)"
                          : "rgba(16,185,129,0.08)",
                        border: isLight
                          ? "1px solid rgba(16,185,129,0.12)"
                          : "1px solid rgba(16,185,129,0.15)",
                      }}
                    >
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        style={{
                          color: isLight ? "#059669" : "#34d399",
                        }}
                      />
                      <span
                        className="text-xs"
                        style={{
                          color: isLight ? "#059669" : "#34d399",
                        }}
                      >
                        جارٍ التفكير...
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Input Area */}
      <div
        className="shrink-0 px-4 sm:px-8 pb-4 pt-2"
        style={{
          borderTop: isLight
            ? "1px solid rgba(99,102,241,0.06)"
            : "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div className="max-w-3xl mx-auto space-y-3">
          {/* Chat Actions (shortcuts) */}
          {showIntro && <ChatActions onShortcut={handleShortcut} />}

          {/* Input Box */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: isLight
                ? "rgba(255,255,255,0.9)"
                : "rgba(255,255,255,0.04)",
              border: isLight
                ? "1px solid rgba(99,102,241,0.15)"
                : "1px solid rgba(255,255,255,0.08)",
              boxShadow: isLight
                ? "0 2px 12px rgba(99,102,241,0.06)"
                : "0 2px 12px rgba(0,0,0,0.3)",
            }}
          >
            {/* Thinking toggle */}
            <div
              className="flex items-center justify-between px-4 pt-3 pb-1"
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-[11px]"
                  style={{ color: isLight ? "#94a3b8" : "#6b7280" }}
                >
                  إظهار التفكير
                </span>
                <button
                  type="button"
                  onClick={() => setEnableThinking((v) => !v)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${enableThinking ? "bg-emerald-500" : isLight ? "bg-gray-300" : "bg-gray-600"}`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${enableThinking ? "-translate-x-0.5" : "-translate-x-4"}`}
                  />
                </button>
              </div>
            </div>

            {/* Textarea */}
            <div className="px-4 py-2">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  user
                    ? "اكتب رسالتك هنا..."
                    : "سجّل الدخول أولاً لاستخدام المحادثة"
                }
                disabled={!user || isSending}
                rows={1}
                className="w-full resize-none bg-transparent outline-none placeholder-gray-500 text-sm leading-relaxed"
                style={{
                  color: isLight ? "#1e293b" : "#e2e8f0",
                  minHeight: "36px",
                  maxHeight: "160px",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
              />
            </div>

            {/* Bottom bar with toggle and send */}
            <div className="flex items-center justify-between px-3 pb-3 pt-1">
              {/* Mode toggle */}
              <div
                className="flex items-center gap-1 p-0.5 rounded-xl"
                style={{
                  background: isLight
                    ? "rgba(99,102,241,0.06)"
                    : "rgba(255,255,255,0.04)",
                  border: isLight
                    ? "1px solid rgba(99,102,241,0.1)"
                    : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setMode("search")}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300`}
                  style={{
                    background:
                      mode === "search"
                        ? isLight
                          ? "#4f46e5"
                          : "#3b82f6"
                        : "transparent",
                    color:
                      mode === "search"
                        ? "#ffffff"
                        : isLight
                          ? "#94a3b8"
                          : "#6b7280",
                    boxShadow:
                      mode === "search"
                        ? isLight
                          ? "0 2px 8px rgba(79,70,229,0.3)"
                          : "0 2px 8px rgba(59,130,246,0.3)"
                        : "none",
                  }}
                >
                  <Search className="h-3.5 w-3.5" />
                  بحث
                </button>
                <button
                  type="button"
                  onClick={() => setMode("chat")}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300`}
                  style={{
                    background:
                      mode === "chat"
                        ? isLight
                          ? "#059669"
                          : "#10b981"
                        : "transparent",
                    color:
                      mode === "chat"
                        ? "#ffffff"
                        : isLight
                          ? "#94a3b8"
                          : "#6b7280",
                    boxShadow:
                      mode === "chat"
                        ? isLight
                          ? "0 2px 8px rgba(5,150,105,0.3)"
                          : "0 2px 8px rgba(16,185,129,0.3)"
                        : "none",
                  }}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  محادثة
                </button>
              </div>

              {/* Send button */}
              <button
                type="button"
                onClick={onSend}
                disabled={!canSend || !user}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background:
                    canSend && user
                      ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                      : isLight
                        ? "#e2e8f0"
                        : "#374151",
                  color: canSend && user ? "#ffffff" : isLight ? "#94a3b8" : "#6b7280",
                  boxShadow:
                    canSend && user
                      ? "0 2px 8px rgba(16,185,129,0.3)"
                      : "none",
                }}
              >
                <SendHorizonal className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Footer text */}
          <p
            className="text-center text-[10px]"
            style={{ color: isLight ? "#cbd5e1" : "#374151" }}
          >
            ⚡ محادثة مدعومة بالذكاء الاصطناعي — قد يكون المحتوى غير دقيق.
          </p>
        </div>
      </div>
    </div>
  );
}

function AssistantMessage({ content }: { content: string }) {
  const parts = content.split(THINK_BLOCK_REGEX);

  return (
    <div className="space-y-3">
      {parts.map((part, idx) => {
        if (!part || !part.trim()) return null;

        if (part.startsWith("<think>")) {
          const isClosed = part.endsWith("</think>");
          const thinkContent = part.slice(7, isClosed ? -8 : undefined);
          return (
            <ThinkingBlock
              key={`think-${idx}`}
              content={thinkContent}
              loading={!isClosed}
            />
          );
        }

        const clean = stripThinkBlocks(part);
        if (!clean) return null;
        return (
          <div key={`text-${idx}`} className="prose prose-invert max-w-none text-sm">
            <MarkdownRender content={clean} />
          </div>
        );
      })}
    </div>
  );
}
