import { NextResponse } from 'next/server';
import { runSmartSearch } from '@/lib/searchGraph';
import { resolveOmniModel } from '@/lib/omniResolver';

/*----------
 * 🧠 نقطة وصول البحث الذكي بـ LangGraph (Smart Search API)
 * تستقبل استعلام المستخدم وتشغّل جراف التفكير الكامل:
 *   تحليل → [خيارات؟] → تخطيط → بحث → فلترة → [تفكير؟] → إجابة
 *
 * @param {Request} request - يحتوي على query, model, enableThinking, selectedOption
 * @returns {NextResponse} الإجابة مع النتائج والتحليلات وخطوات التدفق.
----------*/
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, model, enableThinking, selectedOption } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'الرجاء إدخال استعلام البحث.' },
        { status: 400 }
      );
    }

    const hfToken = process.env.HF_TOKEN;
    const tavilyApiKey = process.env.TAVILY_API_KEY;

    if (!hfToken) {
      return NextResponse.json(
        { error: 'مفتاح HuggingFace غير موجود.' },
        { status: 500 }
      );
    }

    if (!tavilyApiKey) {
      return NextResponse.json(
        { error: 'مفتاح Tavily غير موجود.' },
        { status: 500 }
      );
    }

    const startTime = Date.now();
    
    // Omni model selection
    let selectedModel = model || 'meta-llama/Llama-3.3-70B-Instruct';
    if (selectedModel === 'Omni') {
      selectedModel = await resolveOmniModel(query, hfToken);
    }

    const result = await runSmartSearch({
      query,
      model: selectedModel,
      hfToken,
      tavilyApiKey,
      enableThinking: enableThinking !== false,
      selectedOption: selectedOption || '',
    });

    const totalTime = (Date.now() - startTime) / 1000;

    return NextResponse.json({
      answer: result.answer,
      results: result.results,
      reasoning: result.reasoning,
      queryAnalysis: result.queryAnalysis,
      searchPlan: result.searchPlan,
      filterSummary: result.filterSummary,
      tavilyAnswer: result.tavilyAnswer,
      responseTime: result.responseTime,
      totalTime,
      flowSteps: result.flowSteps,
      userOptionsRequest: result.userOptionsRequest,
      error: result.error || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'خطأ داخلي في البحث الذكي', message: error.message },
      { status: 500 }
    );
  }
}
