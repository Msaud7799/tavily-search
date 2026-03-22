import { z } from "zod";

export const MCPServerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "اسم السيرفر مطلوب"),
  url: z.string().optional(), // للـ SSE
  command: z.string().optional(), // للـ STDIO
  args: z.array(z.string()).optional(),
  transport: z.enum(["sse", "stdio"]).default("stdio"),
  env: z.record(z.string(), z.any()).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  disabled: z.boolean().default(false),
});

export type MCPServerConfig = z.infer<typeof MCPServerSchema>;
