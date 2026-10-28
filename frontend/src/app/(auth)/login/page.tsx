"use client";

import AuthCard from "@/components/auth/auth-card";
import AuthFormMessage from "@/components/auth/auth-form-message";
import {
  getCurrentSession,
  login,
  selectTenant,
} from "@/features/auth/service";
import type { AuthSession } from "@/features/auth/types";
import { ApiError, getErrorMessage } from "@/lib/http";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

// Use active workspaces only. Django still checks access when one is selected.
async function destinationAfterSignIn(session: AuthSession): Promise<string> {
  const memberships = session.memberships.filter(
    (membership) =>
      membership.status === "active" && membership.tenant.is_active,
  );

  if (memberships.length === 1) {
    await selectTenant(memberships[0].tenant.id);
    return "/dashboard";
  }

  // The dashboard is workspace-neutral; choose a tenant when opening tenant data.
  return "/dashboard";
}

export default function LoginPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    // Existing sessions follow the same workspace-selection rule as new logins.
    getCurrentSession()
      .then(async (session) => {
        const destination = await destinationAfterSignIn(session);
        if (active) router.replace(destination);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        // A signed-out /me/ response is normal on the sign-in page.
        if (
          !(requestError instanceof ApiError) ||
          (requestError.status !== 401 && requestError.status !== 403)
        ) {
          setError(getErrorMessage(requestError));
        }
        
      });

    return () => {
      active = false;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");

    try {
      const session = await login({ email, password });
      router.replace(await destinationAfterSignIn(session));
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="Sign in to your workspace"
      description="Use your Nexa ERP account email and password."
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        {error && <AuthFormMessage>{error}</AuthFormMessage>}
        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="email">
            Email address
          </label>
          <input
            className="field"
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            maxLength={254}
            required
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label className="block text-sm font-medium" htmlFor="password">
              Password
            </label>
            <Link
              className="text-sm text-(--primary) hover:underline"
              href="/forgot-password"
            >
              Forgot password?
            </Link>
          </div>
          <input
            className="field"
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <button
          className="primary-button w-full justify-center"
          type="submit"
          disabled={pending}
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="muted-text mt-6 text-center text-sm">
        Need an account? {" "}
        <Link className="font-medium text-(--primary) hover:underline"
          href="/register"
        >
          Register here
        </Link>
      </p>
    </AuthCard>
  );
}
