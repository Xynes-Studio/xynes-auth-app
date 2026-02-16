# Remove Signup Confirm Password Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the confirm password field from the signup form while keeping validation, security, and accessibility intact, with TDD and coverage targets met.

**Architecture:** Update Tier 2 Signup form component and Tier 1 validation schema. Tests will be updated first to assert the field is removed and validation no longer expects `confirmPassword` for signup. No API changes.

**Tech Stack:** Next.js App Router, React, TypeScript, Zod, @testing-library/react, Vitest, Lumia-DS.

---

### Task 1: Update Tier 1 validation tests (signup schema)

**Files:**
- Modify: `src/lib/validation/validation.test.ts`

**Step 1: Write the failing test**

```ts
// Update signupFormSchema tests to only require { email, password }
// Add expectation that extra confirmPassword is not required
```

**Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/validation/validation.test.ts`
Expected: FAIL because schema still requires `confirmPassword` and mismatch checks.

**Step 3: Write minimal implementation**

```ts
// Remove confirmPassword from signupFormSchema and related refine in src/lib/validation/index.ts
```

**Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/validation/validation.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/validation/validation.test.ts src/lib/validation/index.ts
git commit -m "test: update signup validation for single password"
```

### Task 2: Update Tier 2 SignupForm tests and UI

**Files:**
- Modify: `src/components/auth/forms/SignupForm.test.tsx`
- Modify: `src/components/auth/forms/SignupForm.tsx`

**Step 1: Write the failing test**

```tsx
// Update rendering tests to assert confirm password field is NOT present
// Remove mismatched password test
// Update long password test to only validate password field
```

**Step 2: Run test to verify it fails**

Run: `pnpm test src/components/auth/forms/SignupForm.test.tsx`
Expected: FAIL because UI still renders confirm password field.

**Step 3: Write minimal implementation**

```tsx
// Remove confirm password Input + error from SignupForm.tsx
// Adjust form data usage to only include password
```

**Step 4: Run test to verify it passes**

Run: `pnpm test src/components/auth/forms/SignupForm.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/auth/forms/SignupForm.test.tsx src/components/auth/forms/SignupForm.tsx
git commit -m "feat: remove confirm password from signup form"
```

### Task 3: Verification and coverage gate

**Files:**
- None (run tests)

**Step 1: Run test suite with coverage**

Run: `pnpm test:coverage`
Expected: Overall coverage >= 80%

**Step 2: Commit any follow-up fixes**

```bash
git add -A
git commit -m "chore: ensure coverage and tests green"
```
