import { Client } from "langsmith";

// استخدام المفاتيح الصحيحة
export const langsmithClient = new Client({
  apiKey: process.env.LANGCHAIN_API_KEY,
});

export async function traceAIAction(
  runName: string,
  query: string,
  modelUsed: string,
  response: any,
  duration: number
) {
  try {
    if (!process.env.LANGCHAIN_API_KEY) return;
    
    await langsmithClient.createRun({
      name: runName,
      project_name: process.env.LANGCHAIN_PROJECT || "tavily-app",
      run_type: "llm", // لتوضيح أنه استدعاء للذكاء الاصطناعي
      inputs: { query, model: modelUsed },
      outputs: { response },
      end_time: Date.now(),
      start_time: Date.now() - duration,
    });
  } catch (error) {
    console.error("LangSmith trace error:", error);
  }
}
