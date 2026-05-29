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

export const AuthProfileSkeleton: React.FC = () => {
    return (
        <div className="w-full space-y-6 animate-pulse p-4 max-w-4xl mx-auto">
            {/* Header section skeleton */}
            <div className="flex md:flex-row flex-col justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-6">
                <div className="space-y-2.5 w-full md:w-1/3">
                    <div className="h-3.5 bg-zinc-800 rounded-full w-24"></div>
                    <div className="h-7 bg-zinc-800/60 rounded-2xl w-full"></div>
                </div>
                <div className="h-10 bg-zinc-805/40 rounded-2xl w-32"></div>
            </div>

            {/* Main Grid area skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-zinc-900 border border-border/10 rounded-3xl p-6 h-36 space-y-4">
                    <div className="h-3 bg-zinc-800/60 rounded-full w-14"></div>
                    <div className="h-5.5 bg-zinc-800 rounded-lg w-28"></div>
                    <div className="h-3 bg-zinc-800/40 rounded-full w-20"></div>
                </div>
                <div className="bg-zinc-900 border border-border/10 rounded-3xl p-6 h-36 space-y-4">
                    <div className="h-3 bg-zinc-800/60 rounded-full w-14"></div>
                    <div className="h-5.5 bg-zinc-800 rounded-lg w-32"></div>
                    <div className="h-3 bg-zinc-800/40 rounded-full w-24"></div>
                </div>
                <div className="bg-zinc-900 border border-border/10 rounded-3xl p-6 h-36 space-y-4">
                    <div className="h-3 bg-zinc-800/60 rounded-full w-14"></div>
                    <div className="h-5.5 bg-zinc-800 rounded-lg w-20"></div>
                    <div className="h-3 bg-zinc-800/40 rounded-full w-16"></div>
                </div>
            </div>

            {/* Content pane skeleton */}
            <div className="bg-zinc-900/40 border border-border/10 rounded-3xl p-6 space-y-4 h-64">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-zinc-800 rounded-2xl"></div>
                    <div className="space-y-1.5 flex-1">
                        <div className="h-4 bg-zinc-800 rounded-full w-32"></div>
                        <div className="h-3 bg-zinc-800/60 rounded-full w-24"></div>
                    </div>
                </div>
                <div className="h-[1px] bg-zinc-800/40 my-2"></div>
                <div className="space-y-3 pt-2">
                    <div className="h-3.5 bg-zinc-800/50 rounded-full w-[90%]"></div>
                    <div className="h-3.5 bg-zinc-800/50 rounded-full w-[80%]"></div>
                    <div className="h-3.5 bg-zinc-800/50 rounded-full w-[85%]"></div>
                    <div className="h-3.5 bg-zinc-800/50 rounded-full w-[50%]"></div>
                </div>
            </div>
        </div>
    );
};

export const RequireApprovedUser: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { profile, loading, profileLoading, isAuthenticated } = useAuth();
    if (loading) return null;
    if (!isAuthenticated) return <div>Please login.</div>;
    if (profileLoading) return <AuthProfileSkeleton />;
    
    if (profile?.userType === 'global') return <>{children}</>;
    
    if (profile?.status === 'pending') return <PendingApprovalState />;
    if (profile?.status === 'suspended') return <SuspendedState />;
    if (profile?.status === 'rejected') return <RejectedState />;
    if (profile?.status !== 'approved') return <UnauthorizedState />;

    return <>{children}</>;
};

export const RequireRole: React.FC<{ role?: Role, roles?: Role[], children: React.ReactNode }> = ({ role, roles, children }) => {
    const { profile, loading, profileLoading, isAuthenticated, isApproved } = useAuth();
    if (loading) return null;
    if (!isAuthenticated) return <div>Please login.</div>;
    if (profileLoading) return <AuthProfileSkeleton />;
    
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
    const { profile, loading, profileLoading, isAuthenticated, isApproved } = useAuth();
    if (loading) return null;
    if (!isAuthenticated) return fallback as React.ReactElement;
    if (profileLoading) return <AuthProfileSkeleton />;
    if (profile?.userType === 'global') return <>{children}</>;
    if (!isApproved) return <PendingApprovalState />;
    
    if (!hasPermission(profile, permission)) {
        return fallback as React.ReactElement;
    }
    
    return <>{children}</>;
};

export const RequireAdminAccess: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { profile, loading, profileLoading, isAuthenticated, isApproved } = useAuth();
    if (loading) return null;
    if (!isAuthenticated) return <UnauthorizedState />;
    if (profileLoading) return <AuthProfileSkeleton />;
    if (profile?.userType === 'global') return <>{children}</>;
    if (!isApproved) return <PendingApprovalState />;
    
    if (!canAccessAdmin(profile)) {
        return <UnauthorizedState />;
    }
    
    return <>{children}</>;
};
