import { Flex } from "@lumia-ui/components";

interface AuthDividerProps {
  text?: string;
}

/**
 * Reusable divider component for auth forms.
 * Displays a horizontal line with text in the middle (e.g., "Or continue with").
 */
export function AuthDivider({ text = "Or continue with" }: AuthDividerProps) {
  return (
    <Flex className="relative" align="center">
      <div className="relative flex justify-center text-xs uppercase">
        <span className="px-2 text-gray-500">{text}</span>
      </div>
      <div className="flex-1 ml-2">
        <span className="block w-full border-t border-gray-300" />
      </div>
    </Flex>
  );
}
