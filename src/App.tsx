import { KitchenBoard } from "./components/KitchenBoard";
import { canonicalFixture } from "./fixtures/canonical";

export function App() {
  return <KitchenBoard fixture={canonicalFixture} />;
}
