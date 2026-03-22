import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { type McpServerConfig } from "./mcpRegistry";

export class McpClientManager {
  private static clients = new Map<string, Client>();

  /**
   * Returns a ready-to-use connected MCP client for the given server config.
   * Caches connections so we don't reconnect on every request.
   */
  static async getClient(server: McpServerConfig): Promise<Client> {
    const existingClient = this.clients.get(server.id);
    if (existingClient) {
      return existingClient;
    }

    const client = new Client(
      { name: "tavily-app-client", version: "1.0.0" },
      { capabilities: {} }
    );

    try {
      if (server.transport === "sse") {
        const url = new URL(server.url);
        const transport = new SSEClientTransport(url, {
          requestInit: {
            headers: server.headers || {},
          },
        });
        await client.connect(transport);
      } else {
        throw new Error(
          `Transport '${server.transport}' not implemented in browser/next.js API contexts yet.`
        );
      }

      this.clients.set(server.id, client);
      return client;

    } catch (error) {
      console.error(`Failed to connect to MCP Server '${server.name}':`, error);
      throw error;
    }
  }

  /**
   * Evict a dead or unwanted client
   */
  static async evictClient(id: string) {
    const client = this.clients.get(id);
    if (client) {
      this.clients.delete(id);
      try {
        await client.close?.();
      } catch (err) {
        // ignore errors on close
      }
    }
  }

  /**
   * Drain and close all connections
   */
  static async drainAll() {
    for (const [id, client] of this.clients.entries()) {
      try {
        await client.close?.();
      } catch (err) {
        // ignore
      }
      this.clients.delete(id);
    }
  }
}
