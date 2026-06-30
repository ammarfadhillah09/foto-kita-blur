"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export const DAISY_THEMES = [
  { value: 'dracula', label: 'Default' },
  { value: 'retro', label: 'Retro' },
  { value: 'synthwave', label: 'Pixel' },
] as const;

export type DaisyTheme = (typeof DAISY_THEMES)[number]['value'];

interface ThemeContextType {
  activeTheme: DaisyTheme;
  setActiveTheme: (theme: DaisyTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [activeTheme, setActiveTheme] = useState<DaisyTheme>('dracula');

  // Initialize theme from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('ui-theme') as DaisyTheme | null;
      if (savedTheme && DAISY_THEMES.some(t => t.value === savedTheme)) {
        setActiveTheme(savedTheme);
      }
    }
  }, []);

  // Save theme and apply data-theme (for legacy CSS)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', activeTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ui-theme', activeTheme);
    }
  }, [activeTheme]);

  return (
    <ThemeContext.Provider value={{ activeTheme, setActiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
