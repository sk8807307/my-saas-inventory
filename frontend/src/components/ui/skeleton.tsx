import * as React from "react";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-md bg-[var(--border)] motion-safe:animate-pulse ${className}`}
      {...props}
    />
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="surface rounded-xl border subtle-border p-5" aria-hidden="true">
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
      <Skeleton className="mt-5 h-8 w-32" />
      <Skeleton className="mt-4 h-4 w-40" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="surface rounded-xl border subtle-border p-5 sm:p-6" aria-hidden="true">
      <Skeleton className="h-5 w-36" />
      <Skeleton className="mt-2 h-3 w-52" />
      <div className="mt-7 flex h-[230px] items-end gap-3">
        {Array.from({ length: 12 }, (_, index) => (
          <Skeleton
            key={index}
            className="min-w-0 flex-1 rounded-t-md rounded-b-none"
            style={{ height: `${35 + ((index * 17) % 60)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="surface rounded-xl border subtle-border p-5 sm:p-6" aria-hidden="true">
      <Skeleton className="h-5 w-36" />
      <Skeleton className="mt-2 h-3 w-48" />
      <div className="mt-5 space-y-4">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-3 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8" role="status" aria-label="Loading dashboard">
      <span className="sr-only">Loading dashboard</span>
      <div className="mb-7 space-y-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <KpiCardSkeleton key={index} />)}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]">
        <ChartSkeleton />
        <ListSkeleton />
      </div>
    </div>
  );
}
