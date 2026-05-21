import { branches, BranchId, BranchConfig } from '../config/branches';

export const getBranchById = (branchId: BranchId): BranchConfig | undefined => {
  return branches[branchId];
};

export const getBranchSpreadsheet = (branchId: BranchId): string | undefined => {
  return branches[branchId]?.spreadsheetId;
};

export const isBranchActive = (branchId: BranchId): boolean => {
  return branches[branchId]?.active ?? false;
};
