import { useEffect, useState } from "react";
import { auth } from "./firebase/config";
import { onAuthStateChanged, User } from "firebase/auth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import { syncUser } from "./firebase/services";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentPage, setCurrentPage] = useState<"dashboard" | "admin">("dashboard");

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
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
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
    
    return <Dashboard onNavigateAdmin={() => setCurrentPage("admin")} isAdmin={isAdmin} />;
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {renderPage()}
      <ToastContainer 
        position="bottom-center"
        theme="dark"
        hideProgressBar
        autoClose={3000}
        aria-label="Notifications"
      />
    </div>
  );
}
