import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import { tavily } from '@tavily/core';
import { callLLM, extractJSON, createFlowStep, updateFlowStep } from './graphUtils';
import type { FlowStep, UserOption, UserOptionsRequest } from './flowTypes';

/*----------
 * ═══════════════════════════════════════════════════════════════════════
 *  🧠 محرك البحث الذكي بـ LangGraph (Enhanced)
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  جراف تفكير متقدم يمر بـ 7 عقد:
 *
 *    1️⃣  تحليل السؤال (analyzeQuery)
 *    2️⃣  سؤال المستخدم (askUserOptions)     ← جديد: خيارات شرطية
 *    3️⃣  تخطيط البحث  (planSearch)
 *    4️⃣  تنفيذ البحث  (executeSearch)
 *    5️⃣  فلترة النتائج (filterResults)
 *    6️⃣  التفكير العميق (thinkAndReason)    ← toggle
 *    7️⃣  توليد الإجابة (generateAnswer)
 *
 *  التدفق الشرطي:
 *    analyzeQuery → [خيارات؟] → askUser / planSearch
 *    filterResults → [نتائج كافية؟] → retry / thinkAndReason
 *    thinkAndReason [toggle] → generateAnswer
 * ═══════════════════════════════════════════════════════════════════════
----------*/

const SearchGraphState = Annotation.Root({
  // المدخلات
  originalQuery: Annotation<string>,
  model: Annotation<string>,
  hfToken: Annotation<string>,
  tavilyApiKey: Annotation<string>,
  enableThinking: Annotation<boolean>,

  // تحليل
  queryAnalysis: Annotation<{
    intent: string;
    type: string;
    keywords: string[];
    language: string;
    complexity: 'simple' | 'medium' | 'complex';
    needsDeepSearch: boolean;
    needsUserInput: boolean;
    suggestedOptions: UserOption[];
  } | null>,

  // خيارات المستخدم
  userOptionsRequest: Annotation<UserOptionsRequest | null>,
  selectedOption: Annotation<string>,

  // خطة البحث
  searchPlan: Annotation<{
    primaryQuery: string;
    secondaryQueries: string[];
    searchDepth: 'basic' | 'advanced';
    maxResults: number;
    topic: string;
  } | null>,

  // نتائج
  rawResults: Annotation<any[]>,
  tavilyAnswer: Annotation<string>,
  responseTime: Annotation<number>,
  filteredResults: Annotation<any[]>,
  filterSummary: Annotation<string>,

  // تفكير وإجابة
  reasoning: Annotation<string>,
  finalAnswer: Annotation<string>,

  // تتبع
  searchAttempt: Annotation<number>,
  flowSteps: Annotation<FlowStep[]>,
  error: Annotation<string>,
});

type SearchState = typeof SearchGraphState.State;

/*----------
 * 🧩 العقدة 1: تحليل السؤال
----------*/
async function analyzeQuery(state: SearchState): Promise<Partial<SearchState>> {
  const step = createFlowStep('analyzeQuery', 'Analyze Query', 'تحليل السؤال', '🔍', 'running');
  const steps = [step];

  try {
    const analysis = await callLLM(
      state.hfToken, state.model,
      `You are a query analyzer. Analyze the search query and return ONLY valid JSON:
- intent: informational, navigational, transactional, comparison, ambiguous
- type: question, topic, entity, how-to, news, opinion
- keywords: 3-5 essential search keywords
- language: language code (ar, en, etc.)
- complexity: simple, medium, complex
- needsDeepSearch: true/false
- needsUserInput: true ONLY if the query has multiple fundamentally different interpretations that would lead to completely different search results
- suggestedOptions: if needsUserInput is true, array of max 3 options: [{id, label, labelAr, descriptionAr}]

Return ONLY JSON.`,
      `Query: "${state.originalQuery}"`,
      512
    );

    const parsed = extractJSON(analysis);
    if (parsed) {
      return {
        queryAnalysis: { ...parsed, suggestedOptions: parsed.suggestedOptions || [] },
        flowSteps: steps.map(s => updateFlowStep(s, 'done', parsed.type, `نوع: ${parsed.type}`)),
      };
    }
  } catch {}

  const defaultAnalysis = {
    intent: 'informational',
    type: 'question',
    keywords: state.originalQuery.split(' ').slice(0, 5),
    language: /[\u0600-\u06FF]/.test(state.originalQuery) ? 'ar' : 'en',
    complexity: 'medium' as const,
    needsDeepSearch: state.originalQuery.split(' ').length > 5,
    needsUserInput: false,
    suggestedOptions: [] as UserOption[],
  };

  return {
    queryAnalysis: defaultAnalysis,
    flowSteps: steps.map(s => updateFlowStep(s, 'done')),
  };
}

/*----------
 * 🔀 هل يحتاج خيارات من المستخدم؟
----------*/
function routeAfterAnalysis(state: SearchState): string {
  const analysis = state.queryAnalysis;
  if (analysis?.needsUserInput && analysis.suggestedOptions.length > 0 && !state.selectedOption) {
    return 'askUserOptions';
  }
  return 'planSearch';
}

/*----------
 * 🧩 العقدة 2: سؤال المستخدم (خيارات)
----------*/
async function askUserOptions(state: SearchState): Promise<Partial<SearchState>> {
  const step = createFlowStep('askUserOptions', 'Ask User', 'سؤال المستخدم', '📋', 'done');
  const analysis = state.queryAnalysis!;

  return {
    userOptionsRequest: {
      question: 'What specifically are you looking for?',
      questionAr: 'ما الذي تبحث عنه تحديداً؟',
      options: analysis.suggestedOptions,
      allowMultiple: false,
      required: false,
    },
    flowSteps: [...(state.flowSteps || []), step],
  };
}

/*----------
 * 🧩 العقدة 3: تخطيط البحث
----------*/
async function planSearch(state: SearchState): Promise<Partial<SearchState>> {
  const step = createFlowStep('planSearch', 'Plan Search', 'تخطيط البحث', '📝', 'running');
  const steps = [...(state.flowSteps || []), step];
  const analysis = state.queryAnalysis;

  if (!analysis) {
    return {
      searchPlan: {
        primaryQuery: state.originalQuery,
        secondaryQueries: [],
        searchDepth: 'basic',
        maxResults: 5,
        topic: 'general',
      },
      flowSteps: steps.map(s => s.nodeId === 'planSearch' ? updateFlowStep(s, 'done') : s),
    };
  }

  try {
    const plan = await callLLM(
      state.hfToken, state.model,
      `You are a search strategist. Create an optimal search plan. Return ONLY JSON:
- primaryQuery: best reformulated search query in English
- secondaryQueries: 1-2 alternative queries
- searchDepth: "basic" or "advanced"
- maxResults: 5-10
- topic: "general", "news", or "finance"

Return ONLY JSON.`,
      `Query: "${state.originalQuery}"${state.selectedOption ? `\nUser chose: ${state.selectedOption}` : ''}
Analysis: ${JSON.stringify(analysis)}`,
      512
    );

    const parsed = extractJSON(plan);
    if (parsed) {
      return {
        searchPlan: parsed,
        flowSteps: steps.map(s => s.nodeId === 'planSearch' ? updateFlowStep(s, 'done', parsed.primaryQuery, `استعلام: ${parsed.primaryQuery}`) : s),
      };
    }
  } catch {}

  return {
    searchPlan: {
      primaryQuery: analysis.keywords.join(' '),
      secondaryQueries: [state.originalQuery],
      searchDepth: analysis.complexity === 'complex' ? 'advanced' : 'basic',
      maxResults: analysis.complexity === 'complex' ? 8 : 5,
      topic: 'general',
    },
    flowSteps: steps.map(s => s.nodeId === 'planSearch' ? updateFlowStep(s, 'done') : s),
  };
}

/*----------
 * 🧩 العقدة 4: تنفيذ البحث عبر Tavily
----------*/
async function executeSearch(state: SearchState): Promise<Partial<SearchState>> {
  const step = createFlowStep('executeSearch', 'Execute Search', 'تنفيذ البحث', '🌐', 'running');
  const steps = [...(state.flowSteps || []), step];
  const plan = state.searchPlan;

  if (!plan) {
    return {
      error: 'لا توجد خطة بحث',
      rawResults: [],
      tavilyAnswer: '',
      flowSteps: steps.map(s => s.nodeId === 'executeSearch' ? updateFlowStep(s, 'error', 'No plan') : s),
    };
  }

  try {
    const tvly = tavily({ apiKey: state.tavilyApiKey });
    const startTime = Date.now();

    const primaryResult = await tvly.search(plan.primaryQuery, {
      searchDepth: plan.searchDepth,
      maxResults: plan.maxResults,
      includeAnswer: true,
      topic: plan.topic as any,
    });

    let allResults = [...(primaryResult.results || [])];
    const answer = primaryResult.answer || '';

    // بحث ثانوي
    if (plan.secondaryQueries.length > 0 && state.queryAnalysis?.needsDeepSearch) {
      for (const sq of plan.secondaryQueries.slice(0, 1)) {
        try {
          const secondaryResult = await tvly.search(sq, { searchDepth: 'basic', maxResults: 3 });
          const existingUrls = new Set(allResults.map((r: any) => r.url));
          for (const r of secondaryResult.results || []) {
            if (!existingUrls.has(r.url)) allResults.push(r);
          }
        } catch {}
      }
    }

    const elapsed = (Date.now() - startTime) / 1000;

    return {
      rawResults: allResults,
      tavilyAnswer: answer,
      responseTime: elapsed,
      searchAttempt: (state.searchAttempt || 0) + 1,
      flowSteps: steps.map(s =>
        s.nodeId === 'executeSearch'
          ? updateFlowStep(s, 'done', `${allResults.length} results`, `${allResults.length} نتيجة في ${elapsed.toFixed(1)}ث`)
          : s
      ),
    };
  } catch (err: any) {
    return {
      error: `خطأ في البحث: ${err.message}`,
      rawResults: [],
      tavilyAnswer: '',
      flowSteps: steps.map(s => s.nodeId === 'executeSearch' ? updateFlowStep(s, 'error', err.message) : s),
    };
  }
}

/*----------
 * 🧩 العقدة 5: فلترة النتائج
----------*/
async function filterResults(state: SearchState): Promise<Partial<SearchState>> {
  const step = createFlowStep('filterResults', 'Filter Results', 'فلترة النتائج', '🔬', 'running');
  const steps = [...(state.flowSteps || []), step];
  const results = state.rawResults || [];

  if (results.length === 0) {
    return {
      filteredResults: [],
      filterSummary: 'لم يتم العثور على نتائج.',
      flowSteps: steps.map(s => s.nodeId === 'filterResults' ? updateFlowStep(s, 'done', '0 results', '0 نتائج') : s),
    };
  }

  const sorted = [...results].sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
  const filtered = sorted.filter((r: any) => {
    if ((r.content || '').length < 50) return false;
    if (r.score && r.score < 0.3) return false;
    return true;
  });

  const unique: any[] = [];
  const seenContent = new Set<string>();
  for (const r of filtered) {
    const key = (r.content || '').substring(0, 100).toLowerCase();
    if (!seenContent.has(key)) {
      seenContent.add(key);
      unique.push(r);
    }
  }

  const top = unique.slice(0, 8);

  return {
    filteredResults: top,
    filterSummary: `تم فلترة ${results.length} → ${top.length} نتائج عالية الجودة.`,
    flowSteps: steps.map(s =>
      s.nodeId === 'filterResults' ? updateFlowStep(s, 'done', `${top.length} filtered`, `${top.length} نتيجة مفلترة`) : s
    ),
  };
}

/*----------
 * 🔀 هل نحتاج إعادة بحث؟
----------*/
function shouldRetrySearch(state: SearchState): string {
  const results = state.filteredResults || [];
  if (results.length === 0 && (state.searchAttempt || 1) < 2) return 'retry';
  if (state.enableThinking) return 'thinkAndReason';
  return 'generateAnswer';
}

/*----------
 * 🧩 العقدة 6: التفكير العميق (مع toggle)
----------*/
async function thinkAndReason(state: SearchState): Promise<Partial<SearchState>> {
  const step = createFlowStep('thinkAndReason', 'Think & Reason', 'التفكير والتحليل', '🧠', 'running');
  const steps = [...(state.flowSteps || []), step];
  const results = state.filteredResults || [];

  if (results.length === 0) {
    return {
      reasoning: 'لا توجد نتائج كافية للتحليل.',
      flowSteps: steps.map(s => s.nodeId === 'thinkAndReason' ? updateFlowStep(s, 'skipped') : s),
    };
  }

  const context = results
    .slice(0, 6)
    .map((r: any, i: number) => `[مصدر ${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}`)
    .join('\n\n---\n\n');

  try {
    const reasoning = await callLLM(
      state.hfToken, state.model,
      `أنت محلل ذكي. حلل نتائج البحث واستخلص:
1. الأفكار الرئيسية المشتركة
2. أي تناقضات
3. مدى مصداقية المصادر
4. النقاط الأهم للمستخدم
5. هل نحتاج بحث إضافي؟

اكتب بإيجاز بالعربية.`,
      `السؤال: "${state.originalQuery}"\nالتحليل: ${JSON.stringify(state.queryAnalysis)}\n\nالنتائج:\n${context}`,
      1024
    );

    return {
      reasoning,
      flowSteps: steps.map(s => s.nodeId === 'thinkAndReason' ? updateFlowStep(s, 'done', 'Analysis complete', 'اكتمل التحليل') : s),
    };
  } catch {
    return {
      reasoning: 'تم تجاوز مرحلة التحليل.',
      flowSteps: steps.map(s => s.nodeId === 'thinkAndReason' ? updateFlowStep(s, 'skipped') : s),
    };
  }
}

/*----------
 * 🧩 العقدة 7: توليد الإجابة النهائية
----------*/
async function generateAnswer(state: SearchState): Promise<Partial<SearchState>> {
  const step = createFlowStep('generateAnswer', 'Generate Answer', 'توليد الإجابة', '✨', 'running');
  const steps = [...(state.flowSteps || []), step];
  const results = state.filteredResults || [];

  const context = results
    .slice(0, 8)
    .map((r: any, i: number) => `[${i + 1}] ${r.title}\n${r.content}\nURL: ${r.url}`)
    .join('\n\n');

  const analysisCtx = state.reasoning ? `\n\nالتحليل:\n${state.reasoning}` : '';
  const tavilyCtx = state.tavilyAnswer ? `\n\nإجابة أولية:\n${state.tavilyAnswer}` : '';

  try {
    const answer = await callLLM(
      state.hfToken, state.model,
      `أنت مساعد بحث ذكي. مهمتك:
- الإجابة بشمولية وتفصيل بناءً على نتائج البحث
- استخدم Markdown (عناوين، قوائم، كود بلوك، جداول)
- ابدأ بملخص ثم التفاصيل
- اذكر المصادر بأرقام [1], [2]...
- وضّح أي تناقضات
- اختم بخلاصة مفيدة
- اكتب بالعربية الفصحى`,
      `السؤال: "${state.originalQuery}"${tavilyCtx}${analysisCtx}\n\nنتائج البحث:\n${context}\n\nأعطني إجابة شاملة ومنسقة بالعربية.`,
      2048
    );

    return {
      finalAnswer: answer,
      flowSteps: steps.map(s => s.nodeId === 'generateAnswer' ? updateFlowStep(s, 'done', 'Answer ready', 'الإجابة جاهزة') : s),
    };
  } catch (err: any) {
    return {
      finalAnswer: state.reasoning || state.tavilyAnswer || 'لم نتمكن من توليد إجابة.',
      error: err.message,
      flowSteps: steps.map(s => s.nodeId === 'generateAnswer' ? updateFlowStep(s, 'error', err.message) : s),
    };
  }
}

/*----------
 * 🏗️ بناء الجراف
----------*/
function buildSearchGraph() {
  const graph = new StateGraph(SearchGraphState)
    .addNode('analyzeQuery', analyzeQuery)
    .addNode('askUserOptions', askUserOptions)
    .addNode('planSearch', planSearch)
    .addNode('executeSearch', executeSearch)
    .addNode('filterResults', filterResults)
    .addNode('thinkAndReason', thinkAndReason)
    .addNode('generateAnswer', generateAnswer)
    // التدفق
    .addEdge(START, 'analyzeQuery')
    .addConditionalEdges('analyzeQuery', routeAfterAnalysis, {
      askUserOptions: 'askUserOptions',
      planSearch: 'planSearch',
    })
    .addEdge('askUserOptions', END) // ينتظر رد المستخدم
    .addEdge('planSearch', 'executeSearch')
    .addEdge('executeSearch', 'filterResults')
    .addConditionalEdges('filterResults', shouldRetrySearch, {
      retry: 'planSearch',
      thinkAndReason: 'thinkAndReason',
      generateAnswer: 'generateAnswer',
    })
    .addEdge('thinkAndReason', 'generateAnswer')
    .addEdge('generateAnswer', END);

  return graph.compile();
}

/*----------
 * 🚀 الدالة الرئيسية: تشغيل بحث ذكي
----------*/
export async function runSmartSearch(params: {
  query: string;
  model?: string;
  hfToken: string;
  tavilyApiKey: string;
  enableThinking?: boolean;
  selectedOption?: string;
}) {
  const app = buildSearchGraph();

  const result = await app.invoke({
    originalQuery: params.query,
    model: params.model || 'meta-llama/Llama-3.3-70B-Instruct',
    hfToken: params.hfToken,
    tavilyApiKey: params.tavilyApiKey,
    enableThinking: params.enableThinking ?? true,
    queryAnalysis: null,
    userOptionsRequest: null,
    selectedOption: params.selectedOption || '',
    searchPlan: null,
    rawResults: [],
    tavilyAnswer: '',
    responseTime: 0,
    filteredResults: [],
    filterSummary: '',
    reasoning: '',
    finalAnswer: '',
    searchAttempt: 0,
    flowSteps: [],
    error: '',
  });

  return {
    answer: result.finalAnswer,
    results: result.filteredResults,
    reasoning: result.reasoning,
    queryAnalysis: result.queryAnalysis,
    searchPlan: result.searchPlan,
    filterSummary: result.filterSummary,
    tavilyAnswer: result.tavilyAnswer,
    responseTime: result.responseTime,
    flowSteps: result.flowSteps,
    userOptionsRequest: result.userOptionsRequest,
    error: result.error,
  };
}
