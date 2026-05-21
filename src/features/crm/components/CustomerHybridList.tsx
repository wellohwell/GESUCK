import React from 'react';
import { Customer } from '../types/crm.types';

interface CustomerHybridListProps {
  customers: Customer[];
  onSelectCustomer: (customer: Customer) => void;
}

export function CustomerHybridList({ customers, onSelectCustomer }: CustomerHybridListProps) {
  if (customers.length === 0) {
    return (
      <div className="py-20 text-center bg-card rounded-2xl border border-dashed border-border">
        <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">No customers found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {customers.map((customer) => (
        <div 
          key={customer.id}
          onClick={() => onSelectCustomer(customer)}
          className="p-4 bg-card hover:bg-accent/10 border-b lg:border border-border/50 lg:rounded-xl cursor-pointer transition-all active:scale-[0.98] flex items-center justify-between"
        >
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground uppercase tracking-wide truncate">
              {customer.name || customer.nama}
            </h3>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
              {customer.phone || customer.nomor} • {customer.businessName || customer.usaha || 'Personal'}
            </p>
          </div>
          <div className="shrink-0 text-right ml-4">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase font-bold tracking-wider">
              {customer.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
