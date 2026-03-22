"use client";

import ChatActions from "@/components/ChatActions";
import MarkdownRender from "@/components/MarkdownRender";
import ThinkingBlock from "@/components/ThinkingBlock";
import { useAppMode } from "@/context/AppModeContext";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useTypingEffect } from "@/hooks/useTypingEffect";
import { AnimatePresence, motion } from "framer-motion";
import {
  ImagePlus,
  Loader2,
  MessageSquare,
  Paperclip,
  Search,
  SendHorizonal,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  processFile,
  isFileSupported,
  validateFileSize,
  getSupportedAcceptString,
  formatFileSize,
  type AttachedFile,
} from "@/lib/fileProcessor";

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
  const [latestAssistantIdx, setLatestAssistantIdx] = useState<number | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [message]);

  const canSend = useMemo(() => {
    return !isSending && (!!message.trim() || attachedFiles.length > 0);
  }, [isSending, message, attachedFiles]);

  // Read AI instructions from localStorage
  const getAiContext = () => {
    const aboutMe = localStorage.getItem("ai-about-me") || "";
    const aiInstructions = localStorage.getItem("ai-instructions") || "";
    const followMode = localStorage.getItem("ai-follow-mode") || "auto";
    let instructionFileContent = "";
    try {
      const fileData = localStorage.getItem("ai-instruction-file");
      if (fileData) {
        const parsed = JSON.parse(fileData);
        instructionFileContent = parsed.content || "";
      }
    } catch {}
    return { aboutMe, aiInstructions, followMode, instructionFileContent };
  };

  // File handling
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (!isFileSupported(file.name)) continue;
      const validation = validateFileSize(file);
      if (!validation.valid) continue;
      const processed = await processFile(file);
      if (processed) {
        setAttachedFiles((prev) => [...prev, processed]);
      }
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const onSend = async () => {
    if (!canSend) return;
    if (!user) return;

    const userContent = message.trim();
    setMessage("");
    setIsSending(true);

    // Build message with file info
    let fullContent = userContent;
    const imageFiles = attachedFiles.filter((f) => f.type === "image");
    const textFiles = attachedFiles.filter((f) => f.type !== "image");

    if (textFiles.length > 0) {
      const textParts = textFiles.map(
        (f) => `<document name="${f.name}" type="${f.extension}">\n${f.content}\n</document>`
      );
      fullContent = textParts.join("\n\n") + "\n\n" + fullContent;
    }

    addChatMessage({
      role: "user",
      content: userContent,
      timestamp: Date.now(),
    });

    // Clear attachments after send
    setAttachedFiles([]);

    try {
      const aiContext = getAiContext();

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: currentChatId,
          message: fullContent,
          model: selectedModelId,
          enableThinking,
          aboutMe: aiContext.aboutMe,
          aiInstructions: aiContext.aiInstructions,
          followMode: aiContext.followMode,
          instructionFileContent: aiContext.instructionFileContent,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Chat request failed");
      }

      if (data?.chatId && data.chatId !== currentChatId) {
        setCurrentChatId(data.chatId);
      }

      const nextIdx = chatMessages.length + 1;
      setLatestAssistantIdx(nextIdx);

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
                    className={`max-w-[88%] sm:max-w-[80%] rounded-2xl px-5 py-3.5`}
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

                    {m.role === "assistant" ? (
                      <AssistantMessageContent
                        content={m.content}
                        isLatest={idx === latestAssistantIdx}
                        isLight={isLight}
                      />
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

      {/* ═══════════════════════════════════════════════════════
       *  Bottom Input Area — بنفس تصميم السيرج بوكس
       * ═══════════════════════════════════════════════════════ */}
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

          {/* ── Attached Files Preview ── */}
          <AnimatePresence>
            {attachedFiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="flex flex-wrap gap-2"
              >
                {attachedFiles.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs border"
                    style={{
                      background: isLight ? "rgba(99,102,241,0.06)" : "rgba(255,255,255,0.06)",
                      borderColor: isLight ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.1)",
                      color: isLight ? "#4f46e5" : "#93c5fd",
                    }}
                  >
                    {f.type === "image" ? (
                      <img src={f.preview} alt={f.name} className="w-6 h-6 rounded object-cover" />
                    ) : (
                      <Paperclip className="w-3.5 h-3.5" />
                    )}
                    <span className="truncate max-w-[120px]">{f.name}</span>
                    <span className="opacity-60">{formatFileSize(f.size)}</span>
                    <button onClick={() => removeFile(f.id)} className="hover:text-red-400 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Search-style Input Box ── */}
          <div className="relative group">
            {/* Right icon */}
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
              {isSending ? (
                <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" />
              ) : (
                <span className="text-gray-400 group-focus-within:text-emerald-500 transition-colors">
                  <Sparkles className="h-5 w-5" />
                </span>
              )}
            </div>

            {/* Input field — same style as SearchBox */}
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
              className="w-full pr-14 pl-44 py-5 rounded-2xl border-2 backdrop-blur-xl placeholder-gray-500 focus:outline-none shadow-2xl transition-all text-base resize-none"
              style={{
                background: isLight ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.07)",
                borderColor: isLight ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.2)",
                color: isLight ? "#1e293b" : "#e2e8f0",
                minHeight: "56px",
                maxHeight: "200px",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = isLight ? "#6366f1" : "#10b981";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = isLight ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.2)";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
            />

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept={getSupportedAcceptString()}
              onChange={handleFileSelect}
              className="hidden"
              multiple
            />

            {/* Left buttons area — same layout as SearchBox */}
            <div className="absolute inset-y-0 left-2 flex items-center gap-1.5">
              {/* File upload button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-xl transition-all"
                style={{
                  color: isLight ? "#94a3b8" : "#6b7280",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.color = isLight ? "#4f46e5" : "#60a5fa";
                  e.currentTarget.style.background = isLight ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.1)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.color = isLight ? "#94a3b8" : "#6b7280";
                  e.currentTarget.style.background = "transparent";
                }}
                title="📎 إرفاق ملف أو صورة"
              >
                <Paperclip className="h-5 w-5" />
              </button>

              {/* Thinking toggle */}
              <button
                type="button"
                onClick={() => setEnableThinking((v) => !v)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${enableThinking ? "bg-emerald-500" : isLight ? "bg-gray-300" : "bg-gray-600"}`}
                title={enableThinking ? "إيقاف التفكير" : "تشغيل التفكير"}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${enableThinking ? "-translate-x-0.5" : "-translate-x-4"}`}
                />
              </button>

              {/* Send button — styled like SearchBox submit */}
              <button
                type="button"
                onClick={onSend}
                disabled={!canSend || !user}
                className="px-5 py-2 rounded-xl font-medium transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                style={{
                  background: canSend && user
                    ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                    : isLight ? "#e2e8f0" : "#374151",
                  color: canSend && user ? "#ffffff" : isLight ? "#94a3b8" : "#6b7280",
                  boxShadow: canSend && user ? "0 2px 8px rgba(16,185,129,0.3)" : "none",
                }}
              >
                <SendHorizonal className="h-4 w-4" />
                <span>إرسال</span>
              </button>
            </div>
          </div>

          {/* ── Bottom bar: mode toggle ── */}
          <div className="flex items-center justify-center">
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
                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300"
                style={{
                  background:
                    mode === "search"
                      ? isLight ? "#4f46e5" : "#3b82f6"
                      : "transparent",
                  color:
                    mode === "search"
                      ? "#ffffff"
                      : isLight ? "#94a3b8" : "#6b7280",
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
                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300"
                style={{
                  background:
                    mode === "chat"
                      ? isLight ? "#059669" : "#10b981"
                      : "transparent",
                  color:
                    mode === "chat"
                      ? "#ffffff"
                      : isLight ? "#94a3b8" : "#6b7280",
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
          </div>
        </div>
      </div>
    </div>
  );
}

/*----------
 * AssistantMessageContent: يعرض رسالة المساعد مع دعم:
 *  - ThinkingBlock (كتل التفكير)
 *  - Typing Effect (تأثير الكتابة التدريجية)
 *  - MarkdownRender مع syntax highlighting
----------*/
function AssistantMessageContent({
  content,
  isLatest,
  isLight,
}: {
  content: string;
  isLatest: boolean;
  isLight: boolean;
}) {
  const hasThinking = THINK_BLOCK_TEST_REGEX.test(content);
  const cleanContent = stripThinkBlocks(content);

  // Typing effect only for the latest assistant message
  const { displayedText, isTyping } = useTypingEffect(cleanContent, 12, isLatest);
  const textToShow = isLatest ? displayedText : cleanContent;

  if (hasThinking) {
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
              <MarkdownRender content={isLatest ? displayedText : clean} />
            </div>
          );
        })}
        {isTyping && (
          <span className="inline-block w-1.5 h-4 bg-emerald-400 rounded-full animate-pulse ml-0.5" />
        )}
      </div>
    );
  }

  return (
    <div className="prose max-w-none text-sm leading-relaxed" style={{ color: isLight ? "#1e293b" : "#e2e8f0" }}>
      <MarkdownRender content={textToShow} />
      {isTyping && (
        <span className="inline-block w-1.5 h-4 bg-emerald-400 rounded-full animate-pulse ml-0.5 align-middle" />
      )}
    </div>
  );
}
