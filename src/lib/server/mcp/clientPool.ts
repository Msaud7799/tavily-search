import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { MCPServerConfig } from "../../utils/mcpValidation";

const pool = new Map<string, Client>();

export async function getClient(server: MCPServerConfig): Promise<Client> {
  const key = server.name;
  if (pool.has(key)) return pool.get(key)!;

  const client = new Client(
    { name: "tavily-app-mcp", version: "1.0.0" },
    { capabilities: {} }
  );

  try {
    if (server.transport === "sse" || (server.url && server.url.startsWith("http"))) {
      const url = new URL(server.url!);
      const transport = new SSEClientTransport(url, {
        requestInit: { headers: (server.headers as HeadersInit) || {} },
      });
      await client.connect(transport);
    } else {
      // stdio
      const command = server.command || "npx";
      const args = server.args || [];
      const env = { ...process.env, ...(server.env || {}) } as Record<string, string>;
      
      const transport = new StdioClientTransport({
        command,
        args,
        env,
      });
      await client.connect(transport);
    }

    pool.set(key, client);
    return client;
  } catch (err: any) {
    console.error(`[MCP] Failed connecting to server ${server.name}:`, err);
    throw err;
  }
}

export function evictFromPool(serverName: string) {
  const client = pool.get(serverName);
  if (client) {
    client.close?.().catch(() => {});
    pool.delete(serverName);
  }
}

export async function drainPool() {
  for (const [key, client] of pool.entries()) {
    try {
      await client.close?.();
    } catch {}
    pool.delete(key);
  }
}
