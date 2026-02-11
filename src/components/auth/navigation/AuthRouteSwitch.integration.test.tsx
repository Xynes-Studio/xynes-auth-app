import { describe, expect, it, vi, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AuthRouteSwitch } from "./AuthRouteSwitch";

const pathnameState = vi.hoisted(() => ({ value: "/login" }));
const routerState = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameState.value,
  useRouter: () => routerState,
}));

describe("AuthRouteSwitch", () => {
  afterEach(() => {
    routerState.back.mockReset();
    routerState.push.mockReset();
    vi.restoreAllMocks();
  });

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

  it("renders back button when requested", () => {
    pathnameState.value = "/forgot-password";
    render(<AuthRouteSwitch showBackButton backLabel="Back" />);

    expect(
      screen.getByRole("button", { name: /back/i }),
    ).toBeInTheDocument();
  });

  it("uses href navigation mode when backMode is href", () => {
    pathnameState.value = "/forgot-password";
    render(
      <AuthRouteSwitch
        showBackButton
        backLabel="Back"
        backMode="href"
        backHref="/login"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /back/i }));

    expect(routerState.back).not.toHaveBeenCalled();
    expect(routerState.push).toHaveBeenCalledWith("/login");
  });

  it("uses browser history when available in history-or-href mode", () => {
    pathnameState.value = "/forgot-password";
    vi.spyOn(window.history, "length", "get").mockReturnValue(2);
    render(
      <AuthRouteSwitch
        showBackButton
        backLabel="Back"
        backMode="history-or-href"
        backHref="/login"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /back/i }));

    expect(routerState.back).toHaveBeenCalledTimes(1);
    expect(routerState.push).not.toHaveBeenCalled();
  });

  it("falls back to href when browser history is unavailable", () => {
    pathnameState.value = "/forgot-password";
    vi.spyOn(window.history, "length", "get").mockReturnValue(1);
    render(
      <AuthRouteSwitch
        showBackButton
        backLabel="Back"
        backMode="history-or-href"
        backHref="/login"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /back/i }));

    expect(routerState.back).not.toHaveBeenCalled();
    expect(routerState.push).toHaveBeenCalledWith("/login");
  });

  it("can hide login/signup links while keeping back button", () => {
    pathnameState.value = "/forgot-password";
    render(
      <AuthRouteSwitch
        showBackButton
        showRouteLinks={false}
        backLabel="Back"
      />,
    );

    expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /log in/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /sign up/i })).not.toBeInTheDocument();
  });
});
