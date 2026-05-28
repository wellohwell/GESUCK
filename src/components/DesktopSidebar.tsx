
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useNavigation } from '../providers/NavigationProvider';
import { useModules } from '../providers/ModuleProvider';
import { getIconComponent } from '../config/appShell';

export function DesktopSidebar() {
  const location = useLocation();
  const { navItems, isLoaded, isEligible } = useNavigation();
  const { modules } = useModules();
  const pathname = location.pathname;

  if (!isLoaded) return null;

  // Filter items for desktop sidebar:
  // 1. Must use isEligible logic (roles, branches, modules, enabled, visible)
  // 2. Must not be mobile only
  const activeItems = navItems.filter(item => {
    if (item.mobileOnly) return false;
    return isEligible(item);
  });

  return (
    <aside className="hidden md:flex flex-col w-56 h-full p-3 gap-2">
      <div className="p-4 mb-2">
         <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Workspace</div>
      </div>
      
      <nav className="flex-1 flex flex-col gap-1.5 h-full overflow-y-auto scrollbar-hide pb-20">
        <AnimatePresence mode="popLayout" initial={false}>
          {activeItems.map((item) => {
            const isActive = pathname === item.route;
            const Icon = getIconComponent(item.icon);

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              >
                <Link
                  to={item.route}
                  className={cn(
                    'relative flex items-center gap-3 px-4 py-2.5 rounded-full transition-all duration-300 group',
                    isActive ? 'text-black' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {isActive && (
                    <motion.div
                       layoutId="sidebar-active-pill"
                       className="absolute inset-0 bg-[#C6FF00] rounded-full"
                       initial={false}
                       transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  
                  <Icon 
                    strokeWidth={isActive ? 3 : 2}
                    className={cn(
                      'h-4 w-4 relative z-10',
                      isActive ? 'text-black' : 'text-muted-foreground group-hover:text-foreground'
                    )} 
                  />
                  <span className={cn(
                    "relative z-10 text-xs font-bold whitespace-nowrap",
                    isActive ? 'text-black' : 'text-muted-foreground'
                  )}>
                    {item.label}
                  </span>

                  {/* Badge */}
                  {item.badge && item.badge !== 'none' && (
                    <span className={cn(
                      "relative z-10 ml-auto text-[8px] font-black px-1.5 py-0.5 rounded uppercase leading-none border",
                      isActive 
                        ? "bg-black/10 border-black/20 text-black" 
                        : item.badge === 'new' ? "bg-green-500/10 border-green-500/20 text-green-500" :
                          item.badge === 'beta' ? "bg-amber-500/10 border-amber-500/20 text-amber-500" : 
                          "bg-red-500/10 border-red-500/20 text-red-500"
                    )}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </nav>
    </aside>
  );
}
