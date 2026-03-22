export interface McpServerConfig {
  id: string;
  name: string;
  url: string; // HTTP endpoints or executable paths
  transport: "sse" | "stdio"; // sse for remote (HTTP), stdio for local processes
  env?: Record<string, string>; // for stdio transport
  headers?: Record<string, string>; // for sse/http headers (e.g., auth tokens)
}

// Global list of MCP servers (This can be modified at runtime or populated from env variables)
let globalServers: McpServerConfig[] = [];

// Helper to initialize default servers (e.g. from environment or database)
export function initMcpServers(configs: McpServerConfig[]) {
  globalServers = [...configs];
}

export function getMcpServers(): McpServerConfig[] {
  return globalServers;
}

export function getMcpServerById(id: string): McpServerConfig | undefined {
  return globalServers.find((s) => s.id === id);
}

// Add a server dynamically
export function addMcpServer(server: McpServerConfig) {
  if (!globalServers.find((s) => s.id === server.id)) {
    globalServers.push(server);
  }
}

// Remove a server dynamically
export function removeMcpServer(id: string) {
  globalServers = globalServers.filter((s) => s.id !== id);
}
