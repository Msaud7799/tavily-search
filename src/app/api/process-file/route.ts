import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

/*----------
 * 📎 نقطة وصول معالجة الملفات في المحادثة
 * تستقبل ملف (نص/كود/صورة) وتعالجه لدمجه مع البروبت.
 * الصور تُحلل عبر نموذج VLM.
 *
 * @param {Request} request - FormData مع الملف
 * @returns تحليل الملف ومحتواه المعالج
----------*/

const VLM_MODELS = [
  'Qwen/Qwen2.5-VL-7B-Instruct',
  'meta-llama/Llama-4-Scout-17B-16E-Instruct',
];

const HF_URL = 'https://router.huggingface.co/v1/chat/completions';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مسجل الدخول' }, { status: 401 });
    }

    const body = await request.json();
    const { fileName, fileType, content, userQuery } = body;
    // content: base64 data URL for images, raw text for text/code
    // fileType: 'image' | 'text' | 'code'

    const hfToken = process.env.HF_TOKEN;
    if (!hfToken) {
      return NextResponse.json({ error: 'مفتاح HF مفقود' }, { status: 500 });
    }

    if (fileType === 'image') {
      // تحليل الصورة عبر VLM
      const imageUrl = content.startsWith('data:') ? content : `data:image/jpeg;base64,${content}`;
      let caption = '';
      let lastError = '';

      for (const model of VLM_MODELS) {
        try {
          const res = await fetch(HF_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${hfToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              messages: [{
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: userQuery
                      ? `${userQuery}\n\nDescribe this image in detail.`
                      : 'Describe this image in detail. Identify all objects, text, and notable features.',
                  },
                  {
                    type: 'image_url',
                    image_url: { url: imageUrl },
                  },
                ],
              }],
              max_tokens: 500,
              stream: false,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            caption = data?.choices?.[0]?.message?.content?.trim() || '';
            if (caption) break;
          } else {
            lastError = await res.text();
          }
        } catch (err: any) {
          lastError = err.message;
        }
      }

      return NextResponse.json({
        type: 'image',
        fileName,
        caption: caption || 'لم يتم تحليل الصورة',
        imageUrl: content,
        error: !caption ? lastError : undefined,
      });
    }

    // ملف نصي أو كود
    // نرجع المحتوى مباشرة (المعالجة تتم في الكلاينت عبر prepareAttachments)
    return NextResponse.json({
      type: fileType,
      fileName,
      content: content.substring(0, 50000), // حد أقصى 50k حرف
      preview: content.substring(0, 500),
      charCount: content.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'خطأ في معالجة الملف', message: error.message },
      { status: 500 },
    );
  }
}
