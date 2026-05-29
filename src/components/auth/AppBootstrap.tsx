import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import { resolveUserAccessState } from '../../features/users/utils/lifecycleResolver';
import { getDefaultRouteByRole } from '../../config/roleLanding';

export const BootstrapSplash: React.FC = () => {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center select-none animate-pulse">
      <div className="relative flex justify-center items-center">
        {/* Subtle glowing pulsing ring */}
        <div className="absolute w-12 h-12 rounded-full border border-brand-primary/20 animate-ping"></div>
        {/* Inner spin circle */}
        <div className="w-8 h-8 border-2 border-brand-primary/10 border-t-brand-primary rounded-full animate-spin"></div>
      </div>
    </div>
  );
};

interface AppBootstrapProps {
  children: React.ReactNode;
}

export const AppBootstrap: React.FC<AppBootstrapProps> = ({ children }) => {
  const { profile, loading, profileLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  // 1. If core Firebase auth is checking, keep displaying the splash
  if (loading) {
    return <BootstrapSplash />;
  }

  // 2. If authenticated, we MUST also wait for the user's profile to resolve their role/state
  if (isAuthenticated && profileLoading) {
    return <BootstrapSplash />;
  }

  // 3. Once auth & profile are resolved:
  if (isAuthenticated && profile) {
    const accessState = resolveUserAccessState(profile);
    const path = location.pathname;

    // Direct routing for restricted lifecycle states
    if (accessState === 'onboarding') {
      if (path !== '/onboarding') {
        return <Navigate to="/onboarding" replace={true} />;
      }
    } else if (accessState === 'pending') {
      if (path !== '/pending') {
        return <Navigate to="/pending" replace={true} />;
      }
    } else if (accessState === 'blocked') {
      if (path !== '/blocked') {
        return <Navigate to="/blocked" replace={true} />;
      }
    } else if (accessState === 'approved') {
      // If user is on landing/login pages, instantly redirect to their respective landing workspace
      const isAuthPath = ['/', '/login', '/signin', '/auth'].includes(path);
      if (isAuthPath) {
        if (profile.userType === 'global') {
          return <Navigate to="/global" replace={true} />;
        }
        const userRole = profile.role || 'sales';
        const landingRoute = getDefaultRouteByRole(userRole);
        return <Navigate to={landingRoute} replace={true} />;
      }
    }
  }

  // 4. No routing interception needed, render the workspace or login view instantly
  return <>{children}</>;
};
