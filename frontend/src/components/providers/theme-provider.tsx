
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

const THEME_STORAGE_KEY = "nexa-theme";
const THEME_EVENT = "nexa-theme-change";
const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";

function getTheme(): boolean {
  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);

    if (savedTheme === "dark") return true;
    if (savedTheme === "light") return false;
  } catch {
    // Fall back to the system preference.
  }

  return window.matchMedia(SYSTEM_THEME_QUERY).matches;
}

function subscribeToTheme(update: () => void) {
  const systemTheme = window.matchMedia(SYSTEM_THEME_QUERY);

  window.addEventListener(THEME_EVENT, update);
  window.addEventListener("storage", update);
  systemTheme.addEventListener("change", update);

  return () => {
    window.removeEventListener(THEME_EVENT, update);
    window.removeEventListener("storage", update);
    systemTheme.removeEventListener("change", update);
  };
}

interface ThemeContextValue {
  dark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const dark = useSyncExternalStore(
    subscribeToTheme,
    getTheme,
    () => false,
  );

  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const toggleTheme = useCallback(() => {
    const nextDark = !getTheme();

    try {
      localStorage.setItem(
        THEME_STORAGE_KEY,
        nextDark ? "dark" : "light",
      );
    } catch {
      // The theme still changes for the current page.
    }

    document.documentElement.classList.toggle("dark", nextDark);
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  const value = useMemo(
    () => ({ dark, toggleTheme }),
    [dark, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
