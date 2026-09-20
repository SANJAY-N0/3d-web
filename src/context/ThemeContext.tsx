import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  isAutoTimeBased: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  currentTimeString: string;
  isDayTime: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Day Mode: 6:00 AM (06:00) to 5:59:59 PM (17:59:59)
// Night Mode: 6:00 PM (18:00) to 5:59:59 AM (05:59:59)
export function getSystemTimeTheme(): Theme {
  const now = new Date();
  const hours = now.getHours();
  // 6 AM to 5:59 PM is Day (Light mode)
  if (hours >= 6 && hours < 18) {
    return 'light';
  }
  // 6 PM to 5:59 AM is Night (Dark mode)
  return 'dark';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // 1. Check if user previously selected a theme preference
    const savedTheme = localStorage.getItem('printlab_theme') as Theme | null;
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }
    // 2. Otherwise determine automatically from current local time
    return getSystemTimeTheme();
  });

  const [isAutoTimeBased, setIsAutoTimeBased] = useState<boolean>(() => {
    return !localStorage.getItem('printlab_theme');
  });

  const [currentTimeString, setCurrentTimeString] = useState<string>('');
  const [isDayTime, setIsDayTime] = useState<boolean>(() => {
    const h = new Date().getHours();
    return h >= 6 && h < 18;
  });

  // Check and sync theme automatically based on local time if no manual preference set
  useEffect(() => {
    const updateTimeAndTheme = () => {
      const now = new Date();
      const hours = now.getHours();
      const isDay = hours >= 6 && hours < 18;
      setIsDayTime(isDay);

      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setCurrentTimeString(timeStr);

      if (isAutoTimeBased) {
        const timeTheme: Theme = isDay ? 'light' : 'dark';
        setThemeState(timeTheme);
      }
    };

    updateTimeAndTheme();
    // Check every 30 seconds for seamless transition
    const interval = setInterval(updateTimeAndTheme, 30000);
    return () => clearInterval(interval);
  }, [isAutoTimeBased]);

  // Apply theme to DOM
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      root.style.colorScheme = 'light';
    }
  }, [theme]);

  const toggleTheme = () => {
    setIsAutoTimeBased(false); // manual override
    setThemeState((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('printlab_theme', next);
      return next;
    });
  };

  const setTheme = (newTheme: Theme) => {
    setIsAutoTimeBased(false);
    localStorage.setItem('printlab_theme', newTheme);
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isAutoTimeBased,
        toggleTheme,
        setTheme,
        currentTimeString,
        isDayTime,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

