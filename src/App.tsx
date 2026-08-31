import { KitchenBoard } from "./components/KitchenBoard";
import { KitchenProvider } from "./app/KitchenProvider";
import type { KitchenStore } from "./domain/store";

interface AppProps {
  store?: KitchenStore;
  autoClock?: boolean;
}

export function App({ store, autoClock = true }: AppProps) {
  return (
    <KitchenProvider store={store} autoClock={autoClock}>
      <KitchenBoard />
    </KitchenProvider>
  );
}
