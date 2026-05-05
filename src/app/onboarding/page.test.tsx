import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/components/onboarding", () => ({
  CreateWorkspaceForm: () => <div data-testid="create-workspace-form" />,
}));

import OnboardingPage from "./page";

describe("OnboardingPage", () => {
  it("uses higher-contrast text for intro and footer", () => {
    render(<OnboardingPage />);

    const intro = screen.getByText(/create your first workspace/i);
    const footer = screen.getByText(/need help\?/i);

    expect(intro).toHaveClass("text-foreground/70");
    expect(footer).toHaveClass("text-foreground/70");
  });
});
