import { getSession } from "@/lib/auth";

/*----------
 * 🧠 Omni Resolver (الموجه الذكي للنماذج باستخدام Arch-Router)
 * يستخدم نموذج katanemo/Arch-Router-1.5B (أو الموجّه المتوفر) 
 * لتحليل الطلب واختيار المسار المناسب تلقائياً (البرمجة، الدردشة، إلخ).
 * 
 * @param {string} query - سؤال أو استعلام المستخدم.
 * @param {string} hfToken - مفتاح API الخاص بـ HuggingFace.
 * @param {any[]} chatHistory - سجل المحادثة لتوفير السياق.
 * @returns {Promise<string>} يعود بـ ID النموذج الأنسب.
 ----------*/

const TASK_INSTRUCTION = `You are a helpful assistant designed to find the best suited route.
You are provided with route description within <routes></routes> XML tags:

<routes>

{routes}

</routes>

<conversation>

{conversation}

</conversation>
`;

const FORMAT_PROMPT = `
Your task is to decide which route is best suit with user intent on the conversation in <conversation></conversation> XML tags.  Follow the instruction:
1. If the latest intent from user is irrelevant or user intent is full filled, response with other route {"route": "other"}.
2. You must analyze the route descriptions and find the best match route for user latest intent. 
3. You only response the name of the route that best matches the user's request, use the exact name in the <routes></routes>.

Based on your analysis, provide your response in the following JSON formats if you decide to match any route:
{"route": "route_name"}
`;

const ROUTES_CONFIG = [
  {
    name: "coding",
    description: "Programming, debugging, code review, software architecture, and writing code in any language.",
    primary_model: "Qwen/Qwen2.5-Coder-32B-Instruct", 
  },
  {
    name: "math_logic",
    description: "Mathematics, logic puzzles, calculations, deep reasoning, and analytical problem solving.",
    primary_model: "deepseek-ai/DeepSeek-R1",
  },
  {
    name: "casual_conversation",
    description: "General chat, answering questions, writing essays, translations, summaries, and casual conversation.",
    primary_model: "meta-llama/Llama-3.3-70B-Instruct",
  }
];

function formatPrompt(routes: any[], conversation: any[]) {
  // نقوم بإخفاء primary_model من الهيكل حتى لا يربك راوتر
  const cleanRoutes = routes.map(r => ({ name: r.name, description: r.description }));
  return (
    TASK_INSTRUCTION
      .replace("{routes}", JSON.stringify(cleanRoutes, null, 2))
      .replace("{conversation}", JSON.stringify(conversation, null, 2))
    + FORMAT_PROMPT
  );
}

export async function resolveOmniModel(query: string, hfToken: string, chatHistory: any[] = []): Promise<string> {
  const fallbackModel = process.env.LLM_ROUTER_FALLBACK_MODEL || 'meta-llama/Llama-3.3-70B-Instruct';

  try {
    // 1. تحضير سجل المحادثة
    const recentHistory = chatHistory.slice(-5).map(m => ({
      role: m.role,
      content: m.content.length > 500 ? m.content.substring(0, 500) + "..." : m.content
    }));
    recentHistory.push({ role: "user", content: query });

    // 2. صياغة الـ Prompt الخاص بـ Arch-Router
    const prompt = formatPrompt(ROUTES_CONFIG, recentHistory);

    const routerUrl = process.env.LLM_ROUTER_ARCH_BASE_URL || "https://router.huggingface.co/v1";
    const routerModel = process.env.LLM_ROUTER_ARCH_MODEL || "meta-llama/Llama-3.3-70B-Instruct";

    // 3. استدعاء الموجه الذكي
    const response = await fetch(`${routerUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: routerModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 32, // JSON قصير جدًا
        temperature: 0,
      }),
      // تحديد المهلة الافتراضية بـ 10 ثواني كحد أقصى للتوجيه
      signal: AbortSignal.timeout(parseInt(process.env.LLM_ROUTER_ARCH_TIMEOUT_MS || "10000")) 
    });

    if (!response.ok) {
      console.warn(`[Omni] Router HTTP error ${response.status}, falling back to ${fallbackModel}`);
      return fallbackModel;
    }

    const data = await response.json();
    let textResult = data.choices?.[0]?.message?.content?.trim() || "";

    // 4. استخراج المسار المحدد (JSON)
    let selectedRouteName = "casual_conversation";
    try {
      // قد يضيف النموذج text حول الـ JSON لذا نبحث عنه باستخدام Regex أو JSON.parse
      const jsonMatch = textResult.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.route) {
          selectedRouteName = parsed.route;
        }
      }
    } catch {
      console.warn("[Omni] Failed to parse router JSON output:", textResult);
    }

    if (selectedRouteName === "other") {
      selectedRouteName = process.env.LLM_ROUTER_OTHER_ROUTE || "casual_conversation";
    }

    console.log(`[Omni] Router selected route: ${selectedRouteName}`);

    // العثور على النموذج المطابق للمسار
    const matchingRoute = ROUTES_CONFIG.find(r => r.name === selectedRouteName);
    if (matchingRoute && matchingRoute.primary_model) {
      return matchingRoute.primary_model;
    }

    return fallbackModel;
  } catch (err) {
    console.warn('[Omni] Error routing conversation, using fallback.', err);
    return fallbackModel;
  }
}
