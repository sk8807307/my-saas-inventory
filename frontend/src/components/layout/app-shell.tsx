"use client";

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { AuthSession } from "@/features/auth/types";
import AppHeader from "./app-header";
import AppSidebar from "./app-sidebar";
import MobileSidebar from "./mobile-sidebar";

import { useTheme } from "@/components/providers/theme-provider";

export default function AppShell({
  children,
  session,
}: {
  children: ReactNode;
  session: AuthSession;
}) {
  const { dark, toggleTheme } = useTheme();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  function toggleSidebar() {
    setCollapsed((wasCollapsed) => {
      const isCollapsed = !wasCollapsed;
      localStorage.setItem(
        "nexa-sidebar",
        isCollapsed ? "collapsed" : "expanded",
      );
      return isCollapsed;
    });
  }

  const openMobileMenu = useCallback(() => setMobileOpen(true), []);
  const closeMobileMenu = useCallback(() => setMobileOpen(false), []);

  return (
    <div className="app-bg min-h-screen">
      <div className="flex min-h-screen" inert={mobileOpen}>
        <div className="hidden shrink-0 md:block">
          <div className="sticky top-0 h-screen">
            <AppSidebar collapsed={collapsed} onToggle={toggleSidebar} />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="sticky top-0 z-30">
            <AppHeader
              session={session}
              dark={dark}
              mobileMenuOpen={mobileOpen}
              onToggleTheme={toggleTheme}
              onOpenMobileMenu={openMobileMenu}
            />
          </div>
          <div className="flex-1">{children}</div>
        </div>
      </div>

      <MobileSidebar open={mobileOpen} onClose={closeMobileMenu} />
    </div>
  );
}
