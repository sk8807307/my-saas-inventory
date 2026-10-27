import * as React from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "outline";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-[var(--surface-hover)] text-[var(--muted)]",
  success: "bg-[var(--success-soft)] text-[var(--success)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
  danger: "bg-[color-mix(in_srgb,var(--danger)_12%,var(--surface))] text-[var(--danger)]",
  info: "bg-[var(--primary-soft)] text-[var(--primary)]",
  outline: "border subtle-border bg-transparent text-[var(--muted)]",
};

export function Badge({
  variant = "default",
  className = "",
  ...props
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex min-h-6 items-center rounded-full px-2.5 py-1",
        "text-xs font-semibold leading-4",
        variantStyles[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
