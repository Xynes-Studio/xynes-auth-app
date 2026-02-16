interface UnderDevelopmentPanelProps {
  title: string;
  description?: string;
}

export function UnderDevelopmentPanel({
  title,
  description = "This section is under development.",
}: UnderDevelopmentPanelProps) {
  return (
    <section className="flex h-full min-h-[420px] items-center justify-center rounded-lg border border-[#d6d9de] bg-[#f8fafc] p-8">
      <div className="w-full max-w-xl rounded-xl border border-[#e2e8f0] bg-white/70 p-8 text-center">
        <p className="text-lg font-semibold text-foreground">{title}</p>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
    </section>
  );
}
