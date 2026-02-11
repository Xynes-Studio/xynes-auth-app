import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthRouteSwitch } from "./AuthRouteSwitch";

const pathnameState = vi.hoisted(() => ({ value: "/login" }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameState.value,
}));

describe("AuthRouteSwitch", () => {
  it("highlights login link when current route is /login", () => {
    pathnameState.value = "/login";
    render(<AuthRouteSwitch />);

    const loginLink = screen.getByRole("link", { name: /log in/i });
    const signupLink = screen.getByRole("link", { name: /sign up/i });

    expect(loginLink).toHaveClass("text-slate-900");
    expect(loginLink).toHaveClass("dark:text-slate-100");
    expect(signupLink).toHaveClass("text-slate-500");
    expect(signupLink).toHaveClass("dark:text-slate-400");
  });

  it("highlights signup link when current route is /signup", () => {
    pathnameState.value = "/signup";
    render(<AuthRouteSwitch />);

    const loginLink = screen.getByRole("link", { name: /log in/i });
    const signupLink = screen.getByRole("link", { name: /sign up/i });

    expect(loginLink).toHaveClass("text-slate-500");
    expect(signupLink).toHaveClass("text-slate-900");
  });

  it("renders semantic auth route navigation", () => {
    pathnameState.value = "/login";
    render(<AuthRouteSwitch />);

    expect(
      screen.getByRole("navigation", { name: /auth route switch/i }),
    ).toBeInTheDocument();
  });
});
