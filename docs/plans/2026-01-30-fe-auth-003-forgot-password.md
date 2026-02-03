# FE-AUTH-003 (/forgot-password) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a working `/forgot-password` route + request-reset form and fix the login page link to point to it, without leaking account existence, while keeping overall coverage ≥ 80%.

**Architecture:** Implement the UI as a small client component (`ForgotPasswordForm`) used by a new App Router page (`src/app/forgot-password/page.tsx`). Keep logic testable by extracting request orchestration into a small helper and mocking Supabase in tests.

**Tech Stack:** Next.js App Router (Next 15), React Hook Form + Zod, `@lumia-ui/components`, Vitest + Testing Library.

---

### Task 1: Create failing tests for link + route

**Files:**
- Modify: `src/components/LoginForm.test.tsx`
- Create: `src/app/forgot-password/page.test.tsx`

**Step 1: Write failing test (login link)**
- Update the existing test to expect `href="/forgot-password"` instead of `/reset-password`.

**Step 2: Write failing test (forgot-password page renders)**
- Assert the page renders a heading like “Forgot your password?” and includes an email input + submit button.

**Step 3: Run tests to verify they fail**
- Run: `pnpm test src/components/LoginForm.test.tsx src/app/forgot-password/page.test.tsx`
- Expected: FAIL because the route/component doesn’t exist and link mismatch.

---

### Task 2: Create failing tests for forgot-password submission behavior

**Files:**
- Create: `src/components/ForgotPasswordForm.test.tsx`

**Step 1: Write failing tests**
- Submitting a valid email calls `supabase.auth.resetPasswordForEmail(email, ...)`.
- On success, show a generic success message.
- On “user not found” style responses, still show the same generic success message (no account enumeration).
- On non-enumeration safe errors (e.g., network), show a non-sensitive error state.

**Step 2: Run tests to verify they fail**
- Run: `pnpm test src/components/ForgotPasswordForm.test.tsx`
- Expected: FAIL because component doesn’t exist.

---

### Task 3: Implement `/forgot-password` route + form (minimal code)

**Files:**
- Create: `src/app/forgot-password/page.tsx`
- Create: `src/components/ForgotPasswordForm.tsx`
- (Optional) Create: `src/lib/password-reset/password-reset-utils.ts`
- (Optional) Create: `src/lib/password-reset/password-reset-utils.test.ts`
- Modify: `src/components/LoginForm.tsx`

**Step 1: Implement `ForgotPasswordForm`**
- Use existing form patterns (react-hook-form + zod) and `@lumia-ui/components/Button`.
- Ensure accessibility: labels, `aria-invalid`, error text with `role="alert"`.
- Security: always show the same “If an account exists…” success message for emails that do not exist.

**Step 2: Implement `/forgot-password` page**
- Match the Auth app card layout and styling patterns used by `/login`.

**Step 3: Fix login link**
- Update `href` to `/forgot-password`.

**Step 4: Run tests**
- Run: `pnpm test`
- Expected: PASS.

---

### Task 4: Verify coverage gates

**Files:**
- None (verification only)

**Step 1: Run coverage**
- Run: `pnpm test:coverage`
- Expected: Overall coverage ≥ 80% and no new coverage regression.

