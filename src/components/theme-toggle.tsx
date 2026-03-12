"use client";

import { useState, useEffect } from "react";
import { Moon, Sun, Laptop } from "lucide-react";

type Theme = "dark" | "light" | "system";

function validateStoredTheme(stored: string | null): Theme {
  return (stored === "dark" || stored === "light") ? stored : "system";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  const applyTheme = (t: Theme) => {
    let activeTheme = t;
    if (t === "system") {
      activeTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    document.documentElement.setAttribute("data-theme", activeTheme);
  };

  // Mount-only: sync the initial validated theme to the DOM.
  useEffect(() => {
    const stored = validateStoredTheme(localStorage.getItem("hillpost-theme"));
    setTheme(stored);
    applyTheme(stored);
  }, []);

  // Only register the system-preference listener when in system mode.
  useEffect(() => {
    if (theme !== "system") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyTheme("system");
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const toggle = () => {
    const nextMap: Record<Theme, Theme> = {
      system: "dark",
      dark: "light",
      light: "system",
    };
    const next = nextMap[theme];
    
    setTheme(next);
    
    if (next === "system") {
      localStorage.removeItem("hillpost-theme");
    } else {
      localStorage.setItem("hillpost-theme", next);
    }
    
    applyTheme(next);
  };

  const getIcon = () => {
    switch (theme) {
      case "dark": return <Moon className="h-4 w-4" />;
      case "light": return <Sun className="h-4 w-4" />;
      case "system": return <Laptop className="h-4 w-4" />;
    }
  };

  const getTitle = () => {
    switch (theme) {
      case "dark": return "Switch to light mode";
      case "light": return "Switch to system theme";
      case "system": return "Switch to dark mode";
    }
  };

  return (
    <button
      onClick={toggle}
      className="p-2 text-[#555555] hover:text-[#00FF41] transition-colors"
      title={getTitle()}
      aria-label={getTitle()}
    >
      {getIcon()}
    </button>
  );
}
