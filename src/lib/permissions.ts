import { UserProfile } from '../features/auth/types';
import { ROLES } from '../config/roles';
import { PERMISSIONS, Permission } from '../config/permissions';
import { ModuleConfig } from '../config/modules';

export const isOwner = (profile: UserProfile | null) => {
    const pRole = profile?.role?.toUpperCase() || null;
    const nRole = pRole === "ADMIN" ? ROLES.MANAGER : pRole;
    return nRole === ROLES.OWNER.toUpperCase() || profile?.userType === 'global';
}

export const hasRole = (profile: UserProfile | null, role: string) => {
    if (isOwner(profile)) return true;
    const pRole = profile?.role?.toUpperCase() || null;
    const nRole = pRole === "ADMIN" ? ROLES.MANAGER : pRole;
    return nRole === role.toUpperCase();
}

export const hasPermission = (profile: UserProfile | null, permission: Permission) => {
    if (isOwner(profile)) return true;
    const hasPerm = profile?.permissions?.includes(permission) ?? false;
    if (!hasPerm) console.debug(`Permission denied: ${permission}`, profile);
    return hasPerm;
}

export const canAccessModule = (profile: UserProfile | null, module: ModuleConfig) => {
    if (!profile) return false;
    if (isOwner(profile)) return true;
    
    const pRole = profile?.role?.toUpperCase() || "";
    const role = pRole === "ADMIN" ? ROLES.MANAGER : pRole;

    if (module.allowedRoles.includes(role)) return true;

    if (module.requiredPermissions && module.requiredPermissions.length > 0) {
        return module.requiredPermissions.some(perm => hasPermission(profile, perm as Permission));
    }
    
    console.debug(`Module access denied: ${module.id}`, profile);
    return false;
}

export const canAccessAdmin = (profile: UserProfile | null) => {
    if (isOwner(profile)) return true;
    if (hasRole(profile, ROLES.MANAGER)) return true;
    
    const adminPermissions: Permission[] = [
        PERMISSIONS.USER_MANAGEMENT,
        PERMISSIONS.USER_APPROVAL,
        PERMISSIONS.MARKET_EDIT,
        PERMISSIONS.VIEW_INSIGHT
    ];
    return adminPermissions.some(perm => hasPermission(profile, perm));
};

export const canApproveUser = (profile: UserProfile | null, targetUser: UserProfile) => {
    if (hasRole(profile, ROLES.OWNER)) return true;
    if (hasPermission(profile, PERMISSIONS.USER_APPROVAL)) {
        return profile?.branchId === targetUser.branchId;
    }
    return false;
};

export const canAccessBranch = (profile: UserProfile | null, branchId: string) => {
    if (hasRole(profile, ROLES.OWNER)) return true;
    if (hasPermission(profile, PERMISSIONS.BRANCH_MANAGEMENT)) return true;
    return profile?.branchId === branchId;
};

export const canManageUsers = (profile: UserProfile | null) => {
    return hasPermission(profile, PERMISSIONS.USER_MANAGEMENT);
};

export const canViewReports = (profile: UserProfile | null) => {
    return hasRole(profile, ROLES.MANAGER) || hasRole(profile, ROLES.STAFF) || hasRole(profile, ROLES.OWNER);
};

export const canAccessGlobalSettings = (profile: UserProfile | null) => {
    return hasRole(profile, ROLES.OWNER);
};

export const canPerform = (profile: UserProfile | null, action: string) => {
    return hasPermission(profile, action as Permission);
}
