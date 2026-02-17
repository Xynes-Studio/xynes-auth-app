import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UnderDevelopmentPanel } from "./UnderDevelopmentPanel";

describe("UnderDevelopmentPanel", () => {
  it("uses theme-aware dark-mode friendly colors", () => {
    const { container } = render(
      <UnderDevelopmentPanel title="Coming soon" description="In progress." />,
    );

    const section = container.querySelector("section");
    const innerCard = screen.getByText("Coming soon").closest("div");

    expect(section).toBeTruthy();
    expect(section?.className).toContain("bg-muted/20");
    expect(section?.className).toContain("border-border");
    expect(innerCard).toBeTruthy();
    expect(innerCard?.className).toContain("bg-card/80");
    expect(innerCard?.className).toContain("border-border");
  });
});
