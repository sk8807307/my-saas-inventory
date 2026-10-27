import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { PackageOpen } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon: Icon = PackageOpen,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <section
      className={`surface rounded-xl border subtle-border px-6 py-10 text-center sm:px-10 ${className}`}
      role="status"
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
        <Icon size={22} aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-base font-semibold">{title}</h2>
      <p className="muted-text mx-auto mt-2 max-w-md text-sm leading-6">
        {description}
      </p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </section>
  );
}
