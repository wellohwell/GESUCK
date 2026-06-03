import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useNavigation } from '../providers/NavigationProvider';
import { useModules } from '../providers/ModuleProvider';
import { getIconComponent } from '../config/appShell';

export function BottomNavbar() {
  const location = useLocation();
  const { navItems, isLoaded, isEligible } = useNavigation();
  const { modules } = useModules();
  const pathname = location.pathname;

  // Hide on specific pages
  if (pathname === '/workspace/market-plans/create') return null;

  if (!isLoaded) return null;

  // Filter items for mobile bottom navbar:
  // 1. Must use isEligible logic (roles, branches, modules, enabled, visible)
  // 2. Must not be desktop only
  const activeItems = navItems.filter(item => {
    if (item.desktopOnly) return false;
    return isEligible(item);
  });

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pointer-events-none flex justify-center md:hidden" 
      id="global-bottom-nav"
    >
      <nav 
        className={cn(
          "w-fit mx-auto px-1.5 py-1 pointer-events-auto flex items-center justify-center gap-1 rounded-xl overflow-hidden h-[52px]",
          "bg-card/95 backdrop-blur-xl border border-white/10 shadow-lg shadow-black/20"
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {activeItems.map((item) => {
            const isActive = pathname === item.route;
            const Icon = getIconComponent(item.icon);

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              >
                <Link
                  to={item.route}
                  className={cn(
                    'relative flex items-center justify-center transition-all h-[42px] rounded-lg z-10 group tap-highlight-transparent overflow-hidden',
                    'focus:outline-none active:scale-[0.96]',
                    isActive ? 'px-3' : 'w-[42px]'
                  )}
                  aria-label={item.label}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  {isActive && (
                    <motion.div
                       layoutId="active-pill"
                       className="absolute inset-0 bg-[#C6FF00] rounded-lg"
                       initial={false}
                       transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  
                  <div className="relative z-10 flex items-center justify-center gap-1.5 px-0.5">
                    <Icon 
                      strokeWidth={isActive ? 2.5 : 2}
                      className={cn(
                        'h-4.5 w-4.5 transition-all duration-300',
                        isActive 
                          ? 'text-black' 
                          : 'text-muted-foreground group-hover:text-foreground'
                      )} 
                    />
                    
                    {isActive && (
                      <motion.span 
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-[9px] font-black text-black whitespace-nowrap overflow-hidden uppercase tracking-wider"
                      >
                        {item.label}
                      </motion.span>
                    )}

                    {/* Badge Indicator (Dot) */}
                    {!isActive && item.badge && item.badge !== 'none' && (
                      <div className={cn(
                        "absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-card",
                        item.badge === 'new' ? "bg-green-500" :
                        item.badge === 'beta' ? "bg-amber-500" : "bg-red-500"
                      )} />
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </nav>
    </div>
  );
}
