import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  prefersDark: boolean;
  appliedTheme: "light" | "dark";
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
  }, [appliedTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, prefersDark, appliedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
}
