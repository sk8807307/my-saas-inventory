"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import AppSidebar from "./app-sidebar";

type MobileSidebarProps = {
  open: boolean;
  onClose: () => void;
};

export default function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const desktopViewport = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => {
      if (desktopViewport.matches) onClose();
    };

    desktopViewport.addEventListener("change", closeOnDesktop);
    return () => desktopViewport.removeEventListener("change", closeOnDesktop);
  }, [onClose]);
  useEffect(() => {
    if (!open) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousBodyOverflow = document.body.style.overflow;
    const dialog = dialogRef.current;
    const focusableSelector =
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const getFocusableElements = () =>
      dialog
        ? Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
        : [];

    document.body.style.overflow = "hidden";
    (getFocusableElements()[0] ?? dialog)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements();
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!firstElement || !lastElement) {
        event.preventDefault();
        dialog?.focus();
      } else if (
        event.shiftKey &&
        (document.activeElement === firstElement || !dialog?.contains(document.activeElement))
      ) {
        event.preventDefault();
        lastElement.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === lastElement || !dialog?.contains(document.activeElement))
      ) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-black/50"
      />

      <div
        id="mobile-navigation-dialog"
        ref={dialogRef}
        className="surface absolute inset-y-0 left-0 flex shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Main navigation"
        tabIndex={-1}
      >
        <AppSidebar collapsed={false} onNavigate={onClose} />
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onClose}
          className="surface absolute left-65 top-4 rounded-lg border subtle-border p-2 shadow"
          data-drawer-close="true"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
