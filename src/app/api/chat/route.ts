import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Chat from "@/models/Chat";
import { NextResponse } from "next/server";
import { getOpenAiToolsForMcp } from "@/lib/server/mcp/tools";
import { invokeMcpTool } from "@/lib/server/textGeneration/mcp/toolInvocation";
import { resolveOmniModel } from "@/lib/omniResolver";

type ChatRole = "user" | "assistant";

interface ChatMessageInput {
  role: ChatRole;
  content: string;
}

function buildTitleFromFirstMessage(content: string): string {
  const trimmed = content.trim().replace(/\s+/g, " ");
  if (!trimmed) return "محادثة جديدة";
  return trimmed.length > 40 ? `${trimmed.slice(0, 40)}...` : trimmed;
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      chatId,
      message,
      model,
      enableThinking,
      aboutMe,
      aiInstructions,
      followMode,
      instructionFileContent,
      mcpServers,
    }: {
      chatId?: string;
      message: string;
      model?: string;
      enableThinking?: boolean;
      aboutMe?: string;
      aiInstructions?: string;
      followMode?: string;
      instructionFileContent?: string;
      mcpServers?: any[];
    } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { message: "Message is required" },
        { status: 400 },
      );
    }

    const hfToken = process.env.HF_TOKEN;
    if (!hfToken) {
      return NextResponse.json(
        { message: "HF_TOKEN missing" },
        { status: 500 },
      );
    }

    await connectToDatabase();

    let selectedModel = model || "Omni";

    const userMessage: ChatMessageInput = {
      role: "user",
      content: message.trim(),
    };

    const chat = chatId
      ? await Chat.findOne({ _id: chatId, userId: session.userId })
      : null;

    const messagesForModel: {
      role: "system" | "user" | "assistant";
      content: string;
    }[] = [];

    // ── Build system prompt with user's AI instructions ──
    let systemPromptParts: string[] = [];

    // Base behavior
    if (enableThinking) {
      systemPromptParts.push(`You are a helpful assistant. Think step-by-step, but put all your reasoning inside <think>...</think>. Then provide the final answer in Arabic using Markdown.`);
    } else {
      systemPromptParts.push(`You are a helpful assistant. Provide the final answer in Arabic using Markdown.`);
    }

    // About Me context
    if (aboutMe && aboutMe.trim()) {
      systemPromptParts.push(`\n--- معلومات عن المستخدم ---\n${aboutMe.trim()}`);
    }

    // Custom AI instructions
    if (aiInstructions && aiInstructions.trim()) {
      systemPromptParts.push(`\n--- تعليمات مخصصة من المستخدم ---\nيجب عليك اتباع هذه التعليمات:\n${aiInstructions.trim()}`);
    }

    // Instruction file content
    if (instructionFileContent && instructionFileContent.trim()) {
      if (followMode === "must-follow") {
        systemPromptParts.push(`\n--- ملف تعليمات إلزامي ---\nيجب عليك اتباع هذه التعليمات بدقة:\n${instructionFileContent.trim()}`);
      } else if (followMode === "ignore") {
        // Don't include file instructions
      } else {
        // auto mode - AI decides
        systemPromptParts.push(`\n--- ملف تعليمات إرشادي ---\nالتعليمات التالية للاسترشاد بها حسب السياق (استخدمها إن كانت مناسبة):\n${instructionFileContent.trim()}`);
      }
    }

    const systemPrompt = systemPromptParts.join("\n");
    messagesForModel.push({ role: "system", content: systemPrompt });

    if (chat?.messages?.length) {
      for (const m of chat.messages) {
        messagesForModel.push({
          role: m.role as "user" | "assistant",
          content: m.content,
        });
      }
    }
    messagesForModel.push({ role: "user", content: userMessage.content });

    const activeServers = (mcpServers || []).filter(s => !s.disabled);
    const { tools: mcpTools, mapping: toolMapping } = activeServers.length 
      ? await getOpenAiToolsForMcp(activeServers)
      : { tools: [], mapping: {} };

    const requestBody: any = {
      model: selectedModel,
      messages: messagesForModel,
      max_tokens: 3000,
      stream: false,
    };

    if (mcpTools.length > 0) {
      requestBody.tools = mcpTools;
      requestBody.tool_choice = "auto";
    }

    if (selectedModel === "Omni") {
      selectedModel = await resolveOmniModel(message, hfToken, messagesForModel);
      requestBody.model = selectedModel;
    }

    let hfRes = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hfToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    let hfData = await hfRes.json().catch(() => ({}));

    if (!hfRes.ok) {
      return NextResponse.json(
        { message: "HuggingFace API error", details: hfData },
        { status: hfRes.status },
      );
    }

    let assistantMessageObj = hfData?.choices?.[0]?.message;

    // --- حلقة تنفيذ أدوات MCP إذا طلب النموذج ذلك ---
    let loopCount = 0;
    while (assistantMessageObj?.tool_calls?.length > 0 && loopCount < 5) {
      loopCount++;
      // إضافة رسالة المساعد التي تحتوي على tool_calls
      messagesForModel.push(assistantMessageObj);

      for (const tcall of assistantMessageObj.tool_calls) {
        try {
          const fnName = tcall.function.name;
          const mapInfo = toolMapping[fnName];

          if (mapInfo) {
            const serverConfig = activeServers.find((s: any) => s.name === mapInfo.server);
            const args = JSON.parse(tcall.function.arguments || "{}");
            
            // تنفيذ الأداة فعلياً
            const toolResult = await invokeMcpTool(serverConfig, mapInfo.tool, args);
            messagesForModel.push({ 
              role: "tool", 
              name: fnName, 
              content: String(toolResult), 
              tool_call_id: tcall.id 
            } as any);
          } else {
            messagesForModel.push({ role: "tool", name: fnName, content: "Tool not found or unsupported", tool_call_id: tcall.id } as any);
          }
        } catch (e: any) {
          messagesForModel.push({ role: "tool", name: tcall.function?.name || "unknown", content: `Error executing tool: ${e.message}`, tool_call_id: tcall.id } as any);
        }
      }

      // إرسال النتيجة إلى النموذج ليحللها ويعطي الاستنتاج
      requestBody.messages = messagesForModel;
      
      hfRes = await fetch("https://router.huggingface.co/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${hfToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      hfData = await hfRes.json().catch(() => ({}));
      assistantMessageObj = hfData?.choices?.[0]?.message;
    }

    const assistantText: string = assistantMessageObj?.content || "لم يتم الحصول على إجابة.";

    const assistantMessage: ChatMessageInput = {
      role: "assistant",
      content: assistantText,
    };

    let savedChat = chat;
    if (!savedChat) {
      savedChat = await Chat.create({
        userId: session.userId,
        title: buildTitleFromFirstMessage(userMessage.content),
        model: selectedModel,
        messages: [userMessage, assistantMessage],
      });
    } else {
      savedChat.messages.push(userMessage as any, assistantMessage as any);
      savedChat.set("model", selectedModel);
      await savedChat.save();
    }

    return NextResponse.json(
      {
        chatId: savedChat._id.toString(),
        modelUsed: selectedModel,
        assistantMessage: assistantMessage.content,
      },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
