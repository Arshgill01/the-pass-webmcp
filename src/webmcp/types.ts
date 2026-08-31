export interface WebMcpTool<Input = unknown, Output = unknown> {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    untrustedContentHint?: boolean;
  };
  execute: (
    input: Input,
    context: { signal?: AbortSignal },
  ) => Output | Promise<Output>;
}

export interface ModelContext {
  registerTool: (
    tool: WebMcpTool,
    options?: { signal?: AbortSignal },
  ) => void | Promise<void>;
}

declare global {
  interface Document {
    modelContext?: ModelContext;
  }

  interface Navigator {
    modelContext?: ModelContext;
  }
}
