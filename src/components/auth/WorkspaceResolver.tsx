import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import { useModules } from '../../providers/ModuleProvider';
import { DEFAULT_WORKSPACES, FALLBACK_WORKSPACE } from '../../config/appShell';

export const WorkspaceResolver: React.FC = () => {
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const { checkAccess, modules, isLoaded: modulesLoaded } = useModules();

  useEffect(() => {
    if (authLoading || !modulesLoaded) return;

    const userRole = profile?.role || 'sales';
    const preferredRoute = DEFAULT_WORKSPACES[userRole];

    // Helper to map route to moduleId
    const getModuleIdFromRoute = (route: string): string => {
      if (route.startsWith('/home')) return 'home';
      if (route.startsWith('/client')) return 'client';
      if (route.startsWith('/explore')) return 'explore';
      if (route.startsWith('/Market-Plans')) return 'marketPlans';
      if (route.startsWith('/report')) return 'report';
      if (route.startsWith('/tools')) return 'tools';
      if (route.startsWith('/timeline')) return 'timeline';
      if (route.startsWith('/admin')) return 'adminUsers';
      return '';
    };

    let targetRoute = preferredRoute || FALLBACK_WORKSPACE;

    // Validate preferredRoute
    const mappedModuleId = getModuleIdFromRoute(targetRoute);
    const { allowed } = mappedModuleId ? checkAccess(mappedModuleId) : { allowed: true };

    if (!allowed) {
      // Find another active, allowed module which is marked as defaultWorkspaceEligible
      const eligibleModules = Object.keys(modules).filter((modId) => {
        const mod = modules[modId];
        if (!mod || !mod.enabled || mod.defaultWorkspaceEligible === false) return false;
        
        // Also verify role permission dynamically
        const accessCheck = checkAccess(modId);
        return accessCheck.allowed;
      });

      if (eligibleModules.length > 0) {
        // Pick the first eligible workspace
        const bestModuleId = eligibleModules[0];
        const routeMap: Record<string, string> = {
          home: '/home',
          client: '/client',
          explore: '/explore',
          marketPlans: '/Market-Plans',
          report: '/report',
          tools: '/tools',
          timeline: '/timeline',
          adminUsers: '/admin/modules',
        };
        targetRoute = routeMap[bestModuleId] || FALLBACK_WORKSPACE;
      } else {
        targetRoute = FALLBACK_WORKSPACE;
      }
    }

    console.log(`[WorkspaceResolver] Routing ${userRole} from branch ${profile?.branchId || 'N/A'} to workspace ${targetRoute}`);
    navigate(targetRoute, { replace: true });
  }, [profile, authLoading, modulesLoaded, checkAccess, modules, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 space-y-4">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
        Menghubungkan Otoritas Workspace...
      </p>
    </div>
  );
};
