import type { ModelContext, WebMcpTool } from "./types";

export interface ToolRegistration {
  abort: () => void;
  supported: boolean;
}

function getModelContext(): ModelContext | undefined {
  return document.modelContext ?? navigator.modelContext;
}

export async function registerTools(
  tools: WebMcpTool[],
): Promise<ToolRegistration> {
  const modelContext = getModelContext();
  const controller = new AbortController();

  if (!modelContext) {
    return { abort: () => controller.abort(), supported: false };
  }

  for (const tool of tools) {
    await modelContext.registerTool(tool, { signal: controller.signal });
  }

  return {
    abort: () => controller.abort(),
    supported: true,
  };
}
