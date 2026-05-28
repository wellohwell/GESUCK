import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchX, Home } from 'lucide-react';
import { ActionButton } from '../../components/ui/buttons';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center">
      <div className="w-16 h-16 bg-zinc-100 dark:bg-card/10 rounded-full flex items-center justify-center mb-6">
        <SearchX className="w-8 h-8 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-black text-foreground mb-2 tracking-tight">Page Not Found</h1>
      <p className="text-muted-foreground mb-8 text-sm max-w-[280px]">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <ActionButton
        onClick={() => navigate('/', { replace: true })}
        icon={Home}
      >
        Return to Home
      </ActionButton>
    </div>
  );
}
