export const ROLES = {
  OWNER: 'OWNER',
  MANAGER: 'MANAGER',
  STAFF: 'STAFF',
  SALES: 'SALES',
  SURVEY: 'SURVEY', // Leaving other roles as they might be used
  GUDANG: 'GUDANG',
  SPV: 'SUPERVISOR',
  AUDITOR: 'AUDITOR',
  FINANCE: 'FINANCE'
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];
