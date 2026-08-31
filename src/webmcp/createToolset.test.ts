import { createToolset } from "./createToolset";
import { registerTools } from "./registerTools";
import { KitchenStore } from "../domain/store";
import { TOOL_NAMES } from "../domain/types";

function installModelContext() {
  const tools = new Map<string, { name: string; execute: (input: unknown) => unknown }>();
  const modelContext = {
    registerTool: async (
      tool: { name: string; execute: (input: unknown) => unknown },
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

  Object.defineProperty(document, "modelContext", {
    configurable: true,
    value: modelContext,
  });

  return tools;
}

describe("WebMCP toolset", () => {
  it("registers inspect tools while running and aborts them on teardown", async () => {
    const tools = installModelContext();
    const store = new KitchenStore();
    const registration = await registerTools(createToolset(store));

    expect(registration.supported).toBe(true);
    expect([...tools.keys()]).toEqual([
      TOOL_NAMES.inspectServiceState,
      TOOL_NAMES.inspectTicket,
    ]);

    registration.abort();
    expect(tools.size).toBe(0);
  });

  it("stages, rejects stale writes, and requires inspect as the next action", async () => {
    const tools = installModelContext();
    const store = new KitchenStore();
    store.dispatch({
      type: "REPORT_FRYER_INCIDENT",
      expectedVersion: 1,
      actor: "human",
    });

    await registerTools(createToolset(store));
    const hold = tools.get(TOOL_NAMES.stageTicketHold);
    expect(hold).toBeDefined();

    const accepted = await hold?.execute({
      ticketId: "ticket-181",
      expectedVersion: 2,
      reason: "Hold fries. Fryer is down.",
    });
    expect(accepted).toMatchObject({ status: "accepted", stateVersion: 3 });

    store.dispatch({
      type: "TOGGLE_KEEP_TOGETHER",
      tableName: "Table 12",
      expectedVersion: 3,
      actor: "human",
    });

    const stale = await hold?.execute({
      ticketId: "ticket-185",
      expectedVersion: 3,
      reason: "Late hold.",
    });
    expect(stale).toMatchObject({
      status: "rejected_stale",
      expectedVersion: 3,
      currentVersion: 4,
      nextActions: [TOOL_NAMES.inspectServiceState],
    });
  });
});
