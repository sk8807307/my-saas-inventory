import { Suspense } from "react";
import AuthCard from "@/components/auth/auth-card";
import ResetPasswordForm from "./reset-password-form";

type SearchParams = Promise<{
  uid?: string | string[];
  token?: string | string[];
}>;

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <AuthCard
      title="Choose a new password"
      description="Set a new password for your Nexa ERP account."
    >
      <Suspense
        fallback={
          <p className="muted-text text-sm" role="status">
            Loading reset link…
          </p>
        }
      >
        <ResetPasswordContent searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}

async function ResetPasswordContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Query parameters are available at request time, so read them under Suspense.
  const params = await searchParams;
  const uid = typeof params.uid === "string" ? params.uid : "";
  const token = typeof params.token === "string" ? params.token : "";

  return <ResetPasswordForm uid={uid} token={token} />;
}
