import { useEffect, useState } from "react";
import { auth } from "./firebase/config";
import { onAuthStateChanged, User } from "firebase/auth";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Report from "./pages/Report";
import PendingApproval from "./pages/PendingApproval";
import Blocked from "./pages/Blocked";
import { syncUser, subscribeCurrentUser } from "./lib/services";
import { ThemeProvider } from "./hooks/useTheme";
import { ToastProvider } from "./components/ToastProvider";

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      setUser(u);
      
      if (u) {
        await syncUser();
        
        // Subscribe to user profile for role and status
        unsubscribeProfile = subscribeCurrentUser(u.uid, (profile) => {
          setUserProfile(profile);
          
          if (profile) {
            const isAdm = profile.role === "Admin" || 
                         ["admin@gmail.com", "wahyulaksanajayakusuma@gmail.com"].includes(u.email || "");
            setIsAdmin(isAdm);
          }
          setLoading(false);
        });
      } else {
        setUserProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) (unsubscribeProfile as any)();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#050505] flex items-center justify-center">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  // Auth Guard
  if (!user) {
    return <Login />;
  }

  // Status Guard
  if (userProfile?.status === "pending" && location.pathname !== "/pending-approval") {
    return <Navigate to="/pending-approval" replace />;
  }
  
  if (userProfile?.status === "rejected" && location.pathname !== "/blocked") {
    return <Navigate to="/blocked" replace />;
  }

  // Prevent approved users from seeing blocked/pending pages
  if (userProfile?.status === "approved" && (location.pathname === "/pending-approval" || location.pathname === "/blocked")) {
    return <Navigate to="/" replace />;
  }

  // Fallback while profile is loading (it shouldn't happen because of loading state, but for safety)
  if (!userProfile && user) {
     return <PendingApproval />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] text-zinc-900 dark:text-white">
      <Routes>
        <Route path="/pending-approval" element={<PendingApproval />} />
        <Route path="/blocked" element={<Blocked />} />
        <Route path="/" element={<Dashboard onNavigateAdmin={() => navigate("/admin")} onNavigateReport={() => navigate("/report")} isAdmin={isAdmin} />} />
        <Route path="/admin" element={isAdmin ? <Admin onBack={() => navigate("/")} /> : <Navigate to="/" replace />} />
        <Route path="/report" element={(isAdmin) ? <Report onBack={() => navigate("/")} /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider defaultTheme="dark">
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
