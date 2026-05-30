'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ─────────────────────────────────────────────────────────────
// TIPOS DE ROLES DEL SISTEMA
// ─────────────────────────────────────────────────────────────
export type UserRole = 'cashier' | 'admin' | 'owner' | 'superadmin' | 'cobranza' | 'guest';

export interface UserSession {
  id: string;
  name: string;
  role: UserRole;
  tenantId: string;
  tenantName: string;
  branchId: string;
  branchName: string;
  cashRegisterName?: string;
  avatarInitials: string;
  // Permisos derivados del rol
  permissions: {
    canViewCostPrices: boolean;
    canEditProducts: boolean;
    canEditCustomers: boolean;
    canViewFinancialReports: boolean;
    canCancelSales: boolean;
    canManageCashiers: boolean;
    canConfigureTelegram: boolean;
    canViewMultiBranch: boolean;
    canManageAdmins: boolean;
    canAccessSuperAdmin: boolean;
  };
}

// ─────────────────────────────────────────────────────────────
// MAPA DE PERMISOS POR ROL
// ─────────────────────────────────────────────────────────────
const ROLE_PERMISSIONS: Record<UserRole, UserSession['permissions']> = {
  cashier: {
    canViewCostPrices: false,
    canEditProducts: false,
    canEditCustomers: false,
    canViewFinancialReports: false,
    canCancelSales: false,
    canManageCashiers: false,
    canConfigureTelegram: false,
    canViewMultiBranch: false,
    canManageAdmins: false,
    canAccessSuperAdmin: false,
  },
  admin: {
    canViewCostPrices: true,
    canEditProducts: true,
    canEditCustomers: true,
    canViewFinancialReports: true,
    canCancelSales: true,
    canManageCashiers: true,
    canConfigureTelegram: true,
    canViewMultiBranch: false,
    canManageAdmins: false,
    canAccessSuperAdmin: false,
  },
  owner: {
    canViewCostPrices: true,
    canEditProducts: true,
    canEditCustomers: true,
    canViewFinancialReports: true,
    canCancelSales: true,
    canManageCashiers: true,
    canConfigureTelegram: true,
    canViewMultiBranch: true,
    canManageAdmins: true,
    canAccessSuperAdmin: false,
  },
  superadmin: {
    canViewCostPrices: true,
    canEditProducts: true,
    canEditCustomers: true,
    canViewFinancialReports: true,
    canCancelSales: true,
    canManageCashiers: true,
    canConfigureTelegram: true,
    canViewMultiBranch: true,
    canManageAdmins: true,
    canAccessSuperAdmin: true,
  },
  cobranza: {
    canViewCostPrices: false,
    canEditProducts: false,
    canEditCustomers: true,
    canViewFinancialReports: false,
    canCancelSales: false,
    canManageCashiers: false,
    canConfigureTelegram: false,
    canViewMultiBranch: false,
    canManageAdmins: false,
    canAccessSuperAdmin: false,
  },
  guest: {
    canViewCostPrices: false,
    canEditProducts: false,
    canEditCustomers: false,
    canViewFinancialReports: false,
    canCancelSales: false,
    canManageCashiers: false,
    canConfigureTelegram: false,
    canViewMultiBranch: false,
    canManageAdmins: false,
    canAccessSuperAdmin: false,
  },
};

// ─────────────────────────────────────────────────────────────
// USUARIOS DE DESARROLLO (MOCK)
// Reemplazar con Supabase Auth al conectar DB real
// ─────────────────────────────────────────────────────────────
const DEV_USERS: Record<UserRole, UserSession> = {
  cashier: {
    id: 'usr-001',
    name: 'Ana González',
    role: 'cashier',
    tenantId: 'tenant-demo',
    tenantName: 'Abarrotes La Esperanza',
    branchId: 'branch-01',
    branchName: 'Matriz Centro',
    avatarInitials: 'AG',
    permissions: ROLE_PERMISSIONS.cashier,
  },
  admin: {
    id: 'usr-002',
    name: 'Carlos Moreno',
    role: 'admin',
    tenantId: 'tenant-demo',
    tenantName: 'Abarrotes La Esperanza',
    branchId: 'branch-01',
    branchName: 'Matriz Centro',
    avatarInitials: 'CM',
    permissions: ROLE_PERMISSIONS.admin,
  },
  owner: {
    id: 'usr-003',
    name: 'Roberto Díaz',
    role: 'owner',
    tenantId: 'tenant-demo',
    tenantName: 'Abarrotes La Esperanza',
    branchId: 'branch-01',
    branchName: 'Matriz Centro',
    avatarInitials: 'RD',
    permissions: ROLE_PERMISSIONS.owner,
  },
  superadmin: {
    id: 'usr-sa-001',
    name: 'SNAPGAD Ops',
    role: 'superadmin',
    tenantId: 'snapgad-internal',
    tenantName: 'SNAPGAD',
    branchId: 'global',
    branchName: 'Global',
    avatarInitials: 'SN',
    permissions: ROLE_PERMISSIONS.superadmin,
  },
  cobranza: {
    id: 'usr-004',
    name: 'Sofía Martínez',
    role: 'cobranza',
    tenantId: 'tenant-demo',
    tenantName: 'Abarrotes La Esperanza',
    branchId: 'branch-01',
    branchName: 'Matriz Centro',
    avatarInitials: 'SM',
    permissions: ROLE_PERMISSIONS.cobranza,
  },
  guest: {
    id: 'usr-005',
    name: 'Auditor Externo',
    role: 'guest',
    tenantId: 'tenant-demo',
    tenantName: 'Abarrotes La Esperanza',
    branchId: 'branch-01',
    branchName: 'Matriz Centro',
    avatarInitials: 'AE',
    permissions: ROLE_PERMISSIONS.guest,
  },
};

// ─────────────────────────────────────────────────────────────
// CONTEXTO
// ─────────────────────────────────────────────────────────────
export interface CashierSession {
  id: string;
  name: string;
  role: UserRole;
  branchId?: string;
}

interface UserSessionContextType {
  session: UserSession;
  setRoleForDev: (role: UserRole) => void; // solo para modo desarrollo
  activeCashier: CashierSession | null;
  setActiveCashier: (cashier: CashierSession | null) => void;
}

const UserSessionContext = createContext<UserSessionContextType | null>(null);

export function UserSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<UserSession>(DEV_USERS.admin); // default: admin en dev
  const [activeCashier, setActiveCashierState] = useState<CashierSession | null>(null);

  // Rehidratar rol guardado en localStorage en el cliente para evitar ssr mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedRole = window.localStorage.getItem('snapgad_dev_role') as UserRole;
      if (savedRole && DEV_USERS[savedRole]) {
        setSession(DEV_USERS[savedRole]);
      }
      
      const savedCashier = window.localStorage.getItem('snapgad_active_cashier');
      if (savedCashier) {
        try {
          setActiveCashierState(JSON.parse(savedCashier));
        } catch (e) {
          console.error('Failed to parse active cashier from localStorage', e);
        }
      }
    }
  }, []);

  const setRoleForDev = (role: UserRole) => {
    setSession(DEV_USERS[role]);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('snapgad_dev_role', role);
    }
    
    // Auto-set matching active cashier when developer changes roles in dev drawer
    if (role === 'cashier') {
      setActiveCashier({
        id: DEV_USERS.cashier.id,
        name: DEV_USERS.cashier.name,
        role: 'cashier',
        branchId: DEV_USERS.cashier.branchId,
      });
    } else if (role === 'admin') {
      setActiveCashier({
        id: DEV_USERS.admin.id,
        name: DEV_USERS.admin.name,
        role: 'admin',
        branchId: DEV_USERS.admin.branchId,
      });
    } else if (role === 'owner') {
      setActiveCashier({
        id: DEV_USERS.owner.id,
        name: DEV_USERS.owner.name,
        role: 'owner',
        branchId: DEV_USERS.owner.branchId,
      });
    } else if (role === 'cobranza') {
      setActiveCashier({
        id: DEV_USERS.cobranza.id,
        name: DEV_USERS.cobranza.name,
        role: 'cobranza',
        branchId: DEV_USERS.cobranza.branchId,
      });
    } else if (role === 'guest') {
      setActiveCashier({
        id: DEV_USERS.guest.id,
        name: DEV_USERS.guest.name,
        role: 'guest',
        branchId: DEV_USERS.guest.branchId,
      });
    } else {
      setActiveCashier(null);
    }
  };

  const setActiveCashier = (cashier: CashierSession | null) => {
    setActiveCashierState(cashier);
    if (typeof window !== 'undefined') {
      if (cashier) {
        window.localStorage.setItem('snapgad_active_cashier', JSON.stringify(cashier));
      } else {
        window.localStorage.removeItem('snapgad_active_cashier');
      }
    }
  };

  return (
    <UserSessionContext.Provider value={{ session, setRoleForDev, activeCashier, setActiveCashier }}>
      {children}
    </UserSessionContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────
export function useUserSession(): UserSessionContextType {
  const ctx = useContext(UserSessionContext);
  if (!ctx) {
    throw new Error('useUserSession must be used within a UserSessionProvider');
  }
  return ctx;
}
