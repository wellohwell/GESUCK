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
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="relative flex justify-center items-center">
          {/* Outer glowing pulsing ring */}
          <div className="absolute w-16 h-16 rounded-full border border-primary/10 animate-pulse scale-125"></div>
          {/* Inner spin card */}
          <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
        <p className="mt-8 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 animate-pulse">
          Memulihkan Sesi Pengguna...
        </p>
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
