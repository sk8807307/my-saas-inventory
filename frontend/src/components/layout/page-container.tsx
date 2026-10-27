import type { ReactNode } from "react";

type PageContainerProps = {
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
};

export default function PageContainer({
  title,
  description,
  actions,
  children,
}: PageContainerProps) {
  return (
    <main
      className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8"
      aria-labelledby="page-title"
    >
      <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h1
            id="page-title"
            className="text-2xl font-bold tracking-tight sm:text-[28px]"
          >
            {title}
          </h1>
          <p id="page-description" className="muted-text mt-1 text-sm">
            {description}
          </p>
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {actions}
          </div>
        )}
      </header>

      {children}
    </main>
  );
}
