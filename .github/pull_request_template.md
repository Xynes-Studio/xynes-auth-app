## Summary
<!-- One-paragraph description of what this PR does and why. -->

## Linked work
- Plan / issue: <!-- link -->
- Related repos: <!-- link any PRs that depend on or are depended on by this one -->

## Quality gates
- [ ] `lint` passes locally
- [ ] `test` passes locally
- [ ] Coverage ≥ ADR-001 80% floor (or justified exception below)
- [ ] `typecheck` / `build` passes (where applicable)
- [ ] Docs updated (`README.md`, `DEVELOPER.md`, `AGENTS.md`, repo memory)
- [ ] Migration added (if schema change) — forward-only, expand/contract
- [ ] QA PII scrub updated (if migration adds PII)
- [ ] Release doc set updated (if release contract changed)

## Security
- [ ] No secrets in code, logs, error messages, or test fixtures
- [ ] No raw API keys forwarded to downstream services
- [ ] No PII added to telemetry or access logs

## Deployment notes
<!-- e.g. "Requires migration run before service rollout", "Requires xynes-platform-contracts vX.Y.Z first". -->

## Rollback plan
<!-- For risky changes only. -->

---

## Repo-specific items (xynes-auth-app)

This is the **Next.js auth dashboard** (login, signup, workspaces, workspace-admin integrations). Runs on host port `3100`. Use `pnpm`, never `npm`.

- [ ] Lint: `pnpm lint` (next lint via the FE infra env loader)
- [ ] Tests: `pnpm test` (vitest run via the FE infra env loader)
- [ ] Coverage: `pnpm test:coverage` — overall must stay at or above the **ADR-001 80% lines + branches floor**
- [ ] Typecheck: `pnpm typecheck` (= `tsc --noEmit`, per the PFU-3a follow-up that added the dedicated typecheck script)
- [ ] Build: `pnpm build` — Next.js production build MUST succeed cleanly
- [ ] **Lumia DS link-deps refresh.** When the SDK or any Lumia DS package is updated upstream, run `pnpm link:deps` (or `pnpm install`) to refresh the linked dist BEFORE re-running tests / build. The `link:deps` script wires `@lumia-ui/components`, `@lumia-ui/forms`, `@lumia-ui/layout`, `@lumia-ui/marketing`, `@xynes/auth-sdk`, and `@xynes/i18n` from sibling repos.
- [ ] **Dashboard shell parity rule (AGENTS.md §7 rule 9).** Any layout / workspace-switcher / shell-internals fix MUST land in `xynes-front-end/lumia-ds` first; app-level CSS overrides of `DashboardShell` internals are FORBIDDEN. The auth dashboard is the visual reference for every consumer; fix shell-level issues at the design-system level.
- [ ] **Workspace Admin is the source of truth.** This app owns global workspace administration (verified domains, global API keys, future workspace webhooks / connected apps). CMS Console must consume contextually via deep links — do NOT duplicate global domain/API-key management forms here.
- [ ] **Cross-app auth handoff posture (FE-XAUTH-S1-001..008 complete).** PRs that touch the auth handoff MUST preserve the canonical consumer onboarding contract in `xynes-front-end/infra/docs/plans/2026-02-20-cross-app-auth-consumer-onboarding-checklist.md` and re-run the verification documented in `xynes-front-end/infra/docs/testing/2026-02-20-fe-xauth-s1-008-verification.md`.
- [ ] **Feature-flag gating contract (STORAGE-LIVE-5 / BUG-CMS-5 parity).** Flag-gated affordances MUST follow the gateway-architecture pattern: `@xynes/auth-sdk`'s `<FeatureFlagsProvider workspaceId={...}>` consumed via `useFeatureFlag(flag)`. **NO `posthog-js` in the browser; NO `phc_*` key in any FE bundle.** Adding a new flag requires registering it in BOTH the gateway's `DEFAULT_FLAGS` AND the SDK's `DEFAULT_FEATURE_FLAGS` + `FeatureFlags` interface — the SDK silently filters unknown keys.
- [ ] **i18n parity (xynes-i18n consumer).** UI copy MUST flow through the auth catalog (`src/i18n/messages.*.json`) via `getAuthMessages` / `resolveAuthLocale`. The pseudo-locale (`en-XA`) MUST round-trip every new key. Hostile cookies / accept-language headers MUST fall closed to `en-US`.
- [ ] **No raw credentials anywhere.** No `xynes_live_*` / `AKIA*` / `re_*` / `phc_*` / Supabase service-role JWT in any source, test fixture, story, or `.env*`. Gateway redaction + SDK redaction are defense in depth, not the only line.
