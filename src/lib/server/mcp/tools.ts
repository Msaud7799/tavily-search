import { getClient } from "./clientPool";
import { MCPServerConfig } from "../../utils/mcpValidation";

export type OpenAiTool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export interface McpToolMapping {
  fnName: string;
  server: string;
  tool: string;
}

// ينظف الأسماء من الرموز لتكون مقبولة لدى HuggingFace و النماذج الأخرى
function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
}

// دالة لجلب الأدوات من سيرفر معين 
async function listServerTools(server: MCPServerConfig) {
  const client = await getClient(server);
  try {
    const response = await client.listTools({});
    return response.tools || [];
  } catch (error) {
    console.error(`[MCP] فشل جلب الأدوات من سيرفر ${server.name}`, error);
    return [];
  }
}

// هذه الدالة المهمة ستستخدمها النماذج في chatGraph.ts
export async function getOpenAiToolsForMcp(
  servers: MCPServerConfig[]
): Promise<{ tools: OpenAiTool[]; mapping: Record<string, McpToolMapping> }> {
  
  const tools: OpenAiTool[] = [];
  const mapping: Record<string, McpToolMapping> = {};
  const seenNames = new Set<string>();

  const tasks = servers.map(server => listServerTools(server));
  const results = await Promise.allSettled(tasks);

  for (let i = 0; i < results.length; i++) {
    const server = servers[i];
    const r = results[i];
    
    if (r.status === "fulfilled") {
      for (const tool of r.value as any[]) {
        if (!tool.name) continue;

        const parameters = typeof tool.inputSchema === "object" ? tool.inputSchema : undefined;
        const description = tool.description || `Tool ${tool.name} from ${server.name}`;

        let plainName = sanitizeName(tool.name);
        if (plainName in mapping) {
          plainName = sanitizeName(`${plainName}_${server.name}`);
        }

        if (!seenNames.has(plainName)) {
          tools.push({
            type: "function",
            function: {
              name: plainName,
              description,
              parameters,
            },
          });
          seenNames.add(plainName);
          mapping[plainName] = {
            fnName: plainName,
            server: server.name,
            tool: tool.name,
          };
        }
      }
    }
  }

  return { tools, mapping };
}
