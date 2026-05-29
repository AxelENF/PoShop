export type UserRole = 'owner' | 'admin' | 'cashier' | 'external_accountant' | 'superadmin';

export type TenantProfile = 'general' | 'weight' | 'catalog' | 'distribution' | 'services';

export type PlanStatus = 'trial' | 'active' | 'grace' | 'readonly' | 'paused' | 'cancelled';

export interface BaseTenant {
  id: string;
  name: string;
  slug: string;
  profile: TenantProfile;
  planStatus: PlanStatus;
}
