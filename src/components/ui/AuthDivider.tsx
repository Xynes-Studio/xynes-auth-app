"use client";

import { Flex } from "@lumia-ui/components";
import { useTranslations } from "next-intl";

interface AuthDividerProps {
  /**
   * Optional override for the divider copy. When omitted, the divider falls
   * back to the localized `auth.common.divider.orContinueWith` translation
   * so the OAuth divider stays in step with the rest of the auth surface.
   */
  text?: string;
}

/**
 * Reusable divider component for auth forms.
 * Displays a horizontal line with text in the middle (default: localized
 * "Or continue with"). Consumers may pass `text` to override the copy
 * with another translated string from their own catalog namespace.
 */
export function AuthDivider({ text }: AuthDividerProps) {
  const t = useTranslations("auth.common.divider");
  const resolvedText = text ?? t("orContinueWith");
  return (
    <Flex className="relative" align="center">
      <div className="relative flex justify-center text-xs uppercase">
        <span className="px-2 text-gray-500">{resolvedText}</span>
      </div>
      <div className="flex-1 ml-2">
        <span className="block w-full border-t border-gray-300" />
      </div>
    </Flex>
  );
}
