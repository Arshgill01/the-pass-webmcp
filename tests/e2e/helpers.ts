import type { Page } from "@playwright/test";

export type WebMcpToolRecord = {
  name: string;
  execute: (input?: unknown) => unknown;
};

declare global {
  interface Window {
    __WEBMCP_TOOLS__?: Map<string, WebMcpToolRecord>;
  }
}

export async function installWebMcpHost(
  page: Page,
  target: "document" | "navigator" = "document",
): Promise<void> {
  await page.addInitScript((attachTo: "document" | "navigator") => {
    const tools = new Map<
      string,
      { name: string; execute: (input?: unknown) => unknown }
    >();
    const modelContext = {
      registerTool: async (
        tool: { name: string; execute: (input?: unknown) => unknown },
        options?: { signal?: AbortSignal },
      ) => {
        tools.set(tool.name, tool);
        options?.signal?.addEventListener("abort", () => {
          if (tools.get(tool.name) === tool) {
            tools.delete(tool.name);
          }
        });
      },
    };

    if (attachTo === "navigator") {
      Object.defineProperty(navigator, "modelContext", {
        configurable: true,
        value: modelContext,
      });
    } else {
      Object.defineProperty(document, "modelContext", {
        configurable: true,
        value: modelContext,
      });
    }

    window.__WEBMCP_TOOLS__ = tools;
  }, target);
}

export async function waitForTool(page: Page, name: string): Promise<void> {
  await page.waitForFunction(
    (toolName) => Boolean(window.__WEBMCP_TOOLS__?.has(toolName)),
    name,
  );
}

export async function toolNames(page: Page): Promise<string[]> {
  return page.evaluate(() => Array.from(window.__WEBMCP_TOOLS__?.keys() ?? []));
}

export async function callTool(
  page: Page,
  name: string,
  input?: unknown,
): Promise<unknown> {
  return page.evaluate(
    async ({ toolName, toolInput }) => {
      const tool = window.__WEBMCP_TOOLS__?.get(toolName);
      if (!tool) {
        throw new Error(`Tool ${toolName} is not registered`);
      }
      return tool.execute(toolInput);
    },
    { toolName: name, toolInput: input },
  );
}

export function collectPageFaults(page: Page): string[] {
  const faults: string[] = [];

  page.on("pageerror", (error) => {
    faults.push(error.message);
  });

  page.on("console", (message) => {
    if (message.type() !== "error") {
      return;
    }

    const text = message.text();
    if (
      /Download the React DevTools/i.test(text) ||
      /Failed to load resource:.*fonts\.(googleapis|gstatic)/i.test(text)
    ) {
      return;
    }

    faults.push(text);
  });

  return faults;
}

const HUMAN_ONLY_TOOLS = [
  "report_fryer_incident",
  "toggle_keep_together",
  "approve_recovery",
  "reset_demo",
  "optimize",
  "fix_everything",
  "propose_recovery",
];

export function assertNoHumanOnlyTools(names: string[]): void {
  for (const banned of HUMAN_ONLY_TOOLS) {
    if (names.includes(banned)) {
      throw new Error(`Human-only or banned tool was registered: ${banned}`);
    }
  }
}
