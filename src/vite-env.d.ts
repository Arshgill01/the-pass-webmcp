/// <reference types="vite/client" />

import type { Command, CommandResult, KitchenState } from "./domain/types";

declare global {
  interface Window {
    __THE_PASS__?: {
      dispatch: (command: Command) => CommandResult;
      getState: () => KitchenState;
      advanceTime: (ms: number) => void;
    };
  }
}

export {};
