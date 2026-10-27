import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="muted-text mt-1 text-sm">{description}</p>
      </div>
      {action && <div>{action}</div>}
    </header>
  );
}
