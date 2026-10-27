"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { logout } from "@/features/auth/service";
import type { AuthSession } from "@/features/auth/types";

export default function AuthControls({ session }: { session: AuthSession }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    setPending(true);
    setError("");

    try {
      await logout();
      // Django clears the session cookie; the proxy then sends protected visits to login.
      router.replace("/login");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not sign out. Please try again.",
      );
      setPending(false);
    }
  }

  const name =
    [session.user.first_name, session.user.last_name].filter(Boolean).join(" ") ||
    session.user.email;
  const workspaceCount = session.memberships.length;
  const workspaceText = workspaceCount
    ? `${workspaceCount} workspace${workspaceCount === 1 ? "" : "s"}`
    : "No workspace access";

  return (
    <div className="flex items-center gap-2">
      <div className="hidden max-w-48 sm:block">
        <p className="truncate text-xs font-semibold" title={name}>
          {name}
        </p>
        <p className="muted-text truncate text-[11px]" title={workspaceText}>
          {workspaceText}
        </p>
      </div>
      <button
        type="button"
        className="icon-button"
        onClick={handleLogout}
        disabled={pending}
        aria-label={pending ? "Signing out" : "Sign out"}
        title={pending ? "Signing out…" : "Sign out"}
      >
        <LogOut size={17} aria-hidden="true" />
      </button>
      {error && <p className="text-xs text-(--danger)" role="alert">{error}</p>}
    </div>
  );
}
