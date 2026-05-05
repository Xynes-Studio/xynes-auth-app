"use client";

import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input } from "@lumia-ui/components";
import { useAuth } from "@xynes/auth-sdk";
import { getAllowedRedirectDomains } from "@/lib/redirect";
import { determinePostLoginDestination } from "@/lib/auth/post-login-destination";
import { updateSelfProfile } from "@/lib/profile/profile-api";

const completeProfileSchema = z.object({
  displayName: z.string().trim().min(1, "Name is required").max(200),
});

type CompleteProfileData = z.infer<typeof completeProfileSchema>;

interface CompleteProfileFormProps {
  redirectUrl?: string;
}

export function CompleteProfileForm({ redirectUrl }: CompleteProfileFormProps) {
  const { user, workspaces } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const allowedRedirectDomains = useMemo(() => getAllowedRedirectDomains(), []);

  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm<CompleteProfileData>({
    resolver: zodResolver(completeProfileSchema),
    mode: "onBlur",
    defaultValues: {
      displayName: user?.displayName ?? "",
    },
  });

  const handleSaveProfile = useCallback(
    async (data: CompleteProfileData) => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        await updateSelfProfile(data.displayName);

        const destination = determinePostLoginDestination({
          workspaces: workspaces ?? [],
          redirectParam: redirectUrl,
          allowedRedirectDomains,
          requiresProfileCompletion: false,
        });

        // Force fresh auth bootstrap so profile gate sees the latest displayName.
        window.location.assign(destination);
      } catch {
        setErrorMessage("We couldn't save your name right now. Please try again.");
        setFocus("displayName");
      } finally {
        setIsLoading(false);
      }
    },
    [allowedRedirectDomains, redirectUrl, setFocus, workspaces],
  );

  return (
    <form
      method="post"
      onSubmit={handleSubmit(handleSaveProfile)}
      className="space-y-4"
      noValidate
    >
      {errorMessage ? (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {errorMessage}
        </div>
      ) : null}

      <div className="space-y-2">
        <label
          htmlFor="displayName"
          className="block text-sm font-medium text-foreground"
        >
          Full name
        </label>
        <Input
          id="displayName"
          placeholder="Enter your full name"
          autoComplete="name"
          aria-invalid={Boolean(errors.displayName)}
          aria-describedby={errors.displayName ? "display-name-error" : undefined}
          invalid={Boolean(errors.displayName)}
          {...register("displayName")}
        />
        {errors.displayName?.message ? (
          <p
            id="display-name-error"
            role="alert"
            aria-live="polite"
            className="text-sm text-red-600"
          >
            {errors.displayName.message}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        isLoading={isLoading}
        loadingText="Saving..."
        className="w-full"
      >
        Continue
      </Button>
    </form>
  );
}
