import { LoaderCircle } from "lucide-react";

export default function PageLoader({
  message = "Loading Nexa ERP...",
}: {
  message?: string;
}) {
  return (
    <main
      className="app-bg flex min-h-screen items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4">
        <LoaderCircle
          className="animate-spin text-[var(--primary)]"
          size={36}
          aria-hidden="true"
        />
        <p className="muted-text text-sm">{message}</p>
      </div>
    </main>
  );
}
