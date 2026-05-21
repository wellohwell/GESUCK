import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center">
      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
        <ShieldAlert className="w-8 h-8 text-red-500" />
      </div>
      <h1 className="text-2xl font-black text-foreground mb-2 tracking-tight">Access Denied</h1>
      <p className="text-muted-foreground mb-8 text-sm max-w-[280px]">
        You do not have the required permissions to access this page. Please contact your administrator if you believe this is an error.
      </p>
      <button 
        onClick={() => navigate('/', { replace: true })}
        className="px-6 py-3 bg-foreground text-background font-bold text-sm rounded-xl flex items-center gap-2 hover:opacity-90 transition-opacity active:scale-95"
      >
        <ArrowLeft className="w-4 h-4" />
        Return to Home
      </button>
    </div>
  );
}
