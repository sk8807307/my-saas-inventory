"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/app-shell";
import AuthFormMessage from "@/components/auth/auth-form-message";
import { getCurrentSession } from "@/features/auth/service";
import { ApiError } from "@/lib/http";
import type { AuthSession } from "@/features/auth/types";

interface ErpAuthGuardProps {
  children: ReactNode;
}

export default function ErpAuthGuard({ children }: ErpAuthGuardProps) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;

    getCurrentSession()
      .then((userSession) => {
        if (active) setSession(userSession);
      })
      .catch((requestError: unknown) => {
        if (!active) return;

        // The proxy checks for a cookie; Django confirms whether it is still valid.
        if (
          requestError instanceof ApiError &&
          (requestError.status === 401 || requestError.status === 403)
        ) {
          const returnTo = window.location.pathname + window.location.search;
          router.replace(`/login?next=${encodeURIComponent(returnTo)}`);
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Could not check your sign-in.",
        );
      });

    return () => {
      active = false;
    };
  }, [retry, router]);

  if (session) {
    return <AppShell session={session}>{children}</AppShell>;
  }

  // Keep the route rendered for Next.js, but hide it until Django checks the session.
  return (
    <>
      <div className="hidden" aria-hidden="true" inert>
        {children}
      </div>

      <main className="app-bg fixed inset-0 z-50 flex items-center justify-center px-4">
        {error ? (
          <section className="surface w-full max-w-md space-y-4 rounded-2xl border p-6 shadow-xl">
            <h1 className="text-lg font-semibold">Sign-in check failed</h1>
            <AuthFormMessage>{error}</AuthFormMessage>
            <button
              type="button"
              className="primary-button w-full justify-center"
              onClick={() => {
                setError("");
                setRetry((count) => count + 1);
              }}
            >
              Try again
            </button>
          </section>
        ) : (
          <p className="muted-text text-sm" role="status">
            Checking your sign-in…
          </p>
        )}
      </main>
    </>
  );
}
