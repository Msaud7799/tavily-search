import { getSession } from "@/lib/auth";
import fs from "fs";
import path from "path";

/*----------
 * 🧠 Omni Resolver (الموجه الذكي للنماذج باستخدام Arch-Router)
 * يستخدم نموذج katanemo/Arch-Router-1.5B (أو الموجّه المتوفر) 
 * لتحليل الطلب واختيار المسار المناسب تلقائياً (البرمجة، الدردشة، إلخ).
 * 
 * يتم الآن قراءة المسارات من ملف خارجي (مثل routes.json) عند تحديده في البيئة.
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
3. You only response the id of the route that best matches the user's request, use the exact id or name in the <routes></routes>.

Based on your analysis, provide your response in the following JSON formats if you decide to match any route:
{"route": "route_id"}
`;

// إعدادات احتياطية في حالة لم يتم قراءة الملف
const FALLBACK_ROUTES_CONFIG = [
  {
    id: "coding",
    description: "Programming, debugging, code review, software architecture, and writing code in any language.",
    models: ["Qwen/Qwen2.5-Coder-32B-Instruct"], 
  },
  {
    id: "math_logic",
    description: "Mathematics, logic puzzles, calculations, deep reasoning, and analytical problem solving.",
    models: ["deepseek-ai/DeepSeek-R1"],
  },
  {
    id: "casual_conversation",
    description: "General chat, answering questions, writing essays, translations, summaries, and casual conversation.",
    models: ["meta-llama/Llama-3.3-70B-Instruct"],
  }
];

function loadRoutesConfig() {
  const routesPath = process.env.LLM_ROUTER_ROUTES_PATH;
  if (routesPath) {
    try {
      const fullPath = path.resolve(process.cwd(), routesPath);
      if (fs.existsSync(fullPath)) {
        const fileContent = fs.readFileSync(fullPath, 'utf8');
        const parsed = JSON.parse(fileContent);
        if (parsed && parsed.routes) {
          return { routes: parsed.routes, config: parsed.config || {} };
        }
      }
    } catch (e) {
      console.error("[Omni] Error loading routes.json:", e);
    }
  }
  return { routes: FALLBACK_ROUTES_CONFIG, config: {} }; 
}

function formatPrompt(routes: any[], conversation: any[]) {
  // نقوم بإخفاء النماذج (models) من الهيكل حتى لا يربك الراوتر، فقط نرسل الـ id والوصف
  const cleanRoutes = routes.map(r => ({ id: r.id || r.name, description: r.description }));
  return (
    TASK_INSTRUCTION
      .replace("{routes}", JSON.stringify(cleanRoutes, null, 2))
      .replace("{conversation}", JSON.stringify(conversation, null, 2))
    + FORMAT_PROMPT
  );
}

export async function resolveOmniModel(query: string, hfToken: string, chatHistory: any[] = []): Promise<string> {
  const { routes: configuredRoutes, config: routerConfig } = loadRoutesConfig();
  const fallbackModel = process.env.LLM_ROUTER_FALLBACK_MODEL || 'meta-llama/Llama-3.3-70B-Instruct';

  try {
    // 1. تحضير سجل المحادثة
    const recentHistory = chatHistory.slice(-5).map(m => {
      let textContent = "";
      if (typeof m.content === "string") {
        textContent = m.content;
      } else if (Array.isArray(m.content)) {
        // إذا كان مصفوفة وسائط (مثلاً صور + نص) استخرج النص فقط للراوتر
        const textObj = m.content.find((i: any) => i.type === "text");
        textContent = textObj ? textObj.text : "";
      }
      return {
        role: m.role,
        content: textContent.length > 500 ? textContent.substring(0, 500) + "..." : textContent
      };
    });
    recentHistory.push({ role: "user", content: query });

    // 2. صياغة الـ Prompt الخاص بـ Arch-Router
    const prompt = formatPrompt(configuredRoutes, recentHistory);

    const routerUrl = process.env.LLM_ROUTER_ARCH_BASE_URL || "https://router.huggingface.co/v1";
    const routerModel = process.env.LLM_ROUTER_ARCH_MODEL || "katanemo/Arch-Router-1.5B";
    const timeoutMs = parseInt(process.env.LLM_ROUTER_ARCH_TIMEOUT_MS || routerConfig.timeoutMs?.toString() || "10000");

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
      signal: AbortSignal.timeout(timeoutMs) 
    });

    if (!response.ok) {
      console.warn(`[Omni] Router HTTP error ${response.status}, falling back to ${fallbackModel}`);
      return fallbackModel;
    }

    const data = await response.json();
    let textResult = data.choices?.[0]?.message?.content?.trim() || "";

    // 4. استخراج المسار المحدد (JSON)
    let selectedRouteName = "other";
    try {
      const jsonMatch = textResult.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        let jsonStr = jsonMatch[0];
        // Fix single quotes for Python style dict strings
        if (!jsonStr.includes('"') && jsonStr.includes("'")) {
          jsonStr = jsonStr.replace(/'/g, '"');
        }
        const parsed = JSON.parse(jsonStr);
        if (parsed.route) {
          selectedRouteName = parsed.route;
        }
      }
    } catch {
      console.warn("[Omni] Failed to parse router JSON output:", textResult);
    }

    if (selectedRouteName === "other") {
      selectedRouteName = process.env.LLM_ROUTER_OTHER_ROUTE || routerConfig.fallbackRoute || "casual_conversation";
    }

    console.log(`[Omni] Router selected route: ${selectedRouteName}`);

    // العثور على النموذج المطابق للمسار
    const matchingRoute = configuredRoutes.find((r: any) => (r.id === selectedRouteName || r.name === selectedRouteName));
    
    // إذا وجدنا المسار ولديه قائمة نماذج نأخذ أول نموذج
    if (matchingRoute && matchingRoute.models && matchingRoute.models.length > 0) {
      return matchingRoute.models[0];
    } else if (matchingRoute && matchingRoute.primary_model) { // للحفاظ على التوافق القديم
      return matchingRoute.primary_model;
    }

    return fallbackModel;
  } catch (err) {
    console.warn('[Omni] Error routing conversation, using fallback.', err);
    return fallbackModel;
  }
}
