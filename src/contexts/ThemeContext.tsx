import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface ThemeConfig {
  primaryHue: number;
  primarySaturation: number;
  primaryLightness: number;
}

const defaultTheme: ThemeConfig = {
  primaryHue: 262.1,
  primarySaturation: 83.3,
  primaryLightness: 57.8,
};

interface ThemeContextType {
  theme: ThemeConfig;
  setTheme: (theme: ThemeConfig) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeConfig>(() => {
    const saved = localStorage.getItem("theme");
    return saved ? JSON.parse(saved) : defaultTheme;
  });

  useEffect(() => {
    localStorage.setItem("theme", JSON.stringify(theme));
    
    // Apply theme to CSS variables
    const root = document.documentElement;
    root.style.setProperty(
      "--primary",
      `${theme.primaryHue} ${theme.primarySaturation}% ${theme.primaryLightness}%`
    );
  }, [theme]);

  const setTheme = (newTheme: ThemeConfig) => {
    setThemeState(newTheme);
  };

  const resetTheme = () => {
    setThemeState(defaultTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};
