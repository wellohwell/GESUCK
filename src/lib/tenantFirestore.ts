import { collection, query, where, QueryConstraint } from 'firebase/firestore';
import { db } from '../firebase/config';
import { isOwner } from './permissions';
import { UserProfile } from '../features/auth/types';

// Collections that are truly global and should NOT be branch-scoped
const GLOBAL_COLLECTIONS = [
  'system_config',
  'module_registry',
  'app_versions',
  'activities',
  'users',
  'branches'
];

/**
 * Tenant-aware Collection Reference
 */
export const tenantCollection = (
  colName: string,
  profile: UserProfile | null,
  branchId?: string | null
) => {
  if (GLOBAL_COLLECTIONS.includes(colName)) {
    return collection(db, colName);
  }
  const effectiveBranchId = branchId || profile?.branchId || '--none--';
  return collection(db, `branches/${effectiveBranchId}/${colName}`);
};

/**
 * Tenant-aware Query Wrapper
 * Automatically injects branchId filter for constrained collections
 */
export const tenantQuery = (
  colName: string,
  profile: UserProfile | null,
  branchId?: string | null,
  ...constraints: QueryConstraint[]
) => {
  const isGlobal = GLOBAL_COLLECTIONS.includes(colName);
  const bypass = isOwner(profile);
  const effectiveBranchId = branchId || profile?.branchId || '--none--';

  if (isGlobal || bypass) {
    return query(collection(db, colName), ...constraints);
  }

  // Force-inject isolation
  return query(
    collection(db, `branches/${effectiveBranchId}/${colName}`),
    where("branchId", "==", effectiveBranchId),
    ...constraints
  );
};
