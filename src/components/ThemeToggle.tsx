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
      className="p-2.5 rounded-[1.25rem] text-muted-foreground hover:text-brand-primary hover:bg-brand-primary/5 transition-all duration-200 active:scale-95 group"
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
              className="group-hover:scale-110 transition-transform"
            >
              <Moon className="w-5 h-5" />
            </motion.div>
          ) : (
            <motion.div
              key="sun"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="group-hover:scale-110 transition-transform"
            >
              <Sun className="w-5 h-5" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </button>
  );
}
