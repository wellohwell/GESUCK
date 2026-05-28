import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import { UnauthorizedState, PendingApprovalState, SuspendedState, RejectedState } from '../system/AccessStates';
import { Role } from '../../config/roles';
import { Permission } from '../../config/permissions';
import { hasRole, hasPermission, canAccessAdmin } from '../../lib/permissions';

export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    if (loading) return null; 
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
};

export const RequireApprovedUser: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { profile, loading, isAuthenticated } = useAuth();
    if (loading) return null;
    if (!isAuthenticated) return <div>Please login.</div>;
    
    if (profile?.userType === 'global') return <>{children}</>;
    
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
    
    const allowedRoles = roles || (role ? [role] : []);
    
    if (profile?.userType === 'global') {
        return <>{children}</>;
    }
    
    if (!isApproved) return <PendingApprovalState />;
    
    const passed = allowedRoles.some(r => hasRole(profile, r));
    
    if (!passed) {
        return <UnauthorizedState />;
    }
    
    return <>{children}</>;
};

export const RequirePermission: React.FC<{ permission: Permission, fallback?: React.ReactNode, children: React.ReactNode }> = ({ permission, fallback = <UnauthorizedState />, children }) => {
    const { profile, loading, isAuthenticated, isApproved } = useAuth();
    if (loading) return null;
    if (!isAuthenticated) return fallback as React.ReactElement;
    if (profile?.userType === 'global') return <>{children}</>;
    if (!isApproved) return <PendingApprovalState />;
    
    if (!hasPermission(profile, permission)) {
        return fallback as React.ReactElement;
    }
    
    return <>{children}</>;
};

export const RequireAdminAccess: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { profile, loading, isAuthenticated, isApproved } = useAuth();
    if (loading) return null;
    if (!isAuthenticated) return <UnauthorizedState />;
    if (profile?.userType === 'global') return <>{children}</>;
    if (!isApproved) return <PendingApprovalState />;
    
    if (!canAccessAdmin(profile)) {
        return <UnauthorizedState />;
    }
    
    return <>{children}</>;
};
