"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function DashboardError({ retry }: { error: Error; retry: () => void }) {
  return (
    <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
      <ErrorState
        title="Dashboard unavailable"
        description="The dashboard couldn't be displayed. Try again, or return in a moment."
        onRetry={retry}
      />
    </main>
  );
}
