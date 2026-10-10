"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@lumia-ui/components";
import { useTranslations } from "next-intl";

type ScopeView =
  | { state: "idle" | "loading" | "error" }
  | { state: "ready"; scopes: readonly string[] };

export type ReadApiKeyScopes = (keyId: string, signal: AbortSignal) => Promise<readonly string[]>;

/** Reads safe persisted metadata only when requested, never from a preset label. */
export function ApiKeyScopeDetails({ keyId, name, onReadScopes, disabled = false }: {
  keyId: string;
  name: string;
  onReadScopes: ReadApiKeyScopes;
  disabled?: boolean;
}) {
  const t = useTranslations("auth.integrations");
  const [view, setView] = useState<ScopeView>({ state: "idle" });
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);

  async function loadScopes() {
    pending.current?.abort();
    const request = new AbortController();
    pending.current = request;
    setView({ state: "loading" });
    try {
      const scopes = await onReadScopes(keyId, request.signal);
      if (!request.signal.aborted) setView({ state: "ready", scopes });
    } catch {
      if (!request.signal.aborted) setView({ state: "error" });
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="ghost" size="sm" onClick={loadScopes}
        disabled={disabled || view.state === "loading"}
        aria-label={t("scopes.showAria", { name })}>
        {t(view.state === "loading" ? "scopes.loading" : "scopes.show")}
      </Button>
      {view.state === "error" ? <p role="status" className="text-sm text-muted-foreground">{t("scopes.error")}</p> : null}
      {view.state === "ready" ? (
        view.scopes.length ? <ul aria-label={t("scopes.heading")} className="text-xs text-muted-foreground">
          {view.scopes.map(scope => <li key={scope}><code>{scope}</code></li>)}
        </ul> : <p role="status" className="text-sm text-muted-foreground">{t("scopes.none")}</p>
      ) : null}
    </div>
  );
}
