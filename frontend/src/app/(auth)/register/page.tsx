
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import AuthCard from "@/components/auth/auth-card";
import AuthFormMessage from "@/components/auth/auth-form-message";
import { register } from "@/features/auth/service";
import { getErrorMessage } from "@/lib/http";

export default function RegisterPage() {
  const router = useRouter();

  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setPending(true);

    const form = new FormData(event.currentTarget);

    const firstName = String(form.get("first_name") ?? "").trim();
    const lastName = String(form.get("last_name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirm_password") ?? "");

    if (password !== confirmPassword) {
      setError("Your passwords do not match. Please try again.");
      setPending(false);
      return;
    }

    try {
      await register({
        first_name: firstName,
        last_name: lastName,
        email,
        password,
      });

      setSuccess("Your account has been created. Redirecting to sign in…");

      router.replace("/login");
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="Create your account"
      description="Get started with Nexa ERP to manage your business in one place."
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        {error && (
          <div role="alert">
            <AuthFormMessage>{error}</AuthFormMessage>
          </div>
        )}

        {success && (
          <div
            className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300"
            role="status"
          >
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              className="block text-sm font-medium"
              htmlFor="first_name"
            >
              First name
            </label>
            <input
              className="field w-full"
              id="first_name"
              name="first_name"
              type="text"
              autoComplete="given-name"
              maxLength={150}
              placeholder="Jane"
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <label
              className="block text-sm font-medium"
              htmlFor="last_name"
            >
              Last name
            </label>
            <input
              className="field w-full"
              id="last_name"
              name="last_name"
              type="text"
              autoComplete="family-name"
              maxLength={150}
              placeholder="Smith"
              disabled={pending}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="email">
            Email address
          </label>
          <input
            className="field w-full"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={254}
            placeholder="you@company.com"
            required
            disabled={pending}
          />
          <p className="muted-text text-xs">
            Use an email address you can access.
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="password">
            Password
          </label>

          <div className="relative">
            <input
              className="field w-full pr-20"
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Create a strong password"
              minLength={8}
              required
              disabled={pending}
            />

            <button
              className="absolute inset-y-0 right-3 my-auto text-sm font-medium text-(--primary) hover:underline disabled:opacity-50"
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              disabled={pending}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <p className="muted-text text-xs">
            Use at least 8 characters.
          </p>
        </div>

        <div className="space-y-2">
          <label
            className="block text-sm font-medium"
            htmlFor="confirm_password"
          >
            Confirm password
          </label>
          <input
            className="field w-full"
            id="confirm_password"
            name="confirm_password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Enter your password again"
            minLength={8}
            required
            disabled={pending}
          />
        </div>

        <button
          className="primary-button flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={pending}
        >
          {pending && (
            <span
              className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
              aria-hidden="true"
            />
          )}
          {pending ? "Creating account…" : "Create account"}
        </button>

        <p className="muted-text text-center text-xs">
          By creating an account, you agree to follow your organization&apos;s
          account and security policies.
        </p>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-(--border,theme(colors.gray.200))" />
        <span className="muted-text text-xs">ALREADY REGISTERED?</span>
        <div className="h-px flex-1 bg-(--border,theme(colors.gray.200))" />
      </div>

      <p className="text-center text-sm">
        Already have an account?{" "}
        <Link
          className="font-medium text-(--primary) hover:underline"
          href="/login"
        >
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
