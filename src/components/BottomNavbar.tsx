import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../providers/AuthProvider';
import { useNavigation } from '../providers/NavigationProvider';
import { getIconComponent } from '../config/appShell';

export function BottomNavbar({ isAdmin = false }: { isAdmin?: boolean }) {
  const location = useLocation();
  const pathname = location.pathname;
  const [shouldHideFromModal, setShouldHideFromModal] = React.useState(false);
  const { profile } = useAuth();
  const { navItems, isEligible, isLoaded } = useNavigation();

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

  // Filter dynamically based on enabled/access/role/branch criteria
  const activeNavItems = navItems.filter(isEligible);

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-[9999] flex justify-center p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pointer-events-none" 
      id="global-bottom-nav"
    >
      <nav 
        className={cn(
          "backdrop-blur-2xl rounded-2xl shadow-xl p-1 pointer-events-auto w-fit max-w-[95vw] md:max-w-[70vw] overflow-x-auto no-scrollbar",
          "bg-zinc-950/95 dark:bg-white/95 border border-zinc-900/10 dark:border-zinc-100/10"
        )}
      >
        <div className="flex items-center justify-center gap-1.5 relative">
          {activeNavItems.map((item) => {
            const isActive = pathname === item.route || 
                           (item.route !== '/home' && item.route !== '/' && pathname.startsWith(item.route));

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
                  'relative flex items-center justify-center transition-all h-7 sm:h-8 px-2 sm:px-4 rounded-xl z-10 group',
                  'focus:outline-none active:scale-95 shrink-0',
                  !isActive && 'hover:bg-primary/10',
                  displayClasses
                )}
                aria-label={item.label}
              >
                {/* Active Background Pill */}
                {isActive && (
                  <motion.div
                    layoutId="active-nav-item"
                    className="absolute inset-0 bg-primary rounded-xl shadow-sm"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}

                {/* Icon Wrapper with potential notification badge */}
                <div className="relative">
                  <IconComponent 
                    className={cn(
                      'h-4 w-4 shrink-0 z-10 transition-all duration-200',
                      isActive 
                        ? 'text-primary-foreground' 
                        : 'text-zinc-400 dark:text-zinc-500 group-hover:text-primary'
                    )} 
                  />
                  
                  {/* Miniature Promotional Status Dot badge inside bottom navbar */}
                  {item.badge && item.badge !== 'none' && (
                    <span className={cn(
                      "absolute -top-1 -right-1 w-2 h-2 rounded-full border border-zinc-950 dark:border-white animate-pulse z-20",
                      item.badge === 'beta' && "bg-amber-400",
                      item.badge === 'new' && "bg-green-400",
                      item.badge === 'maintenance' && "bg-red-400"
                    )} />
                  )}
                </div>

                {/* Label Text */}
                <AnimatePresence mode="wait">
                  {isActive && (
                     <motion.span
                       initial={{ opacity: 0, width: 0 }}
                       animate={{ opacity: 1, width: 'auto' }}
                       exit={{ opacity: 0, width: 0 }}
                       transition={{ duration: 0.2 }}
                       className="text-[10px] font-bold tracking-tight whitespace-nowrap z-10 ml-1.5 text-primary-foreground"
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