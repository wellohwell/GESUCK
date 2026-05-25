import React from 'react';
import { NavLink } from 'react-router-dom';
import { useNavigation } from '../../hooks/useNavigation';
import { getIconComponent } from '../../config/appShell';

export const BottomNav: React.FC = () => {
  const navItems = useNavigation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex justify-around items-center px-2 pb-safe">
      {navItems.filter(item => !item.desktopOnly).map((item) => {
        const Icon = getIconComponent(item.icon);
        return (
          <NavLink
            key={item.id}
            to={item.route}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full gap-1 ${
                isActive 
                  ? 'text-brand-primary' 
                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
