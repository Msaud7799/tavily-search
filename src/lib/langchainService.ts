/*----------
 * ═══════════════════════════════════════════════════════════════════════
 *  🔗 خدمة LangChain الموحدة (Unified LangChain Service)
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  طبقة وسيطة موحدة تجمع بين:
 *  - searchGraph: للبحث الذكي عبر Tavily
 *  - chatGraph: للمحادثة الذكية عبر HuggingFace
 *
 *  توفر واجهة موحدة لتشغيل أي من الجرافين حسب الوضع (search/chat).
 * ═══════════════════════════════════════════════════════════════════════
----------*/

import { runSmartSearch } from './searchGraph';
import { runSmartChat } from './chatGraph';
import type { GraphRunConfig, GraphExecutionResult } from './flowTypes';

/*----------
 * 🚀 تشغيل الجراف الموحد
 * يقرر تلقائياً أي جراف يستخدم حسب graphType.
 *
 * @param config - إعدادات التشغيل
 * @returns نتيجة التنفيذ الموحدة
----------*/
export async function runGraph(config: GraphRunConfig): Promise<GraphExecutionResult> {
  const startTime = Date.now();

  try {
    if (config.graphType === 'search') {
      // ── جراف البحث ──
      if (!config.tavilyApiKey) {
        return {
          answer: '',
          error: 'مفتاح Tavily مطلوب للبحث.',
          flowSteps: [],
        };
      }

      const result = await runSmartSearch({
        query: config.query,
        model: config.model,
        hfToken: config.hfToken,
        tavilyApiKey: config.tavilyApiKey,
        enableThinking: config.enableThinking,
        selectedOption: config.selectedUserOption,
      });

      return {
        answer: result.answer,
        error: result.error || undefined,
        flowSteps: result.flowSteps,
        userOptionsRequest: result.userOptionsRequest || undefined,
        thinking: result.reasoning ? {
          isThinking: false,
          content: result.reasoning,
          steps: result.reasoning.split('\n').filter(l => l.trim()),
        } : undefined,
        metadata: {
          results: result.results,
          queryAnalysis: result.queryAnalysis,
          searchPlan: result.searchPlan,
          filterSummary: result.filterSummary,
          tavilyAnswer: result.tavilyAnswer,
          responseTime: result.responseTime,
          totalTime: (Date.now() - startTime) / 1000,
        },
      };
    } else {
      // ── جراف المحادثة ──
      const result = await runSmartChat({
        query: config.query,
        model: config.model,
        hfToken: config.hfToken,
        enableThinking: config.enableThinking,
        aboutMe: config.aboutMe,
        aiInstructions: config.aiInstructions,
        followMode: config.followMode,
        instructionFileContent: config.instructionFileContent,
        selectedOption: config.selectedUserOption,
        chatHistory: config.chatHistory,
      });

      return {
        answer: result.response,
        error: result.error || undefined,
        flowSteps: result.flowSteps,
        thinking: result.thinking || undefined,
        userOptionsRequest: result.userOptionsRequest || undefined,
        metadata: {
          intentAnalysis: result.intentAnalysis,
          selectedModel: result.selectedModel,
          totalTime: (Date.now() - startTime) / 1000,
        },
      };
    }
  } catch (err: any) {
    return {
      answer: '',
      error: err.message || 'حدث خطأ غير متوقع',
      flowSteps: [],
    };
  }
}

/*----------
 * 🔧 دوال مساعدة للحصول على المفاتيح
----------*/
export function getHFToken(): string {
  return process.env.HF_TOKEN || '';
}

export function getTavilyApiKey(): string {
  return process.env.TAVILY_API_KEY || '';
}
