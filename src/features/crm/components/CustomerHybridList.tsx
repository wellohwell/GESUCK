import React from 'react';
import { Customer } from '../types/crm.types';
import { OperationalCard } from '../../../components/ui/FintechCard';
import { User } from 'lucide-react';

interface CustomerHybridListProps {
  customers: Customer[];
  onSelectCustomer: (customer: Customer) => void;
}

export function CustomerHybridList({ customers, onSelectCustomer }: CustomerHybridListProps) {
  if (customers.length === 0) {
    return (
      <div className="py-20 text-center bg-card rounded-[1.5rem] border border-dashed border-border">
        <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">No customers found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {customers.map((customer) => (
        <OperationalCard
          key={customer.id}
          title={customer.name || customer.nama}
          subtitle={`${customer.phone || customer.nomor} • ${customer.businessName || customer.usaha || 'Personal'}`}
          icon={User}
          status={
             <span className="text-[9px] px-2 py-1 rounded-lg bg-primary/10 text-primary uppercase font-bold tracking-wider">
               {customer.status}
             </span>
          }
          onClick={() => onSelectCustomer(customer)}
          className="cursor-pointer"
        />
      ))}
    </div>
  );
}
