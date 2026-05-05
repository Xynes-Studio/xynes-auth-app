"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Input } from "@lumia-ui/components";
import { normalizeInviteToken } from "@/lib/invite/invite-utils";

const ERROR_MESSAGES: Record<"empty" | "invalid" | "length", string> = {
  empty: "Enter your invite link or code to continue.",
  invalid: "That invite code looks incorrect. Check the link and try again.",
  length: "Invite code must be between 16 and 128 characters.",
};

export function InviteEntryForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<"empty" | "invalid" | "length" | null>(
    null,
  );

  const errorMessage = useMemo(
    () => (error ? ERROR_MESSAGES[error] : null),
    [error],
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
          Invite link or code
        </label>
        <Input
          id="invite-token"
          name="invite-token"
          placeholder="Paste your invite link or code"
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
          We&apos;ll take you to the workspace invite preview.
        </p>
      </div>

      <Button type="submit" fullWidth>
        Continue
      </Button>
    </form>
  );
}
