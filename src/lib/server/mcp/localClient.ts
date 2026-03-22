import { getClient } from "./clientPool";
import { MCPServerConfig } from "../../utils/mcpValidation";

export async function createLocalClient(serverConfig: MCPServerConfig) {
  // يضمن هذا الملف أن الخوادم المحلية تعمل عبر stido بدلاً من sse
  const configForLocal = { ...serverConfig, transport: "stdio" as const };
  return getClient(configForLocal);
}

export async function listLocalTools(serverConfig: MCPServerConfig) {
  const client = await createLocalClient(serverConfig);
  const result = await client.listTools({});
  return result.tools;
}

export async function callLocalTool(serverConfig: MCPServerConfig, toolName: string, args: any) {
  const client = await createLocalClient(serverConfig);
  return client.callTool({ name: toolName, arguments: args });
}
