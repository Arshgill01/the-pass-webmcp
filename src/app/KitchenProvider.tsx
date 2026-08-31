import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { CLOCK_TICK_MS } from "../domain/clock";
import { KitchenStore } from "../domain/store";
import type { KitchenState } from "../domain/types";

const StoreContext = createContext<KitchenStore | null>(null);

interface KitchenProviderProps {
  children: ReactNode;
  store?: KitchenStore;
  autoClock?: boolean;
}

export function KitchenProvider({
  children,
  store,
  autoClock = true,
}: KitchenProviderProps) {
  const [resolved] = useState(() => store ?? new KitchenStore());

  useEffect(() => {
    if (!autoClock) {
      return;
    }

    const id = window.setInterval(() => {
      resolved.advanceTime(CLOCK_TICK_MS);
    }, CLOCK_TICK_MS);

    return () => window.clearInterval(id);
  }, [autoClock, resolved]);

  useEffect(() => {
    window.__THE_PASS__ = {
      dispatch: resolved.dispatch,
      getState: resolved.getState,
      advanceTime: resolved.advanceTime,
    };

    return () => {
      delete window.__THE_PASS__;
    };
  }, [resolved]);

  return <StoreContext value={resolved}>{children}</StoreContext>;
}

export function useKitchenStore(): KitchenStore {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error("KitchenProvider is required");
  }
  return store;
}

export function useKitchenState(): KitchenState {
  const store = useKitchenStore();
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
