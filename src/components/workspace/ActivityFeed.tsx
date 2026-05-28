import React, { useEffect, useState } from 'react';
import { tenantQuery } from '../../lib/tenantFirestore';
import { onSnapshot, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '../../providers/AuthProvider';
import { format } from 'date-fns';

export const ActivityFeed: React.FC = () => {
  const { profile } = useAuth();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    setLoading(true);
    const q = tenantQuery("activity_logs", profile, null, orderBy("createdAt", "desc"), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Error listening to activity logs", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <h2 className="text-lg font-bold">Recent Activity</h2>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-[1.25rem] animate-pulse h-20" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-lg font-bold">Recent Activity</h2>
      {activities.length === 0 ? (
        <div className="text-center py-8 text-zinc-500 text-sm">No recent activity.</div>
      ) : (
        activities.map(activity => (
          <div key={activity.id} className="bg-card p-4 rounded-[1.25rem] border border-border/50 shadow-sm flex flex-col gap-2 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center text-[11px] font-medium text-zinc-500 uppercase tracking-wide">
              <span className="text-zinc-900 dark:text-zinc-100 font-bold">{activity.actorName}</span>
              <span>{activity.createdAt ? format(activity.createdAt.toDate(), 'HH:mm dd/MM') : 'Recently'}</span>
            </div>
            <p className="text-sm text-zinc-800 dark:text-zinc-200">{activity.description}</p>
            {activity.module && (
              <span className="text-[10px] uppercase font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full inline-block w-fit">
                {activity.module}
              </span>
            )}
          </div>
        ))
      )}
    </div>
  );
};
