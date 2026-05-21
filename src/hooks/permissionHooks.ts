import { useAuth } from '../providers/AuthProvider';
import * as permissions from '../lib/permissions';
import { useMemo } from 'react';
import { UserProfile } from '../features/auth/types';

export const usePermission = () => {
    const { profile } = useAuth();
    
    return useMemo(() => ({
        canAccessAdmin: () => permissions.canAccessAdmin(profile),
        canApproveUser: (target: UserProfile) => permissions.canApproveUser(profile, target),
        canAccessBranch: (branchId: string) => permissions.canAccessBranch(profile, branchId),
        canManageUsers: () => permissions.canManageUsers(profile),
        canViewReports: () => permissions.canViewReports(profile),
        canAccessGlobalSettings: () => permissions.canAccessGlobalSettings(profile),
    }), [profile]);
};
