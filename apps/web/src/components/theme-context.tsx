'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light';

interface ThemeContextType {
  theme: Theme;
  activeBranch: string;
  setActiveBranch: (branch: string) => void;
  adminPin: string;
  setAdminPin: (pin: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [activeBranch, setActiveBranch] = useState('Sucursal Matriz');
  const [adminPin, setAdminPin] = useState('9999');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Forzar Tema Claro y remover cualquier rastro de tema oscuro del HTML/DOM
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
      window.localStorage.setItem('snapgad_theme', 'light');
      
      const savedBranch = window.localStorage.getItem('snapgad_active_branch');
      if (savedBranch) setActiveBranch(savedBranch);

      const savedPin = window.localStorage.getItem('snapgad_admin_pin');
      if (savedPin) setAdminPin(savedPin);
    }
  }, []);

  const handleSetBranch = (branch: string) => {
    setActiveBranch(branch);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('snapgad_active_branch', branch);
    }
  };

  const handleSetPin = (pin: string) => {
    setAdminPin(pin);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('snapgad_admin_pin', pin);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme: 'light', activeBranch, setActiveBranch: handleSetBranch, adminPin, setAdminPin: handleSetPin }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useAppTheme must be used within a ThemeProvider');
  return context;
}
