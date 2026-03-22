/*----------
 * ═══════════════════════════════════════════════════════════════════════
 *  🔗 خدمة LangChain (LangChain Service)
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  تقدم دوال مساعدة لاستخدام LangChain مع HuggingFace API.
 *  تُستخدم كطبقة وسيطة بين واجهة المستخدم و searchGraph.ts.
 *
 *  الميزات:
 *  - إنشاء اتصال مع نماذج اللغة عبر HuggingFace
 *  - توفير دوال مساعدة للـ "التفكير" قبل البحث
 *  - إدارة التوكنز والمفاتيح
 * ═══════════════════════════════════════════════════════════════════════
----------*/

import { runSmartSearch } from './searchGraph';

/*----------
 * دالة مساعدة: استدعاء نموذج لغة عبر HuggingFace Inference API
 * @param hfToken - مفتاح HuggingFace API
 * @param model - معرف النموذج (مثل meta-llama/Llama-3.3-70B-Instruct)
 * @param systemPrompt - تعليمات النظام
 * @param userMessage - رسالة المستخدم
 * @param maxTokens - الحد الأقصى للتوكنز في الرد
 * @returns النص المولّد من النموذج
----------*/
export async function callHuggingFaceModel(
  hfToken: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 1024
): Promise<string> {
  const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${hfToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: maxTokens,
      stream: false,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`HuggingFace API error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/*----------
 * دالة: تحليل سؤال المستخدم (Thinking before Search)
 * تأخذ سؤال المستخدم وتحلّله لتحديد أفضل طريقة للبحث.
 *
 * @param query - سؤال المستخدم
 * @param hfToken - مفتاح HuggingFace
 * @param model - النموذج المستخدم
 * @returns تحليل السؤال كنص
----------*/
export async function analyzeQueryBeforeSearch(
  query: string,
  hfToken: string,
  model: string = 'meta-llama/Llama-3.3-70B-Instruct'
): Promise<{ thinking: string; optimizedQuery: string }> {
  const systemPrompt = `أنت محلل ذكي. قم بتحليل سؤال المستخدم بإيجاز شديد (3-4 أسطر):
1. ما الذي يريده المستخدم بالضبط؟
2. ما أفضل كلمات بحث؟
3. هل يحتاج بحث عميق أم سطحي؟

ثم في آخر سطر اكتب:
OPTIMIZED_QUERY: [أفضل صياغة للبحث بالإنجليزية]`;

  try {
    const result = await callHuggingFaceModel(hfToken, model, systemPrompt, query, 512);

    // استخراج الاستعلام المحسّن
    const optimizedMatch = result.match(/OPTIMIZED_QUERY:\s*(.+)/i);
    const optimizedQuery = optimizedMatch ? optimizedMatch[1].trim() : query;
    const thinking = result.replace(/OPTIMIZED_QUERY:.+/i, '').trim();

    return { thinking, optimizedQuery };
  } catch {
    return { thinking: '', optimizedQuery: query };
  }
}

/*----------
 * دالة: تشغيل بحث ذكي باستخدام LangGraph
 * تستخدم searchGraph.ts لإجراء بحث متعدد المراحل.
 *
 * @param query - سؤال المستخدم
 * @param hfToken - مفتاح HuggingFace
 * @param tavilyApiKey - مفتاح Tavily
 * @param model - النموذج المستخدم
----------*/
export async function runIntelligentSearch(params: {
  query: string;
  hfToken: string;
  tavilyApiKey: string;
  model?: string;
}) {
  return runSmartSearch({
    query: params.query,
    model: params.model,
    hfToken: params.hfToken,
    tavilyApiKey: params.tavilyApiKey,
  });
}

/*----------
 * دالة: الحصول على التوكن المناسب
 * تحاول الحصول على HF_TOKEN من مصادر متعددة:
 * 1. من بيئة النظام (process.env.HF_TOKEN)
 * 2. من الـ fallback (process.env.HF_TOKEN_FALLBACK)
----------*/
export function getHFToken(): string {
  return process.env.HF_TOKEN || process.env.HF_TOKEN_FALLBACK || '';
}

/*----------
 * دالة: الحصول على مفتاح Tavily
----------*/
export function getTavilyApiKey(): string {
  return process.env.TAVILY_API_KEY || '';
}
