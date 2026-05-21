import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import { resolveUserAccessState } from '../../features/users/utils/lifecycleResolver';

export const UserLifecycleGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { profile, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const state = resolveUserAccessState(profile);

    useEffect(() => {
        if (loading) return;

        const isLifecyclePage = ['/onboarding', '/pending', '/blocked', '/login'].includes(location.pathname);

        if (state === 'approved') {
            if (isLifecyclePage) navigate('/');
        } else if (state === 'onboarding') {
            if (location.pathname !== '/onboarding') navigate('/onboarding');
        } else if (state === 'pending') {
            if (location.pathname !== '/pending') navigate('/pending');
        } else if (state === 'blocked') {
            if (location.pathname !== '/blocked') navigate('/blocked');
        }
    }, [state, location, navigate, loading]);

    if (loading) return null;

    // Operational pages requirement: 'pending' cannot access operational pages
    if (state !== 'approved' && !['/onboarding', '/pending', '/blocked'].includes(location.pathname)) {
        return null; // Don't show content, redirection will handle it
    }

    return <>{children}</>;
};
