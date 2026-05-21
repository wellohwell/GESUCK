import React from 'react';
import { useNavigate } from 'react-router-dom';
import { InstallmentCalculator } from '../components/tools/InstallmentCalculator';
import { X } from 'lucide-react';

export default function CalculatorPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-end">
        <button onClick={() => navigate('/tools')} className="p-2 rounded-full hover:bg-muted">
          <X size={24} />
        </button>
      </div>

      <div className="pt-2 px-4 pb-4">
        <InstallmentCalculator />
      </div>
    </div>
  );
}
