'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useUserSession } from './user-session';

export interface Shift {
  id: string;
  cashierId: string;
  cashierName: string;
  branchName: string;
  cashRegisterName: string;
  openingCash: number;
  openedAt: Date;
  totalSales: number;
  totalTransactions: number;
  /** Método de pago breakdown */
  salesByCash: number;
  salesByCard: number;
  salesByTransfer: number;
  salesByCredit: number;
}

interface ShiftContextType {
  activeShift: Shift | null;
  openShift: (openingCash: number, branchName?: string, cashRegisterName?: string) => void;
  closeShift: () => Shift | null;
  recordSale: (amount: number, method: 'cash' | 'card' | 'transfer' | 'credit') => void;
  elapsedTime: string;
}

const ShiftContext = createContext<ShiftContextType | null>(null);

export function ShiftProvider({ children }: { children: ReactNode }) {
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const { session } = useUserSession();

  // Restaurar turno activo desde localStorage al recargar
  useEffect(() => {
    const saved = localStorage.getItem('snapgad_active_shift');
    if (saved) {
      const parsed = JSON.parse(saved);
      parsed.openedAt = new Date(parsed.openedAt);
      setActiveShift(parsed);
    }
  }, []);

  // Reloj de turno activo
  useEffect(() => {
    if (!activeShift) {
      setElapsedTime('00:00:00');
      return;
    }
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - activeShift.openedAt.getTime()) / 1000);
      const h = Math.floor(diff / 3600).toString().padStart(2, '0');
      const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
      const s = (diff % 60).toString().padStart(2, '0');
      setElapsedTime(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeShift]);

  const openShift = (openingCash: number, branchName?: string, cashRegisterName?: string) => {
    const newShift: Shift = {
      id: `shift-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      cashierId: session?.id || 'usr-001',
      cashierName: session?.name || 'Cajero Activo',
      branchName: branchName || 'Matriz Centro',
      cashRegisterName: cashRegisterName || 'Caja 01',
      openingCash,
      openedAt: new Date(),
      totalSales: 0,
      totalTransactions: 0,
      salesByCash: 0,
      salesByCard: 0,
      salesByTransfer: 0,
      salesByCredit: 0,
    };
    setActiveShift(newShift);
    localStorage.setItem('snapgad_active_shift', JSON.stringify(newShift));
  };

  const recordSale = (amount: number, method: 'cash' | 'card' | 'transfer' | 'credit') => {
    setActiveShift((prev) => {
      if (!prev) return null;
      const updated: Shift = {
        ...prev,
        totalSales: prev.totalSales + amount,
        totalTransactions: prev.totalTransactions + 1,
        salesByCash: prev.salesByCash + (method === 'cash' ? amount : 0),
        salesByCard: prev.salesByCard + (method === 'card' ? amount : 0),
        salesByTransfer: prev.salesByTransfer + (method === 'transfer' ? amount : 0),
        salesByCredit: prev.salesByCredit + (method === 'credit' ? amount : 0),
      };
      localStorage.setItem('snapgad_active_shift', JSON.stringify(updated));
      return updated;
    });
  };

  const closeShift = (): Shift | null => {
    if (!activeShift) return null;
    const closedShift = { ...activeShift };
    localStorage.removeItem('snapgad_active_shift');
    setActiveShift(null);
    return closedShift;
  };

  return (
    <ShiftContext.Provider value={{ activeShift, openShift, closeShift, recordSale, elapsedTime }}>
      {children}
    </ShiftContext.Provider>
  );
}

export function useShift(): ShiftContextType {
  const ctx = useContext(ShiftContext);
  if (!ctx) throw new Error('useShift must be used inside ShiftProvider');
  return ctx;
}
