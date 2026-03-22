import { getClient, evictFromPool } from "../../mcp/clientPool";
import { MCPServerConfig } from "../../../utils/mcpValidation";

/**
 * دالة لتنفيذ أدوات الـ MCP بطريقة متوافقة مع LangGraph
 */
export async function invokeMcpTool(server: MCPServerConfig, toolName: string, args: any) {
  try {
    const client = await getClient(server);
    console.info(`[MCP Invocation] App is calling ${server.name}.${toolName}`);
    
    const result = await client.callTool({
      name: toolName,
      arguments: args,
    });

    const contents = Array.isArray(result.content) ? result.content : [result.content];
    const textContent = contents
      .map((c: any) => (c.type === "text" ? c.text : JSON.stringify(c)))
      .filter(Boolean)
      .join("\n");
      
    return textContent || "Success";
  } catch (error: any) {
    console.error(`[MCP Error] Tool ${toolName} on server ${server.name} failed`, error);
    // إخلاء التجمع لتهيئة العميل مرة أخرى عند الطلب التالي
    evictFromPool(server.name);
    return `Error from MCP Server (${server.name}): ${error.message}`;
  }
}
