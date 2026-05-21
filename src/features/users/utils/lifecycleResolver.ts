import { UserProfile } from '../../auth/types';
import { getProfileCompleteness } from './normalizeUserProfile';

export type AccessState = 'onboarding' | 'pending' | 'blocked' | 'approved';

export const resolveUserAccessState = (profile: UserProfile | null): AccessState => {
    if (!profile) return 'onboarding'; // Default for new or unauthenticated users to start onboarding
    
    if (profile.status === 'rejected' || profile.status === 'suspended') return 'blocked';
    if (profile.status === 'pending') return 'pending';
    
    const { isComplete } = getProfileCompleteness(profile);
    if (!isComplete) return 'onboarding'; // Profile incomplete
    
    return 'approved';
};
