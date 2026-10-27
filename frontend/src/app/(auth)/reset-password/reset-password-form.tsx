"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import AuthFormMessage from "@/components/auth/auth-form-message";
import { confirmPasswordReset } from "@/features/auth/service";

interface ResetPasswordFormProps {
  uid: string;
  token: string;
}

export default function ResetPasswordForm({ uid, token }: ResetPasswordFormProps) {
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const password = String(form.get("new-password") || "");
    const confirmPassword = String(form.get("confirm-password") || "");

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      setPending(false);
      return;
    }

    try {
      await confirmPasswordReset({
        uid,
        token,
        new_password: password,
        new_password_confirm: confirmPassword,
      });
      setComplete(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not reset the password. Request a new link and try again.",
      );
    } finally {
      setPending(false);
    }
  }

  if (!uid || !token) {
    return (
      <div className="space-y-5">
        <AuthFormMessage>
          This reset link is incomplete. Request a new one to continue.
        </AuthFormMessage>
        <Link className="primary-button w-full justify-center" href="/forgot-password">
          Request another link
        </Link>
      </div>
    );
  }

  if (complete) {
    return (
      <div className="space-y-5">
        <AuthFormMessage kind="success">
          Password reset. You can now sign in with your new password.
        </AuthFormMessage>
        <Link className="primary-button w-full justify-center" href="/login">
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {error && <AuthFormMessage>{error}</AuthFormMessage>}
      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="new-password">
          New password
        </label>
        <input
          className="field"
          id="new-password"
          name="new-password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="confirm-password">
          Confirm new password
        </label>
        <input
          className="field"
          id="confirm-password"
          name="confirm-password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <button
        className="primary-button w-full justify-center"
        type="submit"
        disabled={pending}
      >
        {pending ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
