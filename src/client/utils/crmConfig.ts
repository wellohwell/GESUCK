import { Stage } from "../types/CRMTypes";

export const stageConfig: Record<Stage, { label: string, color: string, bgColor: string }> = {
  survey: { label: 'Pipeline', color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  acc: { label: 'Clients', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  archive: { label: 'Arsip', color: 'text-zinc-500', bgColor: 'bg-zinc-500/10' },
  pending: { label: 'Pending', color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  batal: { label: 'Batal', color: 'text-red-500', bgColor: 'bg-red-500/10' },
};

export const roleConfig = {
  SALES: { label: 'Sales', permission: 'read_write' },
  SPV: { label: 'SPV', permission: 'approve' },
  ADMIN: { label: 'Admin', permission: 'full_access' },
  OWNER: { label: 'Owner', permission: 'full_access' },
};
