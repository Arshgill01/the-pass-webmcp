import { render, screen } from "@testing-library/react";
import { App } from "./App";

describe("scaffold", () => {
  it("renders all four stations and six fixture tickets", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "The Pass" })).toBeVisible();
    expect(screen.getAllByRole("article")).toHaveLength(6);

    for (const station of ["Expo", "Grill", "Fryer", "Cold prep"]) {
      expect(screen.getByRole("heading", { name: station })).toBeVisible();
    }
  });
});
