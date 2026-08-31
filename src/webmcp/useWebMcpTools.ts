import { useEffect, useState } from "react";
import type { KitchenStore } from "../domain/store";
import type { ProductPhase } from "../domain/types";
import { createToolset } from "./createToolset";
import { registerTools, type ToolRegistration } from "./registerTools";

export function useWebMcpTools(store: KitchenStore, phase: ProductPhase): boolean {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let registration: ToolRegistration | undefined;

    void (async () => {
      const tools = createToolset(store);
      registration = await registerTools(tools);
      if (cancelled) {
        registration.abort();
        return;
      }
      setSupported(registration.supported);
    })();

    return () => {
      cancelled = true;
      registration?.abort();
    };
  }, [phase, store]);

  return supported;
}
