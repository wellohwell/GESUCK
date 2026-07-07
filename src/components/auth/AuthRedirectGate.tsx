import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import { getDefaultRouteByRole } from '../../config/roleLanding';

interface AuthRedirectGateProps {
  children: React.ReactNode;
}

export const AuthRedirectGate: React.FC<AuthRedirectGateProps> = ({ children }) => {
  const { profile, loading, isAuthenticated, role } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center select-none animate-pulse">
        <div className="relative flex justify-center items-center">
          {/* Subtle glowing pulsing ring */}
          <div className="absolute w-12 h-12 rounded-full border border-primary/20 animate-ping"></div>
          {/* Inner spin circle */}
          <div className="w-8 h-8 border-2 border-primary/10 border-t-primary rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    // Determine target route based on role
    // We normalize role (e.g. "sales" or "SPV") to pass to the helper
    const userRole = profile?.role || role || 'sales';
    const landingRoute = getDefaultRouteByRole(userRole);
    
    console.log(`[AuthRedirectGate] Authenticated user role is "${userRole}", redirecting to "${landingRoute}"`);
    return <Navigate to={landingRoute} replace={true} />;
  }

  // Not authenticated? Let them render the guest template/children
  return <>{children}</>;
};
