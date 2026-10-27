"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import AuthCard from "@/components/auth/auth-card";
import AuthFormMessage from "@/components/auth/auth-form-message";
import { requestPasswordReset } from "@/features/auth/service";

export default function ForgotPasswordPage() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();

    try {
      await requestPasswordReset({ email });
      setSent(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not send the request. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="Reset your password"
      description="Enter your email and we’ll send instructions if it matches an account."
    >
      {sent ? (
        <div className="space-y-5">
          <AuthFormMessage kind="success">
            If an account matches, a reset link will be sent.
          </AuthFormMessage>
          <Link className="primary-button w-full justify-center" href="/login">
            Return to sign in
          </Link>
        </div>
      ) : (
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
              autoComplete="email"
              autoCapitalize="none"
              maxLength={254}
              required
            />
          </div>
          <button
            className="primary-button w-full justify-center"
            type="submit"
            disabled={pending}
          >
            {pending ? "Sending…" : "Send reset link"}
          </button>
          <p className="text-center text-sm">
            <Link className="font-medium text-(--primary) hover:underline" href="/login">
              Return to sign in
            </Link>
          </p>
        </form>
      )}
    </AuthCard>
  );
}
