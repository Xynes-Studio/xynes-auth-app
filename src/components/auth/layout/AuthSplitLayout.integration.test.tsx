import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthSplitLayout } from "./AuthSplitLayout";

vi.mock("./XynesTicker", () => ({
  default: () => <div data-testid="xynes-ticker">Ticker</div>,
}));

vi.mock("./PictureOfTheDay", () => ({
  default: () => <div data-testid="picture-of-the-day">Picture</div>,
}));

describe("AuthSplitLayout", () => {
  it("renders shared left and right panels with marketing modules", () => {
    render(
      <AuthSplitLayout>
        <div data-testid="form-content">Form</div>
      </AuthSplitLayout>,
    );

    expect(screen.getByTestId("auth-split-layout")).toBeInTheDocument();
    expect(screen.getByTestId("xynes-ticker")).toBeInTheDocument();
    expect(screen.getByTestId("picture-of-the-day")).toBeInTheDocument();
    expect(screen.getByTestId("form-content")).toBeInTheDocument();
  });
});
