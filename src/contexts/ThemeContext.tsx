import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface ThemeConfig {
  backgroundHue: number;
  backgroundSaturation: number;
  backgroundLightness: number;
  buttonHue: number;
  buttonSaturation: number;
  buttonLightness: number;
  textHue: number;
  textSaturation: number;
  textLightness: number;
}

const defaultTheme: ThemeConfig = {
  backgroundHue: 220,
  backgroundSaturation: 80,
  backgroundLightness: 12,
  buttonHue: 45,
  buttonSaturation: 100,
  buttonLightness: 55,
  textHue: 0,
  textSaturation: 0,
  textLightness: 100,
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
      "--background",
      `${theme.backgroundHue} ${theme.backgroundSaturation}% ${theme.backgroundLightness}%`
    );
    root.style.setProperty(
      "--primary",
      `${theme.buttonHue} ${theme.buttonSaturation}% ${theme.buttonLightness}%`
    );
    
    // Update related colors
    root.style.setProperty(
      "--card",
      `${theme.backgroundHue} ${theme.backgroundSaturation - 10}% ${theme.backgroundLightness + 3}%`
    );
    root.style.setProperty(
      "--popover",
      `${theme.backgroundHue} ${theme.backgroundSaturation - 10}% ${theme.backgroundLightness + 3}%`
    );
    root.style.setProperty(
      "--secondary",
      `${theme.backgroundHue} ${theme.backgroundSaturation - 20}% ${theme.backgroundLightness + 8}%`
    );
    root.style.setProperty(
      "--muted",
      `${theme.backgroundHue} ${theme.backgroundSaturation - 20}% ${theme.backgroundLightness + 13}%`
    );
    root.style.setProperty(
      "--border",
      `${theme.backgroundHue} ${theme.backgroundSaturation - 20}% ${theme.backgroundLightness + 13}%`
    );
    root.style.setProperty(
      "--input",
      `${theme.backgroundHue} ${theme.backgroundSaturation - 20}% ${theme.backgroundLightness + 8}%`
    );
    root.style.setProperty(
      "--accent",
      `${theme.buttonHue} ${theme.buttonSaturation}% ${theme.buttonLightness}%`
    );
    root.style.setProperty(
      "--ring",
      `${theme.buttonHue} ${theme.buttonSaturation}% ${theme.buttonLightness}%`
    );
    root.style.setProperty(
      "--primary-foreground",
      `${theme.backgroundHue} ${theme.backgroundSaturation}% ${theme.backgroundLightness}%`
    );
    root.style.setProperty(
      "--accent-foreground",
      `${theme.backgroundHue} ${theme.backgroundSaturation}% ${theme.backgroundLightness}%`
    );
    root.style.setProperty(
      "--foreground",
      `${theme.textHue} ${theme.textSaturation}% ${theme.textLightness}%`
    );
    root.style.setProperty(
      "--card-foreground",
      `${theme.textHue} ${theme.textSaturation}% ${theme.textLightness}%`
    );
    root.style.setProperty(
      "--popover-foreground",
      `${theme.textHue} ${theme.textSaturation}% ${theme.textLightness}%`
    );
    root.style.setProperty(
      "--secondary-foreground",
      `${theme.textHue} ${theme.textSaturation}% ${theme.textLightness}%`
    );
    root.style.setProperty(
      "--muted-foreground",
      `${theme.textHue} ${Math.max(theme.textSaturation - 60, 0)}% ${Math.max(theme.textLightness - 26, 30)}%`
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
