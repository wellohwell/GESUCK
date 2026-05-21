import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchX, Home } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center">
      <div className="w-16 h-16 bg-zinc-100 dark:bg-white/10 rounded-full flex items-center justify-center mb-6">
        <SearchX className="w-8 h-8 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-black text-foreground mb-2 tracking-tight">Page Not Found</h1>
      <p className="text-muted-foreground mb-8 text-sm max-w-[280px]">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <button 
        onClick={() => navigate('/', { replace: true })}
        className="px-6 py-3 bg-foreground text-background font-bold text-sm rounded-xl flex items-center gap-2 hover:opacity-90 transition-opacity active:scale-95"
      >
        <Home className="w-4 h-4" />
        Return to Home
      </button>
    </div>
  );
}
