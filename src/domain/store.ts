import { advanceClock } from "./clock";
import { applyCommand } from "./commands";
import { createCanonicalState } from "./state";
import type { Command, CommandResult, KitchenState } from "./types";

export class KitchenStore {
  private state: KitchenState;
  private readonly listeners = new Set<() => void>();

  constructor(initial: KitchenState = createCanonicalState()) {
    this.state = initial;
  }

  getState = (): KitchenState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  dispatch = (command: Command): CommandResult => {
    const { result, state } = applyCommand(this.state, command);
    if (state !== this.state) {
      this.state = state;
      this.emit();
    }
    return result;
  };

  advanceTime = (ms: number): void => {
    const next = advanceClock(this.state, ms);
    if (next === this.state) {
      return;
    }
    this.state = next;
    this.emit();
  };

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
