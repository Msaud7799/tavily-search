import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import { callLLM, callLLMWithHistory, buildSystemPrompt, extractJSON, createFlowStep, updateFlowStep, generateId } from './graphUtils';
import { resolveOmniModel } from './omniResolver';
import type { FlowStep, UserOption, UserOptionsRequest, ThinkingState } from './flowTypes';

/*----------
 * ═══════════════════════════════════════════════════════════════════════
 *  💬 جراف المحادثة الذكي (Smart Chat Graph)
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  هذا الجراف يدير المحادثة بذكاء عبر العقد التالية:
 *
 *    1️⃣  تحليل النية (analyzeIntent)        → فهم نوع الطلب
 *    2️⃣  اختيار النموذج (selectModel)        → Omni routing إذا لزم
 *    3️⃣  فحص الخيارات (checkOptions)         → هل يحتاج خيارات من المستخدم؟
 *    4️⃣  التفكير العميق (deepThink)          → تفكير خطوة بخطوة (اختياري)
 *    5️⃣  توليد الرد (generateResponse)       → إنتاج الرد النهائي
 *    6️⃣  عرض الخيارات (presentOptions)       → عرض خيارات للمستخدم (شرطي)
 *
 *  التدفق الشرطي:
 *    analyzeIntent → selectModel → checkOptions
 *      ↓ (خيارات موجودة)        ↓ (لا خيارات)
 *    presentOptions            deepThink → generateResponse
 *
 * ═══════════════════════════════════════════════════════════════════════
----------*/

/*----------
 * 📐 تعريف حالة الجراف
----------*/
const ChatGraphState = Annotation.Root({
  // مدخلات
  query: Annotation<string>,
  model: Annotation<string>,
  hfToken: Annotation<string>,
  enableThinking: Annotation<boolean>,
  aboutMe: Annotation<string>,
  aiInstructions: Annotation<string>,
  followMode: Annotation<string>,
  instructionFileContent: Annotation<string>,
  chatHistory: Annotation<{ role: string; content: string }[]>,

  // تحليل النية
  intentAnalysis: Annotation<{
    type: 'code' | 'explanation' | 'creative' | 'comparison' | 'debug' | 'general';
    complexity: 'simple' | 'medium' | 'complex';
    language: string;
    needsClarification: boolean;
    suggestedOptions: UserOption[];
    summary: string;
  } | null>,

  // النموذج المختار
  selectedModel: Annotation<string>,

  // التفكير
  thinking: Annotation<ThinkingState | null>,

  // خيارات المستخدم
  userOptionsRequest: Annotation<UserOptionsRequest | null>,
  selectedOption: Annotation<string>,

  // الرد النهائي
  response: Annotation<string>,

  // تتبع التدفق
  flowSteps: Annotation<FlowStep[]>,

  // أخطاء
  error: Annotation<string>,
});

type ChatState = typeof ChatGraphState.State;

/*----------
 * 🧩 العقدة 1: تحليل النية (Analyze Intent)
 * تفهم ماذا يريد المستخدم بالضبط.
----------*/
async function analyzeIntent(state: ChatState): Promise<Partial<ChatState>> {
  const step = createFlowStep('analyzeIntent', 'Analyze Intent', 'تحليل النية', '🔍', 'running');
  const steps = [...(state.flowSteps || []), step];

  try {
    const actualModel = (!state.model || state.model === 'Omni') ? 'meta-llama/Llama-3.3-70B-Instruct' : state.model;
    const result = await callLLM(
      state.hfToken,
      actualModel,
      `You are an intent analyzer. Analyze the user message and return ONLY valid JSON with:
- type: "code" | "explanation" | "creative" | "comparison" | "debug" | "general"
- complexity: "simple" | "medium" | "complex"
- language: detected language code (ar, en, etc.)
- needsClarification: true/false - ONLY true if the query is genuinely ambiguous and has multiple valid interpretations
- suggestedOptions: array of max 3 options if needsClarification is true, each with {id, label, labelAr, descriptionAr}. Only suggest options when there are distinct approaches the user might want.
- summary: one-line summary of what user wants

Return ONLY JSON, no markdown.`,
      `User message: "${state.query}"`,
      512
    );

    const parsed = extractJSON(result);
    if (parsed) {
      return {
        intentAnalysis: parsed,
        flowSteps: steps.map(s =>
          s.nodeId === 'analyzeIntent' ? updateFlowStep(s, 'done', parsed.summary, parsed.summary) : s
        ),
      };
    }
  } catch {}

  // قيم افتراضية
  const defaultAnalysis = {
    type: 'general' as const,
    complexity: 'medium' as const,
    language: /[\u0600-\u06FF]/.test(state.query) ? 'ar' : 'en',
    needsClarification: false,
    suggestedOptions: [],
    summary: state.query.slice(0, 60),
  };

  return {
    intentAnalysis: defaultAnalysis,
    flowSteps: steps.map(s =>
      s.nodeId === 'analyzeIntent' ? updateFlowStep(s, 'done') : s
    ),
  };
}

/*----------
 * 🧩 العقدة 2: اختيار النموذج (Select Model)
 * إذا كان النموذج "Omni" → يحلل ويختار الأنسب.
----------*/
async function selectModel(state: ChatState): Promise<Partial<ChatState>> {
  const step = createFlowStep('selectModel', 'Select Model', 'اختيار النموذج', '🎯', 'running');
  const steps = [...(state.flowSteps || []), step];

  let selected = state.model || 'Omni';

  if (selected === 'Omni') {
    try {
      selected = await resolveOmniModel(state.query, state.hfToken, state.chatHistory);
    } catch {
      selected = 'Omni';
    }
  }

  const modelName = selected.split('/').pop() || selected;

  return {
    selectedModel: selected,
    flowSteps: steps.map(s =>
      s.nodeId === 'selectModel' ? updateFlowStep(s, 'done', modelName, `تم اختيار: ${modelName}`) : s
    ),
  };
}

/*----------
 * 🧩 العقدة 3: فحص الخيارات (Check Options)
 * تقرر إذا يحتاج عرض خيارات للمستخدم.
----------*/
async function checkOptions(state: ChatState): Promise<Partial<ChatState>> {
  const analysis = state.intentAnalysis;
  if (!analysis || !analysis.needsClarification || analysis.suggestedOptions.length === 0) {
    return { userOptionsRequest: null };
  }

  // إذا المستخدم سبق واختار خيار → تخطي
  if (state.selectedOption) {
    return { userOptionsRequest: null };
  }

  const optionsRequest: UserOptionsRequest = {
    question: 'How would you like me to help?',
    questionAr: 'كيف تريدني أساعدك؟',
    options: analysis.suggestedOptions,
    allowMultiple: false,
    required: false,
  };

  return { userOptionsRequest: optionsRequest };
}

/*----------
 * 🔀 دالة التوجيه: خيارات أم تفكير؟
----------*/
function routeAfterOptions(state: ChatState): string {
  if (state.userOptionsRequest && !state.selectedOption) {
    return 'presentOptions';
  }
  if (state.enableThinking) {
    return 'deepThink';
  }
  return 'generateResponse';
}

/*----------
 * 🧩 العقدة 4: عرض خيارات (Present Options)
 * تعيد خيارات للمستخدم وتوقف الجراف.
----------*/
async function presentOptions(state: ChatState): Promise<Partial<ChatState>> {
  const step = createFlowStep('presentOptions', 'Present Options', 'عرض خيارات', '📋', 'done');
  return {
    flowSteps: [...(state.flowSteps || []), step],
    // الـ response فاضي لأن الجراف ينتظر رد المستخدم
    response: '',
  };
}

/*----------
 * 🧩 العقدة 5: التفكير العميق (Deep Think)
 * تفكير خطوة بخطوة قبل الرد.
----------*/
async function deepThink(state: ChatState): Promise<Partial<ChatState>> {
  const step = createFlowStep('deepThink', 'Deep Think', 'التفكير', '🧠', 'running');
  const steps = [...(state.flowSteps || []), step];

  try {
    const thinkResult = await callLLM(
      state.hfToken,
      state.selectedModel || state.model,
      `أنت محلل ذكي. فكّر بعمق في سؤال المستخدم:
1. ما الذي يريده بالضبط؟
2. ما أفضل طريقة للإجابة؟
3. ما النقاط المهمة التي يجب تغطيتها؟
4. هل هناك حالات خاصة يجب الانتباه لها؟

اكتب تفكيرك بإيجاز (4-6 أسطر).`,
      `السؤال: "${state.query}"${state.selectedOption ? `\nالخيار المختار: ${state.selectedOption}` : ''}`,
      512
    );

    const thinkingState: ThinkingState = {
      isThinking: false,
      content: thinkResult,
      steps: thinkResult.split('\n').filter(l => l.trim()),
    };

    return {
      thinking: thinkingState,
      flowSteps: steps.map(s =>
        s.nodeId === 'deepThink' ? updateFlowStep(s, 'done', 'Analysis complete', 'اكتمل التحليل') : s
      ),
    };
  } catch {
    return {
      thinking: { isThinking: false, content: '', steps: [] },
      flowSteps: steps.map(s =>
        s.nodeId === 'deepThink' ? updateFlowStep(s, 'skipped') : s
      ),
    };
  }
}

/*----------
 * 🧩 العقدة 6: توليد الرد (Generate Response)
 * تولد الرد النهائي مع Markdown.
----------*/
async function generateResponse(state: ChatState): Promise<Partial<ChatState>> {
  const step = createFlowStep('generateResponse', 'Generate Response', 'توليد الرد', '✨', 'running');
  const steps = [...(state.flowSteps || []), step];

  const basePrompt = `أنت مساعد ذكي متقدم. أجب بشكل شامل ومفيد.
- استخدم Markdown للتنسيق (عناوين، قوائم، كود بلوك مع تحديد اللغة)
- إذا كان السؤال عن كود، اكتب كود نظيف مع تعليقات
- إذا كان السؤال عام، أعط إجابة منظمة ومفصلة
- اكتب بالعربية إلا إذا طُلب غير ذلك`;

  const systemPrompt = buildSystemPrompt({
    basePrompt,
    enableThinking: state.enableThinking,
    aboutMe: state.aboutMe,
    aiInstructions: state.aiInstructions,
    followMode: state.followMode,
    instructionFileContent: state.instructionFileContent,
  });

  // بناء الرسائل مع سجل المحادثة
  const messages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt },
  ];

  // إضافة سجل المحادثة السابق
  if (state.chatHistory?.length) {
    for (const m of state.chatHistory) {
      messages.push({ role: m.role, content: m.content });
    }
  }

  // إضافة سياق إضافي
  let userMsg = state.query;
  if (state.thinking?.content) {
    userMsg = `${state.query}\n\n[تحليل مسبق: ${state.thinking.content}]`;
  }
  if (state.selectedOption) {
    userMsg = `${state.query}\n\n[المستخدم اختار: ${state.selectedOption}]`;
  }
  messages.push({ role: 'user', content: userMsg });

  try {
    const response = await callLLMWithHistory(
      state.hfToken,
      state.selectedModel || state.model,
      messages,
      2048,
      0.4
    );

    return {
      response,
      flowSteps: steps.map(s =>
        s.nodeId === 'generateResponse' ? updateFlowStep(s, 'done', 'Response ready', 'الرد جاهز') : s
      ),
    };
  } catch (err: any) {
    return {
      response: `⚠️ حدث خطأ أثناء توليد الرد: ${err.message}`,
      error: err.message,
      flowSteps: steps.map(s =>
        s.nodeId === 'generateResponse' ? updateFlowStep(s, 'error', err.message) : s
      ),
    };
  }
}

/*----------
 * 🏗️ بناء وتجميع جراف المحادثة
----------*/
function buildChatGraph() {
  const graph = new StateGraph(ChatGraphState)
    .addNode('analyzeIntent', analyzeIntent)
    .addNode('selectModel', selectModel)
    .addNode('checkOptions', checkOptions)
    .addNode('presentOptions', presentOptions)
    .addNode('deepThink', deepThink)
    .addNode('generateResponse', generateResponse)
    // التدفق
    .addEdge(START, 'analyzeIntent')
    .addEdge('analyzeIntent', 'selectModel')
    .addEdge('selectModel', 'checkOptions')
    .addConditionalEdges('checkOptions', routeAfterOptions, {
      presentOptions: 'presentOptions',
      deepThink: 'deepThink',
      generateResponse: 'generateResponse',
    })
    .addEdge('presentOptions', END)
    .addEdge('deepThink', 'generateResponse')
    .addEdge('generateResponse', END);

  return graph.compile();
}

/*----------
 * 🚀 الدالة الرئيسية: تشغيل محادثة ذكية
----------*/
export async function runSmartChat(params: {
  query: string;
  model?: string;
  hfToken: string;
  enableThinking?: boolean;
  aboutMe?: string;
  aiInstructions?: string;
  followMode?: string;
  instructionFileContent?: string;
  selectedOption?: string;
  chatHistory?: { role: string; content: string }[];
}) {
  const app = buildChatGraph();

  const result = await app.invoke({
    query: params.query,
    model: params.model || 'Omni',
    hfToken: params.hfToken,
    enableThinking: params.enableThinking ?? true,
    aboutMe: params.aboutMe || '',
    aiInstructions: params.aiInstructions || '',
    followMode: params.followMode || 'auto',
    instructionFileContent: params.instructionFileContent || '',
    chatHistory: params.chatHistory || [],
    intentAnalysis: null,
    selectedModel: '',
    thinking: null,
    userOptionsRequest: null,
    selectedOption: params.selectedOption || '',
    response: '',
    flowSteps: [],
    error: '',
  });

  return {
    response: result.response,
    thinking: result.thinking,
    intentAnalysis: result.intentAnalysis,
    selectedModel: result.selectedModel,
    userOptionsRequest: result.userOptionsRequest,
    flowSteps: result.flowSteps,
    error: result.error,
  };
}
