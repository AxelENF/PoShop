'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ─────────────────────────────────────────────────────────────
// TIPOS DE ROLES DEL SISTEMA
// ─────────────────────────────────────────────────────────────
export type UserRole = 'cashier' | 'admin' | 'owner' | 'superadmin';

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
};

// ─────────────────────────────────────────────────────────────
// CONTEXTO
// ─────────────────────────────────────────────────────────────
interface UserSessionContextType {
  session: UserSession;
  setRoleForDev: (role: UserRole) => void; // solo para modo desarrollo
}

const UserSessionContext = createContext<UserSessionContextType | null>(null);

export function UserSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<UserSession>(DEV_USERS.admin); // default: admin en dev

  // Rehidratar rol guardado en localStorage en el cliente para evitar ssr mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedRole = window.localStorage.getItem('snapgad_dev_role') as UserRole;
      if (savedRole && DEV_USERS[savedRole]) {
        setSession(DEV_USERS[savedRole]);
      }
    }
  }, []);

  const setRoleForDev = (role: UserRole) => {
    setSession(DEV_USERS[role]);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('snapgad_dev_role', role);
    }
  };

  return (
    <UserSessionContext.Provider value={{ session, setRoleForDev }}>
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
