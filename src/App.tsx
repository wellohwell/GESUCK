import { useEffect, useState } from "react";
import { auth } from "./firebase/config";
import { onAuthStateChanged, User } from "firebase/auth";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import Login from "./pages/Login";
import MarketPlansPage from "./pages/workspace/market-plans/page";
import CreateMarketPlanPage from "./pages/workspace/market-plans/create/page";
import HomePage from "./pages/HomePage";
import AdminLayoutPage from "./pages/admin/AdminLayout";
import AdminHubPage from "./pages/admin/AdminHub";
import AdminInsightPage from "./pages/admin/Insight";
import AdminUserPage from "./pages/admin/User";
import AdminMasterPage from "./pages/admin/Master";
import AdminMigrationPage from "./pages/admin/Migration";
import OperationalReportPage from "./features/reports/pages/OperationalReportPage";
import PendingApproval from "./pages/PendingApproval";
import Blocked from "./pages/Blocked";
import { OnboardingPage } from "./features/users/pages/OnboardingPage";
import { AdminUserApprovalPage } from "./features/users/pages/AdminUserApprovalPage";
import { WorkspaceDashboard, WorkspaceExplore, WorkspaceClients, WorkspaceVisit, WorkspaceTasks, WorkspaceProfile } from "./pages/workspace/WorkspacePages";
import { RequireRole, RequireAdminAccess, RequirePermission } from "./components/auth/guards";
import { ROLES } from "./config/roles";
import { PERMISSIONS } from "./config/permissions";
import ToolsPage from "./pages/Tools";
import CalculatorPage from "./pages/CalculatorPage";
import ClientPage from "./pages/ClientPage";
import UsersPage from "./pages/UsersPage";
import TimelinePage from "./pages/TimelinePage";
import { ThemeProvider } from "./hooks/useTheme";
import { ToastProvider } from "./providers/toast-provider";
import { ModalProvider } from "./providers/modal-provider";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import { AuthProvider } from "./providers/AuthProvider";
import { NavigationProvider } from "./providers/NavigationProvider";
import { RuntimeProvider } from "./providers/RuntimeProvider";
import { ModuleProvider } from "./providers/ModuleProvider";
import { ModuleGuard } from "./components/auth/ModuleGuard";
import { WorkspaceResolver } from "./components/auth/WorkspaceResolver";
import ModulesPage from "./pages/admin/ModulesPage";
import NavigationPage from "./pages/admin/NavigationPage";
import DocsPage from "./pages/admin/DocsPage";
import OrgManagement from "./pages/admin/OrgManagement";
import { UserLifecycleGuard } from "./components/auth/UserLifecycleGuard";
import GlobalWorkspacePage from "./pages/GlobalWorkspacePage";

import OwnerLayout from "./layouts/owner/OwnerLayout";
import { AppLayout } from "./layouts/AppLayout";
import { PublicLayout } from "./layouts/PublicLayout";
import { WorkspaceLayout } from "./domains/workspace/WorkspaceLayout";

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  // Auth Guard
  if (!user) {
    return <Login />;
  }

  return (
    <>
      <UserLifecycleGuard>
        <Routes>
          {/* Public / Lifecycle Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/pending" element={<PendingApproval />} />
            <Route path="/blocked" element={<Blocked />} />
          </Route>

          {/* Workspace / Operational Routes */}
          <Route element={<WorkspaceLayout />}>
            <Route path="/" element={<WorkspaceResolver />} />
            
            {/* STAFF / WORKSPACE ROUTES */}
            <Route path="/workspace/home" element={<ModuleGuard moduleId="home"><HomePage /></ModuleGuard>} />
            <Route path="/workspace/market-plans" element={<ModuleGuard moduleId="marketPlans"><MarketPlansPage /></ModuleGuard>} />
            <Route path="/workspace/market-plans/create" element={<ModuleGuard moduleId="marketPlans"><CreateMarketPlanPage /></ModuleGuard>} />
            <Route path="/workspace/Market-Plans" element={<Navigate to="/workspace/market-plans" replace />} />
            <Route path="/workspace/report" element={<ModuleGuard moduleId="report"><OperationalReportPage /></ModuleGuard>} />
            <Route path="/workspace/tools" element={<ModuleGuard moduleId="tools"><ToolsPage /></ModuleGuard>} />
            <Route path="/workspace/tools/calculator" element={<ModuleGuard moduleId="tools"><CalculatorPage /></ModuleGuard>} />
            <Route path="/workspace/client" element={<ModuleGuard moduleId="client"><ClientPage /></ModuleGuard>} />
            <Route path="/workspace/timeline" element={<ModuleGuard moduleId="timeline"><TimelinePage /></ModuleGuard>} />
            
            {/* STAFF WORKSPACE V2 */}
            <Route path="/workspace" element={<WorkspaceDashboard />} />
            <Route path="/workspace/explore" element={<ModuleGuard moduleId="explore"><WorkspaceExplore /></ModuleGuard>} />
            <Route path="/workspace/clients" element={<WorkspaceClients />} />
            <Route path="/workspace/visit" element={<WorkspaceVisit />} />
            <Route path="/workspace/tasks" element={<WorkspaceTasks />} />
            <Route path="/workspace/profile" element={<WorkspaceProfile />} />
            
            <Route path="/global" element={<GlobalWorkspacePage />} />
          </Route>
            
          {/* Core Nested Admin / Manager Routes */}
          <Route 
            path="/admin" 
            element={
              <RequireAdminAccess>
                <AdminLayoutPage />
              </RequireAdminAccess>
            }
          >
            <Route index element={<RequireAdminAccess><AdminHubPage /></RequireAdminAccess>} />
            <Route path="insight" element={<RequireAdminAccess><RequirePermission permission={PERMISSIONS.VIEW_INSIGHT}><AdminInsightPage /></RequirePermission></RequireAdminAccess>} />
            <Route path="master" element={<RequireAdminAccess><RequirePermission permission={PERMISSIONS.MARKET_EDIT}><AdminMasterPage /></RequirePermission></RequireAdminAccess>} />
            <Route path="approvals" element={<RequireAdminAccess><RequirePermission permission={PERMISSIONS.USER_APPROVAL}><AdminUserApprovalPage /></RequirePermission></RequireAdminAccess>} />
            <Route 
              path="users" 
              element={
                <RequireAdminAccess>
                  <RequirePermission permission={PERMISSIONS.USER_MANAGEMENT}>
                    <ModuleGuard moduleId="adminUsers">
                        <UsersPage />
                    </ModuleGuard>
                  </RequirePermission>
                </RequireAdminAccess>
              } 
            />
          </Route>

          {/* OWNER ONLY ROUTES */}
          <Route 
            path="/owner" 
            element={
              <RequireRole roles={[ROLES.OWNER]}>
                <OwnerLayout />
              </RequireRole>
            }
          >
            <Route index element={<RequireRole roles={[ROLES.OWNER]}><AdminHubPage /></RequireRole>} />
            <Route path="user" element={<RequireRole roles={[ROLES.OWNER]}><AdminUserPage /></RequireRole>} />
            <Route path="migration" element={<RequireRole roles={[ROLES.OWNER]}><AdminMigrationPage /></RequireRole>} />
            <Route path="modules" element={<RequireRole roles={[ROLES.OWNER]}><ModulesPage /></RequireRole>} />
            <Route path="branches" element={<RequireRole roles={[ROLES.OWNER]}><OrgManagement /></RequireRole>} />
            <Route path="navigation" element={<RequireRole roles={[ROLES.OWNER]}><NavigationPage /></RequireRole>} />
            <Route path="docs" element={<RequireRole roles={[ROLES.OWNER]}><DocsPage /></RequireRole>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <PWAInstallPrompt />
      </UserLifecycleGuard>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider defaultTheme="dark">
        <ToastProvider>
          <ModalProvider>
            <AuthProvider>
              <RuntimeProvider>
                <ModuleProvider>
                  <NavigationProvider>
                    <AppContent />
                  </NavigationProvider>
                </ModuleProvider>
              </RuntimeProvider>
            </AuthProvider>
          </ModalProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
