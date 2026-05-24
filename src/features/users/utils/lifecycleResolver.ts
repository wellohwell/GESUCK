import { UserProfile } from '../../auth/types';

export type AccessState = 'onboarding' | 'pending' | 'blocked' | 'approved';

export const resolveUserAccessState = (profile: UserProfile | null): AccessState => {
    if (!profile) return 'onboarding'; // Default for new or unauthenticated users to start onboarding
    
    if (profile.status === 'rejected' || profile.status === 'suspended') return 'blocked';
    
    // Skip onboarding check for already approved users
    if (profile.status === 'approved') {
        return 'approved';
    }

    // New Google users initially lack phone and/or branchId. 
    // They must complete the onboarding page first to supply these, even if their document status is 'pending'
    const isGlobal = profile.userType === 'global';
    const hasCompletedOnboarding = isGlobal || (!!profile.phone && !!profile.branchId);
    if (!hasCompletedOnboarding) {
        return 'onboarding';
    }
    
    if (profile.status === 'pending') return 'pending';
    
    return 'approved';
};
