"use client";

import { AlertCircle, RotateCcw } from "lucide-react";

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this information. Please try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <section
      className="surface rounded-xl border subtle-border px-6 py-10 text-center sm:px-10"
      role="alert"
      aria-live="assertive"
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--warning-soft)] text-[var(--danger)]">
        <AlertCircle size={22} aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-base font-semibold">{title}</h2>
      <p className="muted-text mx-auto mt-2 max-w-md text-sm leading-6">
        {description}
      </p>
      {onRetry && (
        <button type="button" className="primary-button mt-5" onClick={onRetry}>
          <RotateCcw size={15} aria-hidden="true" />
          Try again
        </button>
      )}
    </section>
  );
}
