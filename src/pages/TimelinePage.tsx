import React, { useState, useEffect } from 'react';
import { 
  History, Users, ShoppingBag, CheckSquare, Settings, 
  Filter, Search, Clock, ChevronRight, Activity, 
  CheckCircle2, AlertCircle, Package, Truck, ArrowRight, X
} from 'lucide-react';
import { subscribeActivities, useUserProfile } from '../lib/services';
import { cn, formatRelativeTime } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { SkeletonLineItem } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: History, color: 'text-zinc-500' },
  { id: 'user', label: 'Users', icon: Users, color: 'text-blue-500' },
  { id: 'order', label: 'Orders', icon: ShoppingBag, color: 'text-emerald-500' },
  { id: 'task', label: 'Tasks', icon: CheckSquare, color: 'text-amber-500' },
  { id: 'workflow', label: 'Workflow', icon: Activity, color: 'text-purple-500' },
  { id: 'system', label: 'System', icon: Settings, color: 'text-zinc-500' },
];

export default function TimelinePage() {
  const { profile } = useUserProfile();
  const [activities, setActivities] = useState<any[]>([]);
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.role || !profile?.id) return;
    const unsub = subscribeActivities(profile.role, profile.id, (data) => {
      setActivities(data);
      setLoading(false);
    }, 100, profile.branchId);
    return () => unsub();
  }, [profile?.role, profile?.id, profile?.branchId]);

  const filteredActivities = activities.filter(a => {
    if (filterCategory !== 'all' && a.category !== filterCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        a.title?.toLowerCase().includes(q) || 
        a.description?.toLowerCase().includes(q) ||
        a.actorName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getIcon = (category: string, type: string) => {
    switch (category) {
      case 'user': return <Users className="w-4 h-4" />;
      case 'order': 
        if (type === 'order_approved') return <CheckCircle2 className="w-4 h-4" />;
        if (type === 'order_shipped') return <Truck className="w-4 h-4" />;
        return <Package className="w-4 h-4" />;
      case 'task': return <CheckSquare className="w-4 h-4" />;
      case 'workflow': return <Activity className="w-4 h-4" />;
      case 'system': return <Settings className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'user': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'order': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'task': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'workflow': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      default: return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      {/* HEADER */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight flex items-center gap-2 italic">
              <History className="w-6 h-6 text-brand-primary" />
              Global Timeline
            </h1>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
             <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="Cari aktivitas..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-250 transition-colors"
                    aria-label="Hapus Pencarian"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
             </div>
             <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setFilterCategory(cat.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2 border",
                      filterCategory === cat.id 
                        ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent" 
                        : "bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800"
                    )}
                  >
                    <cat.icon className="w-3 h-3" />
                    {cat.label}
                  </button>
                ))}
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <SkeletonLineItem key={i} />
            ))}
          </div>
        ) : filteredActivities.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="Aktivitas Kosong"
            description="Tidak ada catatan aktivitas operasional dalam kategori atau pencarian yang dipilih."
          />
        ) : (
          <div className="relative before:absolute before:inset-0 before:ml-[1rem] before:-translate-x-px before:h-full before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
            <AnimatePresence initial={false}>
              {filteredActivities.map((activity, index) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  key={activity.id} 
                  className="relative pl-10 mb-8 last:mb-0 group"
                >
                  {/* Dot / Icon Container */}
                  <div className={cn(
                    "absolute left-0 top-0 w-8 h-8 rounded-full border-4 border-zinc-50 dark:border-zinc-100 flex items-center justify-center p-0.5 z-10 transition-transform group-hover:scale-110",
                    getCategoryColor(activity.category)
                  )}>
                    {getIcon(activity.category, activity.type)}
                  </div>

                  {/* Card Content */}
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm group-hover:shadow-md transition-all group-hover:-translate-y-0.5">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                         <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{activity.category}</span>
                         <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                         <span className="text-[10px] font-bold text-zinc-500">{formatRelativeTime(activity.createdAt)}</span>
                      </div>
                      <span className="text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">
                        {activity.type?.replace('_', ' ')}
                      </span>
                    </div>

                    <h3 className="text-sm font-black text-zinc-900 dark:text-white mb-1 uppercase tracking-tight">
                      {activity.title}
                    </h3>
                    <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                      {activity.description}
                    </p>

                    <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-brand-primary" />
                          <div className="flex flex-col">
                             <span className="text-[10px] font-bold text-zinc-900 dark:text-white leading-none">{activity.actorName}</span>
                             <span className="text-[8px] font-black text-brand-primary uppercase tracking-widest">{activity.actorRole}</span>
                          </div>
                       </div>
                       
                       {activity.targetId && (
                         <button className="flex items-center gap-1 text-[10px] font-black text-zinc-400 hover:text-brand-primary uppercase tracking-widest transition-colors">
                           View Details <ArrowRight className="w-3 h-3" />
                         </button>
                       )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
