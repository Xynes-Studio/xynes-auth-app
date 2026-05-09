"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Input } from "@lumia-ui/components";
import { useTranslations } from "next-intl";
import { normalizeInviteToken } from "@/lib/invite/invite-utils";

export function InviteEntryForm() {
  const tForm = useTranslations("auth.invite.form");
  const tErrors = useTranslations("auth.invite.errors");
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<"empty" | "invalid" | "length" | null>(
    null,
  );

  const errorMessage = useMemo(
    () => (error ? tErrors(error) : null),
    [error, tErrors],
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const result = normalizeInviteToken(value);
    if ("error" in result) {
      setError(result.error);
      return;
    }

    setError(null);
    router.push(`/invite/${encodeURIComponent(result.token)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {errorMessage ? (
        <Alert
          id="invite-error"
          variant="error"
          role="alert"
          description={errorMessage}
          className="text-left"
        />
      ) : null}

      <div className="space-y-2">
        <label
          htmlFor="invite-token"
          className="block text-sm font-medium text-foreground"
        >
          {tForm("fieldLabel")}
        </label>
        <Input
          id="invite-token"
          name="invite-token"
          placeholder={tForm("fieldPlaceholder")}
          autoComplete="off"
          spellCheck={false}
          value={value}
          aria-invalid={!!error}
          aria-describedby={error ? "invite-error" : "invite-hint"}
          invalid={Boolean(error)}
          onChange={(event) => {
            if (error) {
              setError(null);
            }
            setValue(event.target.value);
          }}
        />
        <p id="invite-hint" className="text-sm text-muted-foreground">
          {tForm("hint")}
        </p>
      </div>

      <Button type="submit" fullWidth>
        {tForm("submit")}
      </Button>
    </form>
  );
}
