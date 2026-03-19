import { NextResponse } from 'next/server';

type ActionType = 'search' | 'extract' | 'crawl' | 'map' | 'research';

const TAVILY_BASE = 'https://api.tavily.com';

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

      // Step 1: Create the research task
      const createRes = await fetch(`${TAVILY_BASE}/research`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ input: query, model }),
      });

      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        return NextResponse.json(
          { error: 'خطأ في إنشاء مهمة البحث المتعمق', details: errData },
          { status: createRes.status }
        );
      }

      const taskData = await createRes.json();
      const requestId = taskData.request_id;

      // Step 2: Poll for results (max ~120s with 3s interval)
      const MAX_POLLS = 40;
      for (let i = 0; i < MAX_POLLS; i++) {
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const pollRes = await fetch(`${TAVILY_BASE}/research/${requestId}`, {
          method: 'GET',
          headers,
        });

        if (!pollRes.ok) continue;

        const pollData = await pollRes.json();

        if (pollData.status === 'completed') {
          return NextResponse.json(pollData);
        }
        if (pollData.status === 'failed') {
          return NextResponse.json(
            { error: 'فشلت مهمة البحث المتعمق', details: pollData },
            { status: 500 }
          );
        }
        // still pending, continue polling
      }

      return NextResponse.json(
        { error: 'انتهت مهلة البحث المتعمق. يرجى المحاولة مرة أخرى.' },
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
