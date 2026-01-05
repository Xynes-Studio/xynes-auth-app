interface AuthDividerProps {
  text?: string;
}

/**
 * Reusable divider component for auth forms.
 * Displays a horizontal line with text in the middle (e.g., "Or continue with").
 */
export function AuthDivider({ text = "Or continue with" }: AuthDividerProps) {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-gray-300" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-white px-2 text-gray-500">{text}</span>
      </div>
    </div>
  );
}
