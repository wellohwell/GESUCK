export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin', // generic admin or branch admin
  ADMIN_CABANG: 'admin_cabang',
  SALES: 'sales',
  SURVEY: 'survey',
  GUDANG: 'gudang',
  SPV: 'spv',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];
