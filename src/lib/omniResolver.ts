import fs from 'fs';
import path from 'path';

/*----------
 * 🧠 Omni Resolver (الموجه الذكي للنماذج)
 * يحاكي ميزة Omni في الهقنق فيس.
 * يقرأ سؤال المستخدم، ثم يختار أفضل نموذج من `models.json` مناسب للسؤال (مثلاً: برمجة، رياضيات، عام...).
 * 
 * @param {string} query - سؤال أو استعلام المستخدم.
 * @param {string} hfToken - مفتاح API الخاص بـ HuggingFace.
 * @returns {Promise<string>} يعود بـ ID النموذج الأنسب.
----------*/
export async function resolveOmniModel(query: string, hfToken: string): Promise<string> {
  try {
    // 1. قراءة النماذج المتاحة
    const filePath = path.join(process.cwd(), 'models.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const rawModels = JSON.parse(fileContent);

    // تجهيز قائمة مختصرة للنماذج لتوفير التوكنز (الاسم والاستخدام فقط)
    const availableModels = rawModels
      .filter((m: any) => m.name !== 'Omni') // استبعاد Omni نفسه
      .map((m: any) => ({
        id: m.name,
        usage: m.usage?.join(', ') || 'General',
        desc: m.description_en || ''
      }));

    // 2. صياغة الـ Prompt للموجه (Router Model)
    const systemPrompt = `You are the Omni Router for an AI application.
Your job is to read the user's query and select ONE best model from the provided list based on its capabilities (coding, math, general chat, vision, etc.).
You must ONLY output the exact 'id' of the chosen model. DO NOT output any other text, reasoning, or markdown.

Available Models:
${JSON.stringify(availableModels, null, 2)}

Guidelines:
- If coding or programming: choose a Coder model like "Qwen/Qwen3-Coder-Next" or "MiniMaxAI/MiniMax-M2.5".
- If math or logic: choose "deepseek-ai/DeepSeek-R1" or "Qwen/Qwen3.5-27B".
- If general arabic or complex question: choose "meta-llama/Llama-3.3-70B-Instruct" or "deepseek-ai/DeepSeek-V3".
- If quick chat: choose a fast/small model like "Qwen/Qwen2.5-7B-Instruct".
`;

    const userMessage = `User Query: "${query}"\n\nWhich model ID is the absolute best for this query? Return NOTHING but the exact string ID.`;

    // 3. استدعاء نموذج ذكي وسريع (مثل Llama 70B) لاتخاذ القرار
    const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/Llama-3.3-70B-Instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 30, // فقط نريد اسم النموذج
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.error('Omni resolution failed, falling back to Llama-3.3-70B-Instruct');
      return 'meta-llama/Llama-3.3-70B-Instruct'; // Fallback
    }

    const data = await response.json();
    let selectedModel = data.choices?.[0]?.message?.content?.trim();

    // تنظيم المخرج للتأكد من أنه ID صالح
    if (selectedModel && rawModels.some((m: any) => m.name === selectedModel)) {
      console.log(`[Omni Router] Selected model: ${selectedModel}`);
      return selectedModel;
    } else {
      // حاولت استخراج الاسم إذا كان هناك نص إضافي
      const matchedModel = rawModels.find((m: any) => selectedModel.includes(m.name));
      if (matchedModel && matchedModel.name !== 'Omni') {
        console.log(`[Omni Router] Selected model (matched): ${matchedModel.name}`);
        return matchedModel.name;
      }
    }

    return 'meta-llama/Llama-3.3-70B-Instruct'; // Default Fallback
  } catch (err) {
    console.error('Error in Omni Resolver:', err);
    return 'meta-llama/Llama-3.3-70B-Instruct'; // Default Fallback
  }
}
