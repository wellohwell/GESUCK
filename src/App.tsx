import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import MarketPlansPage from "./pages/workspace/market-plans/page";
import CreateMarketPlanPage from "./pages/workspace/market-plans/create/page";
import MarketPlansReportPage from "./pages/workspace/market-plans/laporan/page";
import HomePage from "./pages/HomePage";
import AdminLayoutPage from "./pages/admin/AdminLayout";
import AdminHubPage from "./pages/admin/AdminHub";
import AdminInsightPage from "./pages/admin/Insight";
import AdminUserPage from "./pages/admin/User";
import AdminMasterPage from "./pages/admin/Master";
import AdminMigrationPage from "./pages/admin/Migration";
import AdminAutomationPage from "./pages/admin/Automation";
import OperationalReportPage from "./features/reports/pages/OperationalReportPage";
import PendingApproval from "./pages/PendingApproval";
import Blocked from "./pages/Blocked";
import { OnboardingPage } from "./features/users/pages/OnboardingPage";
import { AdminUserApprovalPage } from "./features/users/pages/AdminUserApprovalPage";
import { WorkspaceExplore, WorkspaceClients, WorkspaceVisit, WorkspaceTasks, WorkspaceProfile } from "./pages/workspace/WorkspacePages";
import { RequireAuth, RequireRole, RequireAdminAccess, RequirePermission } from "./components/auth/guards";
import { AuthRedirectGate } from "./components/auth/AuthRedirectGate";
import { AppBootstrap } from "./components/auth/AppBootstrap";
import { useAuth } from "./providers/AuthProvider";
import { ROLES } from "./config/roles";
import { PERMISSIONS } from "./config/permissions";
import ToolsPage from "./pages/Tools";
import CalculatorPage from "./pages/CalculatorPage";
import ClientPage from "./pages/ClientPage";
import OperationsPage from "./pages/OperationsPage";
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
import AdminActivityMonitorPage from "./pages/admin/ActivityMonitor";
import AccessDeniedPage from "./pages/AccessDenied";

import OwnerLayout from "./layouts/owner/OwnerLayout";
import { PublicLayout } from "./layouts/PublicLayout";
import { WorkspaceLayout } from "./domains/workspace/WorkspaceLayout";
import { ConnectivityGuard } from "./components/auth/ConnectivityGuard";

function AppContent() {
  return (
    <AppBootstrap>
      <UserLifecycleGuard>
        <Routes>
          {/* Public / Landing & Auth Routes with Redirect Gate */}
          <Route path="/" element={<AuthRedirectGate><Login /></AuthRedirectGate>} />
          <Route path="/login" element={<AuthRedirectGate><Login /></AuthRedirectGate>} />
          <Route path="/signin" element={<AuthRedirectGate><Login /></AuthRedirectGate>} />
          <Route path="/auth" element={<AuthRedirectGate><Login /></AuthRedirectGate>} />

          {/* Public / Lifecycle Routes for logged-in but unapproved users */}
          <Route element={<RequireAuth><PublicLayout /></RequireAuth>}>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/pending" element={<PendingApproval />} />
            <Route path="/blocked" element={<Blocked />} />
          </Route>

          {/* Workspace / Operational Routes (Guarded) */}
          <Route element={<RequireAuth><WorkspaceLayout /></RequireAuth>}>
            {/* Dynamic Root of Workspace triggers Resolver to locate default tab or path */}
            <Route path="/workspace" element={<WorkspaceResolver />} />
            
            {/* STAFF / WORKSPACE ROUTES */}
            <Route path="/workspace/home" element={<ModuleGuard moduleId="home"><HomePage /></ModuleGuard>} />
            <Route path="/workspace/market-plans" element={<ModuleGuard moduleId="marketPlans"><MarketPlansPage /></ModuleGuard>} />
            <Route path="/workspace/market-plans/create" element={<ModuleGuard moduleId="marketPlans"><CreateMarketPlanPage /></ModuleGuard>} />
            <Route path="/workspace/market-plans/laporan" element={<ModuleGuard moduleId="marketPlans"><MarketPlansReportPage /></ModuleGuard>} />
            <Route path="/workspace/Market-Plans" element={<Navigate to="/workspace/market-plans" replace />} />
            <Route path="/workspace/Market-Plans/Laporan" element={<Navigate to="/workspace/market-plans/laporan" replace />} />
            <Route path="/workspace/report" element={<ModuleGuard moduleId="report"><OperationalReportPage /></ModuleGuard>} />
            <Route path="/workspace/tools" element={<ModuleGuard moduleId="tools"><ToolsPage /></ModuleGuard>} />
            <Route path="/workspace/tools/calculator" element={<ModuleGuard moduleId="tools"><CalculatorPage /></ModuleGuard>} />
            <Route path="/workspace/client" element={<ModuleGuard moduleId="client"><ClientPage /></ModuleGuard>} />
            <Route path="/workspace/operations" element={
              <ModuleGuard moduleId="operations">
                <RequireRole roles={[ROLES.STAFF, ROLES.SURVEY, ROLES.GUDANG]}>
                  <OperationsPage />
                </RequireRole>
              </ModuleGuard>
            } />
            <Route path="/workspace/operation" element={<Navigate to="/workspace/operations" replace />} />
            <Route path="/workspace/timeline" element={<ModuleGuard moduleId="timeline"><TimelinePage /></ModuleGuard>} />
            
            {/* STAFF WORKSPACE V2 */}
            <Route path="/workspace/explore" element={<ModuleGuard moduleId="explore"><WorkspaceExplore /></ModuleGuard>} />
            <Route path="/workspace/clients" element={<WorkspaceClients />} />
            <Route path="/workspace/visit" element={<WorkspaceVisit />} />
            <Route path="/workspace/tasks" element={<WorkspaceTasks />} />
            <Route path="/workspace/profile" element={<WorkspaceProfile />} />
            
            <Route path="/global" element={<GlobalWorkspacePage />} />
          </Route>
            
          {/* Core Nested Admin / Manager Routes (Guarded) */}
          <Route 
            path="/admin" 
            element={
              <RequireAuth>
                <RequireAdminAccess>
                  <AdminLayoutPage />
                </RequireAdminAccess>
              </RequireAuth>
            }
          >
            <Route index element={<RequireAdminAccess><AdminHubPage /></RequireAdminAccess>} />
            <Route path="activity-monitor" element={<RequireAdminAccess><AdminActivityMonitorPage /></RequireAdminAccess>} />
            <Route path="insight" element={<RequireAdminAccess><RequirePermission permission={PERMISSIONS.VIEW_INSIGHT}><AdminInsightPage /></RequirePermission></RequireAdminAccess>} />
            <Route path="master" element={<RequireAdminAccess><AdminMasterPage /></RequireAdminAccess>} />
            <Route path="approvals" element={<RequireAdminAccess><RequirePermission permission={PERMISSIONS.USER_APPROVAL}><AdminUserApprovalPage /></RequirePermission></RequireAdminAccess>} />
            <Route path="automation" element={<RequireAdminAccess><AdminAutomationPage /></RequireAdminAccess>} />
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

          {/* OWNER ONLY ROUTES (Guarded) */}
          <Route 
            path="/owner" 
            element={
              <RequireAuth>
                <RequireRole roles={[ROLES.OWNER]}>
                  <OwnerLayout />
                </RequireRole>
              </RequireAuth>
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

          <Route path="/access-denied" element={<AccessDeniedPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <PWAInstallPrompt />
      </UserLifecycleGuard>
    </AppBootstrap>
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
                    <ConnectivityGuard>
                      <AppContent />
                    </ConnectivityGuard>
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
