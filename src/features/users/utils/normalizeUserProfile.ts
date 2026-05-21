import { UserProfile, UserStatus } from '../../auth/types';
import { ROLES, Role } from '../../../config/roles';

const roleMap: Record<string, Role> = {
    'admin': ROLES.ADMIN,
    'superadmin': ROLES.OWNER,
    'super_admin': ROLES.OWNER,
    'branch_admin': ROLES.ADMIN_CABANG,
    'adminCabang': ROLES.ADMIN_CABANG,
    'admin_cabang': ROLES.ADMIN_CABANG,
    'salesman': ROLES.SALES,
    'sales': ROLES.SALES,
    'owner': ROLES.OWNER,
    'survey': ROLES.SURVEY,
    'gudang': ROLES.GUDANG,
    'spv': ROLES.SPV,
};

const statusMap: Record<string, UserStatus> = {
    'approved': 'approved',
    'pending': 'pending',
    'rejected': 'rejected',
    'suspended': 'suspended',
};

export const normalizeRole = (role: string | null | undefined): Role | null => {
    if (!role) return null;
    const normalized = roleMap[role.toLowerCase()] || role.toLowerCase();
    // Ensure the role is one of the valid Role types, or null if unknown/invalid
    return Object.values(ROLES).includes(normalized as Role) ? (normalized as Role) : null;
};

export const normalizeStatus = (status: string | null | undefined, rawData?: any): UserStatus => {
    if (!status) {
        // Soft fallback for legacy users: if they already have a valid role, assume they were approved.
        if (rawData && rawData.role) {
            return 'approved';
        }
        return 'pending';
    }
    const normalized = statusMap[status.toLowerCase()] || status.toLowerCase();
    
    if (['approved', 'pending', 'rejected', 'suspended'].includes(normalized)) {
        return normalized as UserStatus;
    }
    return 'pending'; // Default safe fallback
};

export const normalizeUserProfile = (uid: string, rawData: any): UserProfile => {
    // HARDCODED OVERRIDE FOR ROOT ADMINS
    const isRootAdmin = ['admin@gmail.com', 'wahyulaksanajayakusuma@gmail.com'].includes(rawData.email?.toLowerCase());

    const finalRole = isRootAdmin ? ROLES.OWNER : normalizeRole(rawData.role);
    const finalStatus = isRootAdmin ? 'approved' : normalizeStatus(rawData.status, rawData);

    return {
        uid,
        email: rawData.email || '',
        name: rawData.name || 'Unknown',
        photoURL: rawData.photoURL || '',
        phone: rawData.phone || null,
        branchId: rawData.branchId || null,
        role: finalRole,
        requestedRole: normalizeRole(rawData.requestedRole),
        status: finalStatus,
        approvedBy: rawData.approvedBy || null,
        approvedAt: rawData.approvedAt || null,
        createdAt: rawData.createdAt || { toDate: () => new Date() },
        updatedAt: rawData.updatedAt || { toDate: () => new Date() },
    };
};

export const getProfileCompleteness = (profile: UserProfile): { isComplete: boolean; missingFields: string[] } => {
    const missingFields: string[] = [];
    
    if (!profile.role) missingFields.push('role');
    
    // Legacy support: Don't force completeness check on critical fields for existing approved users
    // IF we are going strict, only enforce on new incomplete ones, or exclude Owner from requiring a branch.
    if (profile.role !== ROLES.OWNER && !profile.branchId) {
        missingFields.push('branchId');
    }
    
    // We can soft-require phone, but let's allow legacy users to pass without if they are approved
    if (!profile.phone && profile.status !== 'approved') {
        missingFields.push('phone');
    }
    
    return {
        isComplete: missingFields.length === 0,
        missingFields
    };
};

export const isLegacyUser = (rawData: any) => {
    return !rawData.status || !rawData.createdAt;
};
