import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import { tavily } from '@tavily/core';

/*----------
 * ═══════════════════════════════════════════════════════════════════════
 *  🧠 محرك البحث الذكي بـ LangGraph
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  هذا الملف يُعرّف "جراف تفكير" (Thinking Graph) مبني على LangGraph.
 *  يمر:
 *    1️⃣  تحليل السؤال (analyzeQuery)      → فهم القصد ونوع المعلومة المطلوبة
 *    2️⃣  تخطيط البحث  (planSearch)         → وضع خطة بحث ذكية
 *    3️⃣  تنفيذ البحث  (executeSearch)      → البحث عبر Tavily API
 *    4️⃣  فلترة النتائج (filterResults)     → تنقية وترتيب النتائج
 *    5️⃣  التفكير والتحليل (thinkAndReason) → التأمل العميق في النتائج
 *    6️⃣  توليد الإجابة (generateAnswer)    → كتابة إجابة شاملة ومنسقة
 *
 *  الجراف يقرر تلقائياً إذا يحتاج بحث ثاني (إعادة بحث) أو يكتفي.
 * ═══════════════════════════════════════════════════════════════════════
----------*/

/*----------
 * 📐 تعريف حالة الجراف (Graph State)
 * كل عقدة (Node) تقرأ وتكتب في هذه الحالة المشتركة.
----------*/
const SearchGraphState = Annotation.Root({
  // المدخلات الأساسية
  originalQuery: Annotation<string>,
  model: Annotation<string>,
  hfToken: Annotation<string>,
  tavilyApiKey: Annotation<string>,

  // نتائج التحليل
  queryAnalysis: Annotation<{
    intent: string;
    type: string;
    keywords: string[];
    language: string;
    complexity: 'simple' | 'medium' | 'complex';
    needsDeepSearch: boolean;
  } | null>,

  // خطة البحث
  searchPlan: Annotation<{
    primaryQuery: string;
    secondaryQueries: string[];
    searchDepth: 'basic' | 'advanced';
    maxResults: number;
    topic: string;
  } | null>,

  // نتائج البحث الخام
  rawResults: Annotation<any[]>,
  tavilyAnswer: Annotation<string>,
  responseTime: Annotation<number>,

  // النتائج المفلترة
  filteredResults: Annotation<any[]>,
  filterSummary: Annotation<string>,

  // التفكير والتحليل
  reasoning: Annotation<string>,

  // الإجابة النهائية
  finalAnswer: Annotation<string>,

  // حالة تشغيلية
  searchAttempt: Annotation<number>,
  error: Annotation<string>,
});

type SearchState = typeof SearchGraphState.State;

/*----------
 * 🔧 دالة مساعدة: إرسال طلب لنموذج اللغة عبر HuggingFace
----------*/
async function callLLM(
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
    throw new Error(`HuggingFace API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/*----------
 * 🧩 العقدة الأولى: تحليل السؤال (Query Analysis Node)
 * تفهم القصد من السؤال ونوعه ولغته ومستوى تعقيده.
----------*/
async function analyzeQuery(state: SearchState): Promise<Partial<SearchState>> {
  try {
    const analysis = await callLLM(
      state.hfToken,
      state.model,
      `You are a query analyzer. Analyze the user's search query and return ONLY valid JSON.
Determine:
- intent: what the user wants (informational, navigational, transactional, comparison)
- type: question, topic, entity, how-to, news, opinion
- keywords: array of 3-5 essential keywords for search
- language: detected language code (ar, en, etc.)
- complexity: simple, medium, or complex
- needsDeepSearch: true/false

Return ONLY a JSON object, no markdown, no explanation.`,
      `Query: "${state.originalQuery}"`,
      512
    );

    // استخراج JSON من الرد
    const jsonMatch = analysis.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return { queryAnalysis: parsed };
    }

    // إذا فشل التحليل، نستخدم قيم افتراضية ذكية
    return {
      queryAnalysis: {
        intent: 'informational',
        type: 'question',
        keywords: state.originalQuery.split(' ').slice(0, 5),
        language: /[\u0600-\u06FF]/.test(state.originalQuery) ? 'ar' : 'en',
        complexity: 'medium',
        needsDeepSearch: state.originalQuery.split(' ').length > 5,
      },
    };
  } catch {
    return {
      queryAnalysis: {
        intent: 'informational',
        type: 'question',
        keywords: state.originalQuery.split(' ').slice(0, 5),
        language: /[\u0600-\u06FF]/.test(state.originalQuery) ? 'ar' : 'en',
        complexity: 'medium',
        needsDeepSearch: false,
      },
    };
  }
}

/*----------
 * 🧩 العقدة الثانية: تخطيط البحث (Search Planning Node)
 * تبني خطة بحث استراتيجية بناءً على تحليل السؤال.
----------*/
async function planSearch(state: SearchState): Promise<Partial<SearchState>> {
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
    };
  }

  try {
    const plan = await callLLM(
      state.hfToken,
      state.model,
      `You are a search strategist. Based on the query analysis, create an optimal search plan.
Return ONLY valid JSON with:
- primaryQuery: the best reformulated search query in English for maximum results
- secondaryQueries: array of 1-2 alternative search queries for broader coverage
- searchDepth: "basic" or "advanced"
- maxResults: number between 5-10
- topic: "general", "news", or "finance"

Return ONLY JSON, no markdown.`,
      `Original query: "${state.originalQuery}"
Analysis: ${JSON.stringify(analysis)}`,
      512
    );

    const jsonMatch = plan.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return { searchPlan: parsed };
    }
  } catch {}

  // خطة احتياطية ذكية
  const isComplex = analysis.complexity === 'complex';
  return {
    searchPlan: {
      primaryQuery: analysis.keywords.join(' '),
      secondaryQueries: [state.originalQuery],
      searchDepth: isComplex ? 'advanced' : 'basic',
      maxResults: isComplex ? 8 : 5,
      topic: 'general',
    },
  };
}

/*----------
 * 🧩 العقدة الثالثة: تنفيذ البحث (Search Execution Node)
 * تنفذ البحث عبر Tavily API باستخدام الخطة المعدة.
----------*/
async function executeSearch(state: SearchState): Promise<Partial<SearchState>> {
  const plan = state.searchPlan;
  if (!plan) {
    return { error: 'لا توجد خطة بحث', rawResults: [], tavilyAnswer: '' };
  }

  try {
    const tvly = tavily({ apiKey: state.tavilyApiKey });

    // البحث الأساسي
    const startTime = Date.now();
    const primaryResult = await tvly.search(plan.primaryQuery, {
      searchDepth: plan.searchDepth,
      maxResults: plan.maxResults,
      includeAnswer: true,
      topic: plan.topic as any,
    });

    let allResults = [...(primaryResult.results || [])];
    const answer = primaryResult.answer || '';

    // بحث ثانوي للتغطية الأوسع (إذا كان السؤال معقد)
    if (plan.secondaryQueries.length > 0 && state.queryAnalysis?.needsDeepSearch) {
      for (const sq of plan.secondaryQueries.slice(0, 1)) {
        try {
          const secondaryResult = await tvly.search(sq, {
            searchDepth: 'basic',
            maxResults: 3,
          });
          // إضافة نتائج جديدة فقط (بدون تكرار)
          const existingUrls = new Set(allResults.map((r: any) => r.url));
          for (const r of secondaryResult.results || []) {
            if (!existingUrls.has(r.url)) {
              allResults.push(r);
            }
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
    };
  } catch (err: any) {
    return {
      error: `خطأ في البحث: ${err.message}`,
      rawResults: [],
      tavilyAnswer: '',
    };
  }
}

/*----------
 * 🧩 العقدة الرابعة: فلترة النتائج (Result Filtering Node)
 * تنقي النتائج وترتبها حسب الجودة والصلة.
----------*/
async function filterResults(state: SearchState): Promise<Partial<SearchState>> {
  const results = state.rawResults || [];
  if (results.length === 0) {
    return { filteredResults: [], filterSummary: 'لم يتم العثور على نتائج.' };
  }

  // ترتيب حسب Score
  const sorted = [...results].sort((a: any, b: any) => (b.score || 0) - (a.score || 0));

  // فلترة النتائج ذات الجودة المنخفضة
  const filtered = sorted.filter((r: any) => {
    const content = r.content || '';
    // استبعاد النتائج القصيرة جداً
    if (content.length < 50) return false;
    // استبعاد النتائج ذات Score منخفض جداً
    if (r.score && r.score < 0.3) return false;
    return true;
  });

  // إزالة التكرار بناءً على المحتوى المتشابه
  const unique: any[] = [];
  const seenContent = new Set<string>();
  for (const r of filtered) {
    const contentKey = (r.content || '').substring(0, 100).toLowerCase();
    if (!seenContent.has(contentKey)) {
      seenContent.add(contentKey);
      unique.push(r);
    }
  }

  const topResults = unique.slice(0, 8);

  return {
    filteredResults: topResults,
    filterSummary: `تم فلترة ${results.length} نتيجة إلى ${topResults.length} نتائج عالية الجودة.`,
  };
}

/*----------
 * 🧩 العقدة الخامسة: التفكير والتحليل (Think & Reason Node)
 * تحلل النتائج بعمق وتستخلص الأفكار الرئيسية والعلاقات.
----------*/
async function thinkAndReason(state: SearchState): Promise<Partial<SearchState>> {
  const results = state.filteredResults || [];
  if (results.length === 0) {
    return { reasoning: 'لا توجد نتائج كافية للتحليل.' };
  }

  const context = results
    .slice(0, 6)
    .map((r: any, i: number) => `[مصدر ${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}`)
    .join('\n\n---\n\n');

  try {
    const reasoning = await callLLM(
      state.hfToken,
      state.model,
      `أنت محلل ذكي. قم بتحليل نتائج البحث واستخلص:
1. الأفكار الرئيسية المشتركة بين المصادر
2. أي تناقضات أو اختلافات في المعلومات
3. مدى مصداقية وجودة المصادر
4. النقاط الأكثر أهمية للمستخدم
5. هل المعلومات كافية للإجابة الشاملة أم نحتاج بحث إضافي؟

اكتب تحليلك بإيجاز وبالعربية.`,
      `السؤال الأصلي: "${state.originalQuery}"
تحليل السؤال: ${JSON.stringify(state.queryAnalysis)}

نتائج البحث:
${context}`,
      1024
    );

    return { reasoning };
  } catch {
    return { reasoning: 'تم تجاوز مرحلة التحليل. سيتم الإجابة مباشرة.' };
  }
}

/*----------
 * 🧩 العقدة السادسة: توليد الإجابة النهائية (Answer Generation Node)
 * تجمع كل شيء وتولد إجابة شاملة ومنسقة بشكل جميل.
----------*/
async function generateAnswer(state: SearchState): Promise<Partial<SearchState>> {
  const results = state.filteredResults || [];

  const context = results
    .slice(0, 8)
    .map((r: any, i: number) => `[${i + 1}] ${r.title}\n${r.content}\nURL: ${r.url}`)
    .join('\n\n');

  const systemPrompt = `أنت مساعد بحث ذكي ومتقدم. مهمتك:
- الإجابة بشكل شامل ومفصل بناءً على نتائج البحث والتحليل
- استخدم تنسيق Markdown جميل (عناوين، قوائم، نقاط، جداول عند الحاجة)
- ابدأ بملخص موجز ثم التفاصيل
- اذكر المصادر بأرقام مرتبطة [1], [2]...
- إذا كان هناك تناقضات بين المصادر، وضّحها
- اختم بخلاصة مفيدة
- أكتب بالعربية الفصحى الواضحة
- اجعل الإجابة غنية ومفيدة وليست مجرد نسخ ولصق`;

  const analysisContext = state.reasoning ? `\n\nالتحليل المبدئي:\n${state.reasoning}` : '';
  const tavilyContext = state.tavilyAnswer ? `\n\nإجابة أولية:\n${state.tavilyAnswer}` : '';

  try {
    const answer = await callLLM(
      state.hfToken,
      state.model,
      systemPrompt,
      `السؤال: "${state.originalQuery}"
${tavilyContext}
${analysisContext}

نتائج البحث المفلترة:
${context}

أعطني إجابة شاملة ومنسقة بشكل جميل بالعربية.`,
      2048
    );

    return { finalAnswer: answer };
  } catch (err: any) {
    // إذا فشل النموذج، نرجع إجابة من التحليل
    return {
      finalAnswer: state.reasoning || state.tavilyAnswer || 'لم نتمكن من توليد إجابة.',
      error: err.message,
    };
  }
}

/*----------
 * 🔀 دالة التوجيه الشرطي: هل نحتاج بحث إضافي؟
 * تقرر إذا كنا نحتاج إعادة بحث بصياغة مختلفة أو نكمل.
----------*/
function shouldRetrySearch(state: SearchState): string {
  const results = state.filteredResults || [];
  const attempt = state.searchAttempt || 1;

  // إذا ما فيه نتائج وما جربنا أكثر من مرة
  if (results.length === 0 && attempt < 2) {
    return 'retry';
  }

  return 'continue';
}

/*----------
 * 🏗️ بناء وتجميع الجراف (Build & Compile Graph)
----------*/
function buildSearchGraph() {
  const graph = new StateGraph(SearchGraphState)
    .addNode('analyzeQuery', analyzeQuery)
    .addNode('planSearch', planSearch)
    .addNode('executeSearch', executeSearch)
    .addNode('filterResults', filterResults)
    .addNode('thinkAndReason', thinkAndReason)
    .addNode('generateAnswer', generateAnswer)
    .addEdge(START, 'analyzeQuery')
    .addEdge('analyzeQuery', 'planSearch')
    .addEdge('planSearch', 'executeSearch')
    .addEdge('executeSearch', 'filterResults')
    .addConditionalEdges('filterResults', shouldRetrySearch, {
      retry: 'planSearch',
      continue: 'thinkAndReason',
    })
    .addEdge('thinkAndReason', 'generateAnswer')
    .addEdge('generateAnswer', END);

  return graph.compile();
}

/*----------
 * 🚀 الدالة الرئيسية: تشغيل بحث ذكي
 * @param query - استعلام المستخدم
 * @param model - معرف نموذج اللغة
 * @param hfToken - مفتاح HuggingFace
 * @param tavilyApiKey - مفتاح Tavily
----------*/
export async function runSmartSearch(params: {
  query: string;
  model?: string;
  hfToken: string;
  tavilyApiKey: string;
}) {
  const app = buildSearchGraph();

  const result = await app.invoke({
    originalQuery: params.query,
    model: params.model || 'meta-llama/Llama-3.3-70B-Instruct',
    hfToken: params.hfToken,
    tavilyApiKey: params.tavilyApiKey,
    queryAnalysis: null,
    searchPlan: null,
    rawResults: [],
    tavilyAnswer: '',
    responseTime: 0,
    filteredResults: [],
    filterSummary: '',
    reasoning: '',
    finalAnswer: '',
    searchAttempt: 0,
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
    error: result.error,
  };
}
