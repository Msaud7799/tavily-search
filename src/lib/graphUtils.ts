/*----------
 * ═══════════════════════════════════════════════════════════════════════
 *  🔧 أدوات الجراف المشتركة (Graph Utilities)
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  دوال مساعدة مشتركة بين searchGraph و chatGraph:
 *  - callLLM: استدعاء نموذج لغة عبر HuggingFace
 *  - createFlowStep: إنشاء خطوة في التدفق
 *  - buildSystemPrompt: بناء system prompt مع تعليمات المستخدم
 *  - extractJSON: استخراج JSON من نص
 * ═══════════════════════════════════════════════════════════════════════
----------*/

import type { FlowStep, FlowStepStatus } from './flowTypes';

/*----------
 * 🤖 استدعاء نموذج لغة عبر HuggingFace Inference API
 * @param hfToken مفتاح HuggingFace
 * @param model معرف النموذج
 * @param systemPrompt تعليمات النظام
 * @param userMessage رسالة المستخدم
 * @param maxTokens الحد الأقصى للتوكنز
 * @param temperature درجة الإبداعية
 * @returns النص المولّد
----------*/
export async function callLLM(
  hfToken: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 1024,
  temperature: number = 0.3,
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
      temperature,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(`HuggingFace API error (${response.status}): ${JSON.stringify(errData).slice(0, 200)}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/*----------
 * 🤖 استدعاء نموذج لغة مع سجل محادثة كامل
----------*/
export async function callLLMWithHistory(
  hfToken: string,
  model: string,
  messages: { role: string; content: string }[],
  maxTokens: number = 2048,
  temperature: number = 0.4,
): Promise<string> {
  const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${hfToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      stream: false,
      temperature,
    }),
  });

  if (!response.ok) {
    throw new Error(`HuggingFace API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/*----------
 * 📊 إنشاء خطوة تدفق جديدة
----------*/
export function createFlowStep(
  nodeId: string,
  label: string,
  labelAr: string,
  icon: string,
  status: FlowStepStatus = 'pending'
): FlowStep {
  return {
    id: `${nodeId}-${Date.now()}`,
    nodeId,
    label,
    labelAr,
    icon,
    status,
    startTime: status === 'running' ? Date.now() : undefined,
  };
}

/*----------
 * 📊 تحديث حالة خطوة التدفق
----------*/
export function updateFlowStep(
  step: FlowStep,
  status: FlowStepStatus,
  detail?: string,
  detailAr?: string
): FlowStep {
  return {
    ...step,
    status,
    detail,
    detailAr,
    endTime: status === 'done' || status === 'error' ? Date.now() : step.endTime,
  };
}

/*----------
 * 🏗️ بناء system prompt مع تعليمات المستخدم
----------*/
export function buildSystemPrompt(params: {
  basePrompt: string;
  enableThinking?: boolean;
  aboutMe?: string;
  aiInstructions?: string;
  followMode?: string;
  instructionFileContent?: string;
}): string {
  const parts: string[] = [];

  // تعليمات أساسية مع أو بدون thinking
  if (params.enableThinking) {
    parts.push(`${params.basePrompt}\nفكّر خطوة بخطوة وضع تفكيرك بين <think>...</think>. ثم قدم الإجابة النهائية بالعربية باستخدام Markdown.`);
  } else {
    parts.push(`${params.basePrompt}\nقدم الإجابة بالعربية باستخدام Markdown.`);
  }

  // نبذة عن المستخدم
  if (params.aboutMe?.trim()) {
    parts.push(`\n--- معلومات عن المستخدم ---\n${params.aboutMe.trim()}`);
  }

  // تعليمات مخصصة
  if (params.aiInstructions?.trim()) {
    parts.push(`\n--- تعليمات المستخدم ---\n${params.aiInstructions.trim()}`);
  }

  // ملف تعليمات
  if (params.instructionFileContent?.trim()) {
    if (params.followMode === 'must-follow') {
      parts.push(`\n--- ملف تعليمات إلزامي (يجب الاتباع) ---\n${params.instructionFileContent.trim()}`);
    } else if (params.followMode !== 'ignore') {
      parts.push(`\n--- ملف تعليمات إرشادي (استخدمه إن كان مناسباً) ---\n${params.instructionFileContent.trim()}`);
    }
  }

  return parts.join('\n');
}

/*----------
 * 📝 استخراج JSON من نص (الـ LLM أحياناً يرجع markdown)
----------*/
export function extractJSON(text: string): any | null {
  // حاول parse مباشر
  try {
    return JSON.parse(text);
  } catch {}

  // ابحث عن أول { ... } 
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {}
  }

  // ابحث عن [ ... ]
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {}
  }

  return null;
}

/*----------
 * 🔍 تحديد إذا كان السؤال يحتاج خيارات من المستخدم
----------*/
export function needsUserClarification(analysis: {
  intent: string;
  complexity: string;
  ambiguousTerms?: string[];
}): boolean {
  // أسئلة مقارنة أو معقدة أو غامضة تحتاج توضيح
  if (analysis.intent === 'comparison' || analysis.intent === 'ambiguous') return true;
  if (analysis.complexity === 'complex' && analysis.ambiguousTerms && analysis.ambiguousTerms.length > 0) return true;
  return false;
}

/*----------
 * 🔢 توليد ID فريد
----------*/
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
