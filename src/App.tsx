import { useEffect, useState } from "react";
import { auth } from "./firebase/config";
import { onAuthStateChanged, User } from "firebase/auth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Report from "./pages/Report";
import { syncUser } from "./lib/services";
import { ThemeProvider } from "./hooks/useTheme";
import { ToastProvider } from "./components/ToastProvider";

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentPage, setCurrentPage] = useState<"dashboard" | "admin" | "report">("dashboard");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      
      if (u) {
        await syncUser();
        const admins = ["admin@gmail.com", "wahyulaksanajayakusuma@gmail.com"];
        if (admins.includes(u.email || "")) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      }
    });

    return () => unsubscribe();
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

  const renderPage = () => {
    if (!user) return <Login />;
    
    if (currentPage === "admin" && isAdmin) {
      return <Admin onBack={() => setCurrentPage("dashboard")} />;
    }
    
    if (currentPage === "report") {
      return <Report onBack={() => setCurrentPage("dashboard")} />;
    }
    
    return <Dashboard onNavigateAdmin={() => setCurrentPage("admin")} onNavigateReport={() => setCurrentPage("report")} isAdmin={isAdmin} />;
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] text-zinc-900 dark:text-white">
      {renderPage()}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ThemeProvider>
  );
}
