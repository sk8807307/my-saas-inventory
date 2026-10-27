"use client";

import { navigationGroups } from "@/config/navigation";
import { Boxes, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type AppSidebarProps = {
  collapsed: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
};

export default function AppSidebar({
  collapsed,
  onToggle,
  onNavigate,
}: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className="surface flex h-full flex-col border-r subtle-border"
      style={{ width: collapsed ? 76 : 252 }}
    >
      <div className="flex h-18 items-center gap-3 border-b subtle-border px-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-(--primary) text-white" aria-hidden="true">
          <Boxes size={21} />
        </div>

        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold tracking-tight">
              Nexa ERP
            </p>
            <p className="muted-text text-[11px]">Business management</p>
          </div>
        )}
      </div>

      <nav aria-label="Primary navigation" className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {navigationGroups.map((group) => (
          <section key={group.label}>
            {!collapsed && (
              <h2 className="muted-text mb-2 px-3 text-[10px] font-bold tracking-[0.13em]">
                {group.label}
              </h2>
            )}

            <div className="space-y-1">
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors"
                    style={{
                      background: active ? "var(--primary-soft)" : "transparent",
                      color: active ? "var(--primary)" : "var(--muted)",
                      justifyContent: collapsed ? "center" : "flex-start",
                    }}
                  >
                    <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
                    {!collapsed && <span>{item.label}</span>}
                    {active && !collapsed && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-(--primary)" aria-hidden="true" />
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      {onToggle && (
        <div className="border-t subtle-border p-3">
          <button
            type="button"
            onClick={onToggle}
            className="surface-hover muted-text flex h-10 w-full items-center justify-center gap-2 rounded-lg text-xs"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen size={17} aria-hidden="true" />
            ) : (
              <>
                <PanelLeftClose size={17} aria-hidden="true" />
                <span>Collapse sidebar</span>
              </>
            )}
          </button>
        </div>
      )}
    </aside>
  );
}
