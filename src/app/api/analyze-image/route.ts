import { NextResponse } from 'next/server';

// VLM models to try in order (from user's available HF Router models)
const VLM_MODELS = [
  'Qwen/Qwen2.5-VL-7B-Instruct',
  'Qwen/Qwen3-VL-8B-Instruct',
  'meta-llama/Llama-4-Scout-17B-16E-Instruct',
];

const LLM_MODEL = 'meta-llama/Llama-3.3-70B-Instruct';
const HF_ROUTER_URL = 'https://router.huggingface.co/v1/chat/completions';

/*----------
 * دالة استقبال و تحليل الصور عبر نماذج الرؤية (Vision Models).
 * تأخذ الصورة وتستخرج منها وصفاً مفصلاً، ثم تُحول هذا الوصف إلى جملة استعلام مرئي دقيقة عبر LLM.
 *
 * @param {Request} request - كائن الطلب الذي يحتوي على الصورة (بصيغة Base64)، الاستعلام الإضافي، واسم النموذج.
 * @returns {NextResponse} تُرجع الوصف الدقيق للصورة وجملة الاستعلام المُحسنة الناتجة من التحليل.
----------*/
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { image, userQuery, model } = body; // image = base64 data URL string

    const hfToken = process.env.HF_TOKEN;
    const hfTokenFallback = process.env.HF_TOKEN_FALLBACK;

    if (!hfToken) {
      return NextResponse.json(
        { error: 'لم يتم العثور على مفتاح HuggingFace.' },
        { status: 500 }
      );
    }

    if (!image) {
      return NextResponse.json(
        { error: 'يرجى رفع صورة.' },
        { status: 400 }
      );
    }

    // Ensure image is a proper data URL for the VLM
    const imageUrl = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;

    // Step 1: Send image to VLM for captioning via HF Router
    let caption = '';
    let lastError = '';
    const tokens = [hfToken, hfTokenFallback].filter(Boolean) as string[];
    
    // Add the user's selected model to the VERY TOP of the priority list
    const initialModel = model === 'Omni' ? null : model;
    const modelsToTry = Array.from(new Set([initialModel, ...VLM_MODELS].filter(Boolean)));

    for (const currentModel of modelsToTry) {
      if (caption) break;

      for (const token of tokens) {
        try {
          const captionRes = await fetch(HF_ROUTER_URL, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: 'Describe this image in detail. Identify all objects, people, vehicles, animals, text, brands, logos, and any notable features. Be very specific and descriptive.',
                    },
                    {
                      type: 'image_url',
                      image_url: { url: imageUrl },
                    },
                  ],
                },
              ],
              max_tokens: 300,
              stream: false,
            }),
          });

          if (captionRes.ok) {
            const captionData = await captionRes.json();
            const result = captionData?.choices?.[0]?.message?.content?.trim();
            if (result) {
              caption = result;
              break;
            }
          } else {
            const errText = await captionRes.text();
            lastError = `${model}: ${errText}`;
          }
        } catch (err: any) {
          lastError = `${model}: ${err.message}`;
        }
      }
    }

    if (!caption) {
      return NextResponse.json(
        {
          error: 'فشل في تحليل الصورة. يرجى المحاولة مرة أخرى.',
          details: lastError,
        },
        { status: 500 }
      );
    }

    // Step 2: Use Llama 3.3 to convert detailed caption to an optimized search query
    let optimizedQuery = caption;

    try {
      const systemPrompt = `You are a search query optimizer. Given an image description (and optionally a user's question), create the BEST possible web search query to find relevant information. Rules:
1. Output ONLY the search query, nothing else.
2. Make it concise but specific (3-8 words).
3. If the user provided additional text, incorporate it.
4. Focus on the most distinctive and searchable aspects (brand names, specific objects, locations).
5. Use English for the search query for better results.`;

      const userMessage = userQuery
        ? `Image description: "${caption}"\nUser's additional query: "${userQuery}"\n\nCreate the best search query:`
        : `Image description: "${caption}"\n\nCreate the best search query:`;

      const llmRes = await fetch(HF_ROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${hfToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: LLM_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          max_tokens: 100,
          temperature: 0.3,
          stream: false,
        }),
      });

      if (llmRes.ok) {
        const llmData = await llmRes.json();
        const queryResult =
          llmData.choices?.[0]?.message?.content?.trim() || '';
        if (queryResult) {
          optimizedQuery = queryResult.replace(/^["']|["']$/g, '');
        }
      }
    } catch {
      // If LLM fails, use the raw caption as fallback
    }

    return NextResponse.json({
      caption,
      optimizedQuery,
      userQuery: userQuery || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'خطأ داخلي في تحليل الصورة', message: error.message },
      { status: 500 }
    );
  }
}
