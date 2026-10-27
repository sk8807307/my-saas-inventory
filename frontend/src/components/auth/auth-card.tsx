import type { ReactNode } from "react";

interface AuthCardProps {
  title: string;
  description: string;
  children: ReactNode;
}

export default function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <section className="surface w-full max-w-md rounded-2xl border subtle-border p-6 shadow-xl sm:p-8">
      <div className="mb-7">
        <p className="mb-2 text-sm font-bold tracking-wide text-(--primary)">
          NEXA ERP
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="muted-text mt-2 text-sm leading-6">{description}</p>
      </div>
      {children}
    </section>
  );
}
