import React from 'react';
import { useAuth } from '../../providers/AuthProvider';
import { UnauthorizedState, PendingApprovalState, SuspendedState, RejectedState } from '../system/AccessStates';
import { Role } from '../../config/roles';

export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    if (loading) return null; 
    if (!isAuthenticated) return <div>Please login.</div>; 
    return <>{children}</>;
};

export const RequireApprovedUser: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { profile, loading, isAuthenticated } = useAuth();
    if (loading) return null;
    if (!isAuthenticated) return <div>Please login.</div>;
    
    if (profile?.status === 'pending') return <PendingApprovalState />;
    if (profile?.status === 'suspended') return <SuspendedState />;
    if (profile?.status === 'rejected') return <RejectedState />;
    if (profile?.status !== 'approved') return <UnauthorizedState />;

    return <>{children}</>;
};

export const RequireRole: React.FC<{ role?: Role, roles?: Role[], children: React.ReactNode }> = ({ role, roles, children }) => {
    const { profile, loading, isAuthenticated, isApproved } = useAuth();
    if (loading) return null;
    if (!isAuthenticated) return <div>Please login.</div>;
    if (!isApproved) return <PendingApprovalState />;
    
    // Support legacy single role, or array of roles
    const allowedRoles = roles || (role ? [role] : []);
    
    if (!profile?.role || !allowedRoles.includes(profile.role)) {
        return <UnauthorizedState />;
    }
    
    return <>{children}</>;
};
