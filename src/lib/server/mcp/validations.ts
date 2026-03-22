import { MCPServerSchema } from "../../utils/mcpValidation";

export function validateMcpConfig(data: any) {
  return MCPServerSchema.safeParse(data);
}

export function validateEnvVariables(env: Record<string, string>) {
  for (const [k, v] of Object.entries(env)) {
    if (typeof k !== 'string' || typeof v !== 'string') {
      return false;
    }
  }
  return true;
}

export function validateCommandArgs(args: any[]) {
  if (!Array.isArray(args)) return false;
  return args.every(arg => typeof arg === 'string');
}
