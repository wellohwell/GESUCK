import { useMemo } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { useModules } from '../providers/ModuleProvider';
import { hasRole, hasPermission } from '../lib/permissions';
import { DEFAULT_DYNAMIC_NAV_ITEMS, DynamicNavItem } from '../config/appShell';
import { Permission } from '../config/permissions';
import { ModuleConfig } from '../config/modules';

export const useNavigation = () => {
    const { profile, isOwner } = useAuth();
    const { modules } = useModules();

    return useMemo(() => {
        return DEFAULT_DYNAMIC_NAV_ITEMS
            .filter(item => {
                // Visibility
                if (!item.visible || !item.enabled) return false;
                if (isOwner && item.hiddenFromOwner) return false;

                // Role check
                if (item.allowedRoles.length > 0 && !isOwner) {
                    const hasAllowedRole = item.allowedRoles.some(role => hasRole(profile, role));
                    if (!hasAllowedRole) return false;
                }

                // Permission check
                if (item.requiredPermissions && item.requiredPermissions.length > 0 && !isOwner) {
                    const hasAllPermissions = item.requiredPermissions.every(perm => hasPermission(profile, perm as Permission));
                    if (!hasAllPermissions) return false;
                }

                // Module check
                if (item.moduleId) {
                    const mod = Object.values(modules as Record<string, ModuleConfig>).find(m => m.id === item.moduleId);
                    if (mod && !mod.enabled) return false;
                }

                return true;
            })
            .sort((a, b) => a.order - b.order);
    }, [profile, isOwner, modules]);
};
