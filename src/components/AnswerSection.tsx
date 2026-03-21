'use client';

import { Sparkles, Brain, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface AnswerSectionProps {
  answer: string;
  aiAnswer?: string;
  isAILoading?: boolean;
}

/*----------
 * مكون قسم الإجابة (AnswerSection).
 * يقوم بعرض إجابة مستخلصة ومباشرة للمستخدم، سواء من Tavily مباشرة أو مبنية عبر نماذج الذكاء الاصطناعي من HuggingFace.
 * 
 * @param {string} answer - الإجابة المستخرجة من Tavily (إن وُجدت).
 * @param {string} aiAnswer - الإجابة المولدة عبر نموذج LLM لتوصيف معمق ومفصل.
 * @param {boolean} isAILoading - حالة انتظار تحميل إجابة الذكاء الاصطناعي.
 * @returns {JSX.Element} قسم رسومي لعرض الإجابات بشكل أنيق.
----------*/
export default function AnswerSection({ answer, aiAnswer, isAILoading }: AnswerSectionProps) {
  return (
    <div className="space-y-6 mb-8" dir="rtl">
      {/* Tavily Answer----------*/}
      {answer && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 backdrop-blur-xl border border-blue-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-l from-blue-400 via-indigo-500 to-purple-600" />
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-blue-500/20 rounded-xl">
              <Sparkles className="h-5 w-5 text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-white">إجابة Tavily</h2>
          </div>
          <div className="text-gray-200 text-base leading-[1.9] whitespace-pre-wrap">{answer}</div>
        </motion.div>
      )}

      {/* HuggingFace AI Answer----------*/}
      {(isAILoading || aiAnswer) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-purple-900/40 to-fuchsia-900/40 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-l from-purple-400 via-fuchsia-500 to-pink-600" />
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-purple-500/20 rounded-xl">
              <Brain className="h-5 w-5 text-purple-400" />
            </div>
            <h2 className="text-xl font-bold text-white">تحليل الذكاء الاصطناعي</h2>
            <span className="text-[10px] text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full">HuggingFace</span>
          </div>

          {isAILoading ? (
            <div className="flex items-center gap-3 text-purple-300 py-4">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>جارٍ التحليل بالذكاء الاصطناعي...</span>
            </div>
          ) : (
            <div className="text-gray-200 text-base leading-[1.9] whitespace-pre-wrap">{aiAnswer}</div>
          )}
        </motion.div>
      )}
    </div>
  );
}
