'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light';

interface ThemeContextType {
  theme: Theme;
  activeBranch: string;
  activeBranchId: string;
  activeRegister: string;
  setActiveBranch: (branch: string) => void;
  setActiveBranchId: (branchId: string) => void;
  setActiveRegister: (register: string) => void;
  adminPin: string;
  setAdminPin: (pin: string) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  isAdminUnlocked: boolean;
  setIsAdminUnlocked: (unlocked: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [activeBranch, setActiveBranchState] = useState('Matriz Centro');
  const [activeBranchId, setActiveBranchIdState] = useState('BR-01');
  const [activeRegister, setActiveRegisterState] = useState('Caja 01 - Principal');
  const [adminPin, setAdminPin] = useState('0000');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Force light theme
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
      window.localStorage.setItem('snapgad_theme', 'light');
      
      const savedBranch = window.localStorage.getItem('snapgad_active_branch');
      if (savedBranch) setActiveBranchState(savedBranch);

      const savedBranchId = window.localStorage.getItem('snapgad_active_branch_id');
      if (savedBranchId) setActiveBranchIdState(savedBranchId);

      const savedRegister = window.localStorage.getItem('snapgad_active_register');
      if (savedRegister) setActiveRegisterState(savedRegister);

      const savedPin = window.localStorage.getItem('snapgad_admin_pin');
      if (savedPin) setAdminPin(savedPin);

      const savedCollapsed = window.localStorage.getItem('snapgad_sidebar_collapsed');
      if (savedCollapsed) setIsSidebarCollapsed(savedCollapsed === 'true');
    }
  }, []);

  const handleSetBranch = (branch: string) => {
    setActiveBranchState(branch);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('snapgad_active_branch', branch);
    }
  };

  const handleSetBranchId = (branchId: string) => {
    setActiveBranchIdState(branchId);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('snapgad_active_branch_id', branchId);
    }
  };

  const handleSetRegister = (register: string) => {
    setActiveRegisterState(register);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('snapgad_active_register', register);
    }
  };

  const handleSetPin = (pin: string) => {
    setAdminPin(pin);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('snapgad_admin_pin', pin);
    }
  };

  const handleSetCollapsed = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('snapgad_sidebar_collapsed', String(collapsed));
    }
  };

  return (
    <ThemeContext.Provider value={{ 
      theme: 'light', 
      activeBranch,
      activeBranchId,
      activeRegister,
      setActiveBranch: handleSetBranch,
      setActiveBranchId: handleSetBranchId,
      setActiveRegister: handleSetRegister,
      adminPin, 
      setAdminPin: handleSetPin,
      isSidebarCollapsed,
      setIsSidebarCollapsed: handleSetCollapsed,
      isAdminUnlocked,
      setIsAdminUnlocked
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useAppTheme must be used within a ThemeProvider');
  return context;
}
