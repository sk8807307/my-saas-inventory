import { Badge } from "@/components/ui/badge";
import PageContainer from "@/components/layout/page-container";

export default function ComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <PageContainer title={title} description={description}>
      <section className="surface rounded-xl border subtle-border p-8 text-center sm:p-12">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
          <span className="text-2xl font-semibold">N</span>
        </div>

        <h2 className="mt-5 text-lg font-semibold">{title} module</h2>
        <p className="muted-text mx-auto mt-2 max-w-md text-sm leading-6">
          {description} This area is reserved for a future implementation.
        </p>
        <Badge variant="info" className="mt-5">
          Foundation phase
        </Badge>
      </section>
    </PageContainer>
  );
}
