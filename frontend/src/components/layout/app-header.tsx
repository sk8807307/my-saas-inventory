"use client";

import { Bell, Menu, Moon, Search, Sun } from "lucide-react";
import AuthControls from "@/components/auth/auth-controls";
import type { AuthSession } from "@/features/auth/types";

interface AppHeaderProps {
  session: AuthSession;
  dark: boolean;
  mobileMenuOpen: boolean;
  onToggleTheme: () => void;
  onOpenMobileMenu: () => void;
}

export default function AppHeader({
  session,
  dark,
  mobileMenuOpen,
  onToggleTheme,
  onOpenMobileMenu,
}: AppHeaderProps) {
  return (
    <header className="surface flex h-18 items-center gap-3 border-b subtle-border px-4 sm:px-6">
      <button
        type="button"
        className="icon-button md:hidden!"
        onClick={onOpenMobileMenu}
        aria-label="Open navigation"
        aria-haspopup="dialog"
        aria-expanded={mobileMenuOpen}
        aria-controls="mobile-navigation-dialog"
      >
        <Menu size={19} aria-hidden="true" />
      </button>

      <div className="relative hidden max-w-md flex-1 sm:block">
        <Search
          size={17}
          aria-hidden="true"
          className="muted-text absolute left-3 top-1/2 -translate-y-1/2"
        />
        <input
          className="field pl-9! text-sm"
          placeholder="Search your workspace..."
          aria-label="Search workspace"
        />
        <span className="muted-text absolute right-3 top-1/2 hidden -translate-y-1/2 text-[10px] lg:block">
          Demo
        </span>
      </div>

      <div className="flex-1 sm:hidden">
        <p className="text-sm font-semibold">Nexa ERP</p>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          className="icon-button"
          onClick={onToggleTheme}
          aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
        >
          {dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
        </button>
        <button
          type="button"
          className="icon-button relative"
          aria-label="Notifications (demo)"
        >
          <Bell size={18} aria-hidden="true" />
          <span className="absolute right-2.25 top-2 h-1.5 w-1.5 rounded-full bg-(--danger)" />
        </button>
        <div className="ml-1 flex items-center gap-2 border-l subtle-border pl-3">
          <AuthControls session={session} />
        </div>
      </div>
    </header>
  );
}
