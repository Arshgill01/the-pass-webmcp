import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { App } from "./App";
import { KitchenStore } from "./domain/store";

function renderBoard(store = new KitchenStore()) {
  return render(<App store={store} autoClock={false} />);
}

describe("kitchen board", () => {
  it("renders all four stations and six fixture tickets", () => {
    renderBoard();

    expect(screen.getByRole("heading", { name: "The Pass" })).toBeVisible();
    expect(screen.getAllByRole("article")).toHaveLength(6);

    for (const station of ["Expo", "Grill", "Fryer", "Cold prep"]) {
      expect(screen.getByRole("heading", { name: station })).toBeVisible();
    }
  });

  it("lets a human report the fryer incident and lock Table 12", () => {
    renderBoard();

    fireEvent.click(screen.getByRole("button", { name: "Report fryer unavailable" }));

    expect(screen.getByText(/Fryer unavailable/)).toBeVisible();
    expect(screen.getAllByText(/BLOCKED · fryer down/).length).toBeGreaterThan(0);

    const lock = screen.getByRole("button", { name: "Keep Table 12 together" });
    fireEvent.click(lock);
    expect(lock).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/Table 12 must stay together/)).toBeVisible();
  });

  it("shows a stale agent write as not applied and keeps the human lock", () => {
    const store = new KitchenStore();
    renderBoard(store);

    fireEvent.click(screen.getByRole("button", { name: "Report fryer unavailable" }));
    act(() => {
      store.dispatch({
        type: "STAGE_HOLD",
        ticketId: "ticket-181",
        expectedVersion: store.getState().version,
        reason: "Hold fries while the fryer is down.",
        actor: "agent",
      });
    });
    fireEvent.click(screen.getByRole("button", { name: "Keep Table 12 together" }));

    const staleVersion = store.getState().version - 1;
    act(() => {
      store.dispatch({
        type: "STAGE_REROUTE",
        ticketId: "ticket-185",
        targetStationId: "grill",
        expectedVersion: staleVersion,
        reason: "Late reroute.",
        actor: "agent",
      });
    });

    const staleCard = document.querySelector(".stale-card");
    expect(staleCard).toHaveTextContent("OUTDATED — NOT APPLIED");
    expect(staleCard).toHaveTextContent(/Plan expected v\d+\. Current state is v\d+/);
    expect(staleCard).toHaveTextContent("Table 12 must stay together");
    expect(staleCard).toHaveTextContent("inspect_service_state");
    expect(
      screen.getByRole("button", { name: "Keep Table 12 together" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Approve recovery" })).toBeDisabled();
  });

  it("enables approval only after a valid current-version plan", () => {
    const store = new KitchenStore();
    renderBoard(store);

    fireEvent.click(screen.getByRole("button", { name: "Report fryer unavailable" }));
    const fryer = screen.getByRole("region", { name: "Fryer station" });
    const fries = within(fryer).getByText("Shoestring fries").closest("article");
    const potatoes = within(fryer).getByText("Crispy potatoes").closest("article");
    expect(fries).toBeTruthy();
    expect(potatoes).toBeTruthy();

    fireEvent.click(within(fries!).getByRole("button", { name: "Hold" }));
    fireEvent.click(within(potatoes!).getByRole("button", { name: "Send to grill" }));

    expect(screen.getByRole("button", { name: "Approve recovery" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Validate plan" }));
    fireEvent.click(screen.getByRole("button", { name: "Approve recovery" }));

    expect(screen.getByText(/Committed receipt/)).toBeVisible();
    expect(screen.getByText(/Crispy potatoes/)).toBeVisible();
  });
});
