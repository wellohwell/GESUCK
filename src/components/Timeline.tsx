import React from 'react';
import { getRelativeTime } from '../lib/utils';
import { cn } from '../lib/utils';

interface TimelineProps {
  events: any[];
}

export function Timeline({ events }: TimelineProps) {
  if (!events || events.length === 0) return null;
  return (
    <div className="space-y-3 pl-1">
      {events.map((event, i) => (
        <div key={i} className="flex gap-3">
          <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", 
            event.status === 'success' ? 'bg-emerald-500' :
            event.status === 'warning' ? 'bg-orange-500' :
            event.status === 'danger' ? 'bg-red-500' :
            'bg-zinc-300'
          )} />
          <div>
            <p className="text-xs font-bold text-text-primary leading-tight">{event.title}</p>
            <p className="text-[10px] text-text-muted mt-0.5">{getRelativeTime(event.time)}</p>
            {event.note && (
                <p className="text-[10px] text-text-muted mt-1 bg-secondary/50 p-1.5 rounded-md italic">"{event.note}"</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
