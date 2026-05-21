import { query, where, QueryConstraint } from 'firebase/firestore';
import { UserProfile } from '../features/auth/types';
import { ROLES } from '../config/roles';

export const createBranchQuery = (profile: UserProfile | null, ...constraints: QueryConstraint[]): QueryConstraint[] => {
    // Owner can access all branches if they don't have a branchId assigned.
    // If they have a branchId assigned, they might only see that one. 
    // Let's assume OWNER with null branchId sees everything.
    if (profile?.role === ROLES.OWNER && !profile.branchId) {
        return constraints;
    }

    // Otherwise, filter by branchId
    if (profile?.branchId) {
        return [where('branchId', '==', profile.branchId), ...constraints];
    }

    // Default to a query that returns nothing if no branchId
    return [where('branchId', '==', 'NO_ACCESS_PERMITTED')];
};

export const canAccessDocument = (profile: UserProfile | null, docData: { branchId?: string }) => {
    if (profile?.role === ROLES.OWNER && !profile.branchId) return true;
    if (profile?.branchId && docData.branchId === profile.branchId) return true;
    return false;
};
