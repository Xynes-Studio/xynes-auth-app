import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/invite/InviteEntryForm", () => ({
  InviteEntryForm: () => <div data-testid="invite-entry-form" />,
}));

import InviteEntryPage from "./page";

describe("InviteEntryPage", () => {
  it("renders the invite entry page", () => {
    render(<InviteEntryPage />);

    expect(
      screen.getByRole("heading", { name: /join a workspace/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("invite-entry-form")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /back to onboarding/i }),
    ).toHaveAttribute("href", "/onboarding");
  });
});
