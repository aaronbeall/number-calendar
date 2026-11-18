import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  prefersDark: boolean;
  appliedTheme: "light" | "dark";
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const isDarkPreferred = () => 
  window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

export function ThemeProvider({ children }: { children: React.ReactNode }) {

  const prefersDark = useMemo(() => isDarkPreferred(), []);

  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem("theme") as Theme) || "system";
  });

  const appliedTheme = useMemo(() => {
    if (theme === "light") return "light";
    if (theme === "dark") return "dark";
    return prefersDark ? "dark" : "light";
  }, [theme, prefersDark]);

  useEffect(() => {
    window.document.documentElement.classList.toggle("dark", appliedTheme === "dark");
    localStorage.setItem("theme", theme);
    syncThemeColor(theme);
  }, [appliedTheme, theme]);

  const isDark = appliedTheme === "dark";

  return (
    <ThemeContext.Provider value={{ theme, setTheme, prefersDark, appliedTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

const THEME_COLORS = { light: "#ffffff", dark: "#28323b" } as const;

/**
 * index.html has one theme-color tag per color scheme, so the browser UI follows the OS setting.
 * When the user picks a theme in the app, point both tags at that theme's color instead.
 */
function syncThemeColor(theme: Theme) {
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach(meta => {
    const scheme = meta.media.includes("dark") ? "dark" : "light";
    meta.content = THEME_COLORS[theme === "system" ? scheme : theme];
  });
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
}
