import { NextResponse } from 'next/server';

type ActionType = 'search' | 'extract' | 'crawl' | 'map' | 'research';

const TAVILY_BASE = 'https://api.tavily.com';

/*----------
 * واجهة التخاطب الرئيسية (API Route) للتواصل مع خدمات Tavily المختلفة (بحث، استخراج، زحف، خرائط، وبحث معمّق).
 * تستقبل طلبات POST من واجهة المستخدم وتمررها إلى خوادم Tavily بعد إرفاق مفتاح الـ API.
 * 
 * @param {Request} request الطلب الوارد من العميل، يحتوي على نوع الإجراء (action) والبيانات المطلوبة لكل إجراء.
 * @returns {NextResponse} استجابة JSON تحتوي إما على النتائج الراجعة من Tavily أو رسالة خطأ.
----------*/
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action: ActionType = body.action || 'search';

    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'لم يتم العثور على مفتاح Tavily API.' },
        { status: 500 }
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    };

    // ── Search ──
    if (action === 'search') {
      const {
        query,
        search_depth = 'advanced',
        include_answer = true,
        max_results = 10,
        include_domains,
        exclude_domains,
      } = body;

      if (!query) {
        return NextResponse.json({ error: 'الاستعلام مطلوب' }, { status: 400 });
      }

      const res = await fetch(`${TAVILY_BASE}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          search_depth,
          include_answer,
          include_images: true,
          max_results,
          ...(include_domains && Array.isArray(include_domains) && { include_domains }),
          ...(exclude_domains && Array.isArray(exclude_domains) && { exclude_domains }),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return NextResponse.json(
          { error: 'خطأ في Tavily Search', details: errData },
          { status: res.status }
        );
      }

      return NextResponse.json(await res.json());
    }

    // ── Extract ──
    if (action === 'extract') {
      const { urls, extract_depth = 'basic' } = body;

      if (!urls || (Array.isArray(urls) && urls.length === 0)) {
        return NextResponse.json({ error: 'يرجى إدخال رابط واحد على الأقل' }, { status: 400 });
      }

      const res = await fetch(`${TAVILY_BASE}/extract`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          urls: Array.isArray(urls) ? urls : [urls],
          extract_depth,
          include_images: true,
          format: 'markdown',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return NextResponse.json(
          { error: 'خطأ في Tavily Extract', details: errData },
          { status: res.status }
        );
      }

      return NextResponse.json(await res.json());
    }

    // ── Crawl ──
    if (action === 'crawl') {
      const {
        url,
        max_depth = 2,
        max_breadth = 10,
        limit = 20,
        instructions,
      } = body;

      if (!url) {
        return NextResponse.json({ error: 'يرجى إدخال رابط' }, { status: 400 });
      }

      const payload: Record<string, any> = {
        url,
        max_depth,
        max_breadth,
        limit,
        extract_depth: 'basic',
        format: 'markdown',
      };
      if (instructions) payload.instructions = instructions;

      const res = await fetch(`${TAVILY_BASE}/crawl`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return NextResponse.json(
          { error: 'خطأ في Tavily Crawl', details: errData },
          { status: res.status }
        );
      }

      return NextResponse.json(await res.json());
    }

    // ── Map ──
    if (action === 'map') {
      const {
        url,
        max_depth = 2,
        max_breadth = 20,
        limit = 50,
        instructions,
      } = body;

      if (!url) {
        return NextResponse.json({ error: 'يرجى إدخال رابط' }, { status: 400 });
      }

      const payload: Record<string, any> = {
        url,
        max_depth,
        max_breadth,
        limit,
      };
      if (instructions) payload.instructions = instructions;

      const res = await fetch(`${TAVILY_BASE}/map`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return NextResponse.json(
          { error: 'خطأ في Tavily Map', details: errData },
          { status: res.status }
        );
      }

      return NextResponse.json(await res.json());
    }

    // ── Research ──
    if (action === 'research') {
      const { query, model = 'auto' } = body;

      if (!query) {
        return NextResponse.json({ error: 'الاستعلام مطلوب' }, { status: 400 });
      }

      if (query.trim().length < 10) {
        return NextResponse.json(
          { error: 'يرجى إدخال موضوع بحث أكثر تفصيلاً (10 أحرف على الأقل)' },
          { status: 400 }
        );
      }

      // Step 1: Create the research task
      const createRes = await fetch(`${TAVILY_BASE}/research`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ input: query, model }),
      });

      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));

        // Handle specific Tavily error codes
        if (createRes.status === 432) {
          return NextResponse.json(
            {
              error: 'ميزة البحث المعمّق تتطلب خطة Tavily مدفوعة. يرجى ترقية حسابك على tavily.com أو استخدام ميزة البحث العادي.',
              details: errData,
            },
            { status: 432 }
          );
        }

        if (createRes.status === 401) {
          return NextResponse.json(
            { error: 'مفتاح API غير صالح. يرجى التحقق من إعدادات TAVILY_API_KEY.', details: errData },
            { status: 401 }
          );
        }

        const errorDetail = errData?.detail?.error || errData?.message || JSON.stringify(errData);
        return NextResponse.json(
          {
            error: `خطأ في إنشاء مهمة البحث المعمّق: ${errorDetail}`,
            details: errData,
          },
          { status: createRes.status }
        );
      }

      const taskData = await createRes.json();
      const requestId = taskData.request_id;

      if (!requestId) {
        return NextResponse.json(
          { error: 'لم يتم الحصول على معرّف المهمة من Tavily.' },
          { status: 500 }
        );
      }

      // Step 2: Poll for results (max ~90s with 3s interval = 30 polls)
      const MAX_POLLS = 30;
      for (let i = 0; i < MAX_POLLS; i++) {
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const pollRes = await fetch(`${TAVILY_BASE}/research/${requestId}`, {
          method: 'GET',
          headers,
        });

        if (!pollRes.ok) {
          // Continue polling on non-fatal errors
          if (pollRes.status >= 500) continue;
          const errData = await pollRes.json().catch(() => ({}));
          return NextResponse.json(
            { error: 'خطأ في استرجاع نتائج البحث المعمّق', details: errData },
            { status: pollRes.status }
          );
        }

        const pollData = await pollRes.json();

        if (pollData.status === 'completed') {
          // Normalize the response structure
          return NextResponse.json({
            request_id: pollData.request_id || requestId,
            status: 'completed',
            content: pollData.report || pollData.content || pollData.answer || '',
            sources: pollData.sources || pollData.citations || [],
            model: pollData.model || model,
            response_time: pollData.response_time,
            input: query,
          });
        }

        if (pollData.status === 'failed') {
          return NextResponse.json(
            { error: 'فشلت مهمة البحث المعمّق', details: pollData },
            { status: 500 }
          );
        }
        // still pending, continue polling
      }

      return NextResponse.json(
        { error: 'انتهت مهلة البحث المعمّق (90 ثانية). يرجى المحاولة مرة أخرى بموضوع أكثر تحديداً.' },
        { status: 504 }
      );
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'خطأ داخلي في الخادم', message: error.message },
      { status: 500 }
    );
  }
}
