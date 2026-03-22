"use client";

import MarkdownRender from "@/components/MarkdownRender";
import { Loader2, Sparkles } from "lucide-react";

interface AnswerSectionProps {
  answer: string;
  aiAnswer?: string;
  isAILoading?: boolean;
}

export default function AnswerSection({
  answer,
  aiAnswer,
  isAILoading,
}: AnswerSectionProps) {
  return (
    <div className="space-y-4">
      {answer && (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
          <div
            className="text-sm font-semibold mb-3"
            style={{ color: "var(--text-secondary)" }}
          >
            إجابة Tavily
          </div>
          <MarkdownRender content={answer} />
        </div>
      )}

      {(isAILoading || aiAnswer) && (
        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 backdrop-blur-xl p-5">
          <div
            className="flex items-center gap-2 text-sm font-semibold mb-3"
            style={{ color: "var(--text-secondary)" }}
          >
            <Sparkles className="h-4 w-4 text-purple-400" />
            إجابة الذكاء الاصطناعي
          </div>

          {isAILoading && !aiAnswer ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              جارٍ توليد الإجابة...
            </div>
          ) : (
            <MarkdownRender content={aiAnswer || ""} />
          )}
        </div>
      )}
    </div>
  );
}
