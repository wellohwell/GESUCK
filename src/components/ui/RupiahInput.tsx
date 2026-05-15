import React from 'react';
import { cn } from '../../lib/utils';

interface Props {
  id?: string;
  value?: number;
  onValueChange: (value?: number) => void;
  placeholder?: string;
  className?: string;
  autoMultiply?: boolean;
}

export function RupiahInput({ id, value, onValueChange, placeholder, className, autoMultiply }: Props) {
  const [displayValue, setDisplayValue] = React.useState('');

  React.useEffect(() => {
    if (value === undefined || value === null) {
      setDisplayValue('');
    } else {
      setDisplayValue(new Intl.NumberFormat('id-ID').format(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (!raw) {
      onValueChange(undefined);
      return;
    }
    
    let num = parseInt(raw, 10);
    // User requested "autoMultiply" logic in their code: priceValue = (parseFloat(itemDefaults.JUAL.replace(/[^0-9]/g, '')) * 1000);
    // Actually their calculator sets autoMultiply={true} for Modal and Nawar.
    // In their prompt: "Add '000' by multiplying by 1000"
    
    onValueChange(num);
  };

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-sm">Rp</span>
      <input
        id={id}
        type="text"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(
          "w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C6FF00] transition-all",
          className
        )}
      />
    </div>
  );
}
