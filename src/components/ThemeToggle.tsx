import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { motion, AnimatePresence } from "motion/react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    // If it's system, we need to know what the actual resolved theme is
    if (theme === "system") {
      const isSystemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(isSystemDark ? "light" : "dark");
    } else {
      setTheme(theme === "dark" ? "light" : "dark");
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="w-8 h-8 flex items-center justify-center bg-transparent text-muted-foreground hover:text-foreground transition-all active:scale-95"
      title="Toggle Theme"
    >
      <div className="relative w-5 h-5 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          {theme === "dark" || (theme === "system" && typeof window !== 'undefined' && window.matchMedia("(prefers-color-scheme: dark)").matches) ? (
            <motion.div
              key="moon"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Moon className="w-4 h-4" />
            </motion.div>
          ) : (
            <motion.div
              key="sun"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Sun className="w-4 h-4" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </button>
  );
}
