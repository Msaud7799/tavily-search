import { MCPServerConfig } from "../../../utils/mcpValidation";

/**
 * دالة لتصفية سيرفرات MCP النشطة والمتاحة لجراف المحادثة
 */
export function resolveMCPRouters(servers: MCPServerConfig[]): MCPServerConfig[] {
  return servers.filter(server => !server.disabled);
}

export function buildRoutePromptForMcp(serverTools: MCPServerConfig[]) {
  // يمكن استخدامها لبناء بروبت يعرّف النموذج بالأدوات المتاحة
  if (!serverTools.length) return "";
  return `لديك قدرة على استخدام أدوات خارجية عبر MCP للقيام بمهام مثل استعراض الملفات، التفكير المتسلسل، والبحث في MongoDB. تم تفعيل السيرفرات التالية:
${serverTools.map(t => `- ${t.name} (أدوات ديناميكية)`).join('\n')}
استخدم الأدوات عند الحاجة لتحقيق هدف المستخدم.`;
}
