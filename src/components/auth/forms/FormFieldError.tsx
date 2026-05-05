interface FormFieldErrorProps {
  id: string;
  message?: string;
}

export function FormFieldError({
  id,
  message,
}: FormFieldErrorProps) {
  const hasMessage = Boolean(message);

  if (!hasMessage) {
    return null;
  }

  return (
    <p
      id={id}
      role="alert"
      aria-live="polite"
      className="text-sm text-red-600 dark:text-red-400"
    >
      {message}
    </p>
  );
}
