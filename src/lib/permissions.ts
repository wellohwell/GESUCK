import { UserProfile } from '../features/auth/types';
import { ROLES } from '../config/roles';

export const canAccessAdmin = (profile: UserProfile | null) => {
    return profile?.role === ROLES.OWNER || profile?.role === ROLES.STAFF;
};

export const canApproveUser = (profile: UserProfile | null, targetUser: UserProfile) => {
    if (profile?.role === ROLES.OWNER) return true;
    if (profile?.role === ROLES.STAFF) {
        return profile.branchId === targetUser.branchId;
    }
    return false;
};

export const canAccessBranch = (profile: UserProfile | null, branchId: string) => {
    if (profile?.role === ROLES.OWNER) return true;
    return profile?.branchId === branchId;
};

export const canManageUsers = (profile: UserProfile | null) => {
    return profile?.role === ROLES.OWNER || profile?.role === ROLES.STAFF;
};

export const canViewReports = (profile: UserProfile | null) => {
    return profile?.role === ROLES.OWNER || profile?.role === ROLES.STAFF;
};

export const canAccessGlobalSettings = (profile: UserProfile | null) => {
    return profile?.role === ROLES.OWNER;
};
