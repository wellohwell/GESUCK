import React from 'react';
import { NavLink } from 'react-router-dom';
import { useNavigation } from '../../hooks/useNavigation';
import { getIconComponent } from '../../config/appShell';
import { cn } from '../../lib/utils';

export const Sidebar: React.FC = () => {
    const navItems = useNavigation();

    return (
        <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 h-screen p-4 flex flex-col">
            <div className="font-black text-lg tracking-tighter mb-8 px-2 uppercase text-brand-primary">
                System
            </div>
            <nav className="flex flex-col gap-2">
                {navItems.filter(item => !item.mobileOnly).map(item => {
                    const Icon = getIconComponent(item.icon);
                    return (
                        <NavLink
                            key={item.id}
                            to={item.route}
                            className={({ isActive }) => cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors",
                                isActive
                                    ? "bg-brand-primary text-white"
                                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            {item.label}
                        </NavLink>
                    )
                })}
            </nav>
        </aside>
    );
}
