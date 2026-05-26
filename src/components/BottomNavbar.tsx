import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../providers/AuthProvider';
import { useNavigation } from '../providers/NavigationProvider';
import { getIconComponent } from '../config/appShell';

export function BottomNavbar({ isManager = false }: { isManager?: boolean }) {
  const location = useLocation();
  const pathname = location.pathname;
  const [shouldHideFromModal, setShouldHideFromModal] = React.useState(false);
  const { profile } = useAuth();
  const { navItems, isEligible, isLoaded } = useNavigation();

  // Filter dynamically based on enabled/access/role/branch criteria
  const activeNavItems = React.useMemo(() => {
    if (!isLoaded) return [];
    return navItems.filter(isEligible);
  }, [navItems, isEligible, isLoaded]);

  // Guarantee max 5 items on mobile layouts to prevent squeezed UI
  const mobileNavItems = React.useMemo(() => {
    const activeItem = activeNavItems.find(item => pathname === item.route || 
                        (item.route !== '/workspace/home' && item.route !== '/' && pathname.startsWith(item.route)));
    
    const selected: typeof activeNavItems = [];
    
    // 1. Prioritize active item to ensure visibility of current context
    if (activeItem) {
      selected.push(activeItem);
    }
    
    // 2. Core operational high-priority anchors
    const priorities = ['home', 'client', 'adminUsers', 'ownerSystem', 'profile', 'explore', 'marketPlans', 'report', 'tools'];
    for (const key of priorities) {
      if (selected.length >= 5) break;
      const item = activeNavItems.find(i => i.id === key);
      if (item && !selected.some(s => s.id === item.id)) {
        selected.push(item);
      }
    }
    
    // 3. Fill up remaining up to 5 items if necessary
    for (const item of activeNavItems) {
      if (selected.length >= 5) break;
      if (!selected.some(s => s.id === item.id)) {
        selected.push(item);
      }
    }
    
    // 4. Sort selection to match original structural order
    return selected.sort((a, b) => {
      const idxA = activeNavItems.findIndex(i => i.id === a.id);
      const idxB = activeNavItems.findIndex(i => i.id === b.id);
      return idxA - idxB;
    });
  }, [activeNavItems, pathname]);

  React.useEffect(() => {
    const checkModal = () => {
      setShouldHideFromModal(document.body.classList.contains('market-modal-active'));
    };

    const observer = new MutationObserver(checkModal);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    
    checkModal();
    return () => observer.disconnect();
  }, []);

  const isExcludedPage = ['/pending-approval', '/blocked', '/login'].includes(pathname) || shouldHideFromModal;
  if (isExcludedPage || !isLoaded) return null;

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-[9999] flex justify-center p-4 pb-[calc(1.2rem+env(safe-area-inset-bottom))] pointer-events-none" 
      id="global-bottom-nav"
    >
      <nav 
        className={cn(
          "backdrop-blur-xl rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)] p-1.5 pointer-events-auto w-fit max-w-[95vw] md:max-w-[70vw] overflow-x-auto no-scrollbar",
          "bg-white/90 dark:bg-zinc-950/90 border border-zinc-200/50 dark:border-white/10"
        )}
      >
        <div className="flex items-center justify-center gap-2 relative">
          {mobileNavItems.map((item) => {
            const isActive = pathname === item.route || 
                           (item.route !== '/workspace/home' && item.route !== '/' && pathname.startsWith(item.route));

            const IconComponent = getIconComponent(item.icon);

            // Responsive Screen bounds via Tailwind
            const displayClasses = cn(
              item.mobileOnly && "md:hidden",
              item.desktopOnly && "hidden md:flex"
            );

            return (
              <Link
                key={item.id}
                to={item.route}
                className={cn(
                  'relative flex items-center justify-center transition-all h-9 px-4 rounded-full z-10 group',
                  'focus:outline-none active:scale-95 shrink-0 select-none',
                  !isActive && 'hover:bg-[#d2f34c]/10 text-zinc-550 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white',
                  displayClasses
                )}
                aria-label={item.label}
              >
                {/* Active Neon Lime Rounded Pill Background */}
                {isActive && (
                  <motion.div
                    layoutId="active-nav-item"
                    className="absolute inset-0 bg-[#d2f34c] rounded-full shadow-[0_4px_16px_rgba(210,243,76,0.25)]"
                    transition={{ type: "spring", stiffness: 420, damping: 28 }}
                  />
                )}

                {/* Icon Wrapper with potential notification badge */}
                <div className="relative z-10 flex items-center justify-center">
                  <IconComponent 
                    className={cn(
                      'h-4 w-4 shrink-0 transition-all duration-200',
                      isActive 
                        ? 'text-black' 
                        : 'text-zinc-500 dark:text-zinc-400 group-hover:scale-105'
                    )} 
                  />
                  
                  {/* Miniature Promotional Status Dot badge inside bottom navbar */}
                  {item.badge && item.badge !== 'none' && (
                    <span className={cn(
                      "absolute -top-1.5 -right-1.5 w-2 h-2 rounded-full border border-white dark:border-zinc-950 animate-pulse z-20",
                      item.badge === 'beta' && "bg-amber-400",
                      item.badge === 'new' && "bg-green-400",
                      item.badge === 'maintenance' && "bg-red-400"
                    )} />
                  )}
                </div>

                {/* Label Text with neon-smooth sliding and expansion animations */}
                <AnimatePresence mode="wait">
                  {isActive && (
                     <motion.span
                       initial={{ opacity: 0, width: 0 }}
                       animate={{ opacity: 1, width: 'auto' }}
                       exit={{ opacity: 0, width: 0 }}
                       transition={{ duration: 0.2 }}
                       className="text-[10px] font-black tracking-wider whitespace-nowrap z-10 ml-1.5 text-black uppercase leading-none"
                     >
                       {item.label}
                     </motion.span>
                   )}
                </AnimatePresence>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}