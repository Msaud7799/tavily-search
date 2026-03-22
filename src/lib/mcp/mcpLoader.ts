import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { type McpServerConfig, getMcpServers } from "./mcpRegistry";
import { McpClientManager } from "./mcpClientManager";

// A Zod schema representation builder
function jsonSchemaToZod(schema: any): z.ZodType<any> {
  // A very basic mapper from JSON Schema to Zod to integrate with @langchain/core/tools
  if (!schema) return z.any();

  if (schema.type === "object" && schema.properties) {
    const shape: Record<string, z.ZodType<any>> = {};
    for (const [k, v] of Object.entries(schema.properties)) {
      let zType = jsonSchemaToZod(v);
      if (Array.isArray(schema.required) && !schema.required.includes(k)) {
        zType = zType.optional();
      }
      shape[k] = zType;
    }
    return z.object(shape);
  }

  if (schema.type === "string") return z.string();
  if (schema.type === "number" || schema.type === "integer") return z.number();
  if (schema.type === "boolean") return z.boolean();
  if (schema.type === "array" && schema.items) return z.array(jsonSchemaToZod(schema.items));

  return z.any();
}

/**
 * Loads all tools exposed by a single MCP server.
 */
export async function getToolsForMcpServer(server: McpServerConfig) {
  try {
    const client = await McpClientManager.getClient(server);
    const result = await client.listTools({});
    
    // Map MCP Tools to LangChain tools
    const langchainTools = (result.tools || []).map((t: any) => {
      const toolName = `${server.name}_${t.name}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
      const description = t.description || `Tool ${t.name} from MCP Server ${server.name}`;
      const inputSchema = jsonSchemaToZod(t.inputSchema);

      return tool(
        async (args: any) => {
          console.info(`[MCP ${server.name}] Calling Tool: ${t.name}`, { args });
          try {
            const res = await client.callTool({
              name: t.name,
              arguments: args,
            });
            
            // Extract text from the result
            const contents = Array.isArray(res.content) ? res.content : [res.content];
            const textContent = contents
              .map((c: any) => (c.type === "text" ? c.text : JSON.stringify(c)))
              .filter(Boolean)
              .join("\n");
              
            return textContent || "Tool returned successful empty response.";
          } catch (error) {
            console.error(`[MCP ${server.name}] Tool ${t.name} failed:`, error);
            // Evict the client so the next call attempts to reconnect
            await McpClientManager.evictClient(server.id);
            return `Error calling MCP tool ${t.name}: ${error instanceof Error ? error.message : String(error)}`;
          }
        },
        {
          name: toolName,
          description: description,
          schema: inputSchema,
        }
      );
    });

    return langchainTools;
  } catch (err) {
    console.error(`Failed to load tools from MCP Server ${server.name}`, err);
    return [];
  }
}

/**
 * Loads all tools across all configured MCP servers.
 * Parallelizes the requests to fetch tools from each active server.
 */
export async function getAllMcpTools() {
  const servers = getMcpServers();
  if (servers.length === 0) return [];

  const promises = servers.map((s) => getToolsForMcpServer(s));
  const results = await Promise.allSettled(promises);

  const finalTools: any[] = [];
  for (const res of results) {
    if (res.status === "fulfilled") {
      finalTools.push(...res.value);
    }
  }

  return finalTools;
}
