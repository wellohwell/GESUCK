import { useEffect, useState } from "react";
import { auth } from "./firebase/config";
import { onAuthStateChanged, User } from "firebase/auth";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import Login from "./pages/Login";
import MarketPlans from "./pages/MarketPlans";
import HomePage from "./pages/HomePage";
import AdminLayoutPage from "./pages/admin/AdminLayout";
import AdminHubPage from "./pages/admin/AdminHub";
import AdminInsightPage from "./pages/admin/Insight";
import AdminUserPage from "./pages/admin/User";
import AdminMasterPage from "./pages/admin/Master";
import OperationalReportPage from "./features/reports/pages/OperationalReportPage";
import PendingApproval from "./pages/PendingApproval";
import Blocked from "./pages/Blocked";
import { OnboardingPage } from "./features/users/pages/OnboardingPage";
import { AdminUserApprovalPage } from "./features/users/pages/AdminUserApprovalPage";
import { RequireRole } from "./components/auth/guards";
import { ROLES } from "./config/roles";
import ExplorePage from "./pages/explore/ExplorePage";
import ToolsPage from "./pages/Tools";
import CalculatorPage from "./pages/CalculatorPage";
import ProfilePage from "./pages/ProfilePage";
import ClientPage from "./pages/ClientPage";
import UsersPage from "./pages/UsersPage";
import TimelinePage from "./pages/TimelinePage";
import { ThemeProvider } from "./hooks/useTheme";
import { ToastProvider } from "./providers/toast-provider";
import { ModalProvider } from "./providers/modal-provider";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import { AuthProvider } from "./providers/AuthProvider";
import { ModuleProvider } from "./providers/ModuleProvider";
import { NavigationProvider } from "./providers/NavigationProvider";
import { ModuleGuard } from "./components/auth/ModuleGuard";
import { WorkspaceResolver } from "./components/auth/WorkspaceResolver";
import ModulesPage from "./pages/admin/ModulesPage";
import NavigationPage from "./pages/admin/NavigationPage";
import DocsPage from "./pages/admin/DocsPage";
import OrgManagement from "./pages/admin/OrgManagement";
import { UserLifecycleGuard } from "./components/auth/UserLifecycleGuard";

import { AppLayout } from "./layouts/AppLayout";
import { PublicLayout } from "./layouts/PublicLayout";

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

          {/* Operational App Routes */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<WorkspaceResolver />} />
            <Route path="/home" element={<ModuleGuard moduleId="home"><HomePage /></ModuleGuard>} />
            <Route path="/explore" element={<ModuleGuard moduleId="explore"><ExplorePage /></ModuleGuard>} />
            <Route path="/Market-Plans" element={<ModuleGuard moduleId="marketPlans"><MarketPlans isAdmin={false} /></ModuleGuard>} />
            <Route path="/report" element={<ModuleGuard moduleId="report"><OperationalReportPage /></ModuleGuard>} />
            <Route path="/tools" element={<ModuleGuard moduleId="tools"><ToolsPage /></ModuleGuard>} />
            <Route path="/tools/calculator" element={<ModuleGuard moduleId="tools"><CalculatorPage /></ModuleGuard>} />
            <Route path="/client" element={<ModuleGuard moduleId="client"><ClientPage /></ModuleGuard>} />
            <Route path="/timeline" element={<ModuleGuard moduleId="timeline"><TimelinePage /></ModuleGuard>} />
            <Route path="/profile" element={<ProfilePage />} />
            
            {/* Admin Routes */}
            <Route 
              path="/admin/approvals" 
              element={
                <RequireRole roles={[ROLES.OWNER, ROLES.ADMIN_CABANG, ROLES.ADMIN]}>
                  <AdminUserApprovalPage />
                </RequireRole>
              } 
            />
            
            <Route 
              path="/admin/users" 
              element={
                <RequireRole roles={[ROLES.OWNER, ROLES.ADMIN_CABANG, ROLES.ADMIN]}>
                  <ModuleGuard moduleId="adminUsers">
                    <UsersPage />
                  </ModuleGuard>
                </RequireRole>
              } 
            />

            <Route 
              path="/admin/modules" 
              element={
                <RequireRole roles={[ROLES.OWNER, ROLES.ADMIN_CABANG, ROLES.ADMIN]}>
                  <ModulesPage />
                </RequireRole>
              } 
            />

            <Route 
              path="/admin/branches" 
              element={
                <RequireRole roles={[ROLES.OWNER, ROLES.ADMIN_CABANG, ROLES.ADMIN]}>
                  <OrgManagement />
                </RequireRole>
              } 
            />

            <Route 
              path="/admin/navigation" 
              element={
                <RequireRole roles={[ROLES.OWNER, ROLES.ADMIN_CABANG, ROLES.ADMIN]}>
                  <NavigationPage />
                </RequireRole>
              } 
            />

            <Route 
              path="/admin/docs" 
              element={
                <RequireRole roles={[ROLES.OWNER, ROLES.ADMIN_CABANG, ROLES.ADMIN]}>
                  <DocsPage />
                </RequireRole>
              } 
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
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
              <ModuleProvider>
                <NavigationProvider>
                  <AppContent />
                </NavigationProvider>
              </ModuleProvider>
            </AuthProvider>
          </ModalProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
