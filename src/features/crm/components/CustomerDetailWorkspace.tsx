import React from 'react';
import { Customer, OrderEntity } from '../types/crm.types';

interface CustomerDetailWorkspaceProps {
  customer: Customer;
  orders: OrderEntity[];
  onRepeatOrder: () => void;
}

export function CustomerDetailWorkspace({ customer, orders, onRepeatOrder }: CustomerDetailWorkspaceProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Profile Overview */}
      <div className="col-span-1 border border-border/50 bg-card p-6 rounded-[1.5rem]">
        <h2 className="text-xl font-bold uppercase tracking-wide">{customer.name || customer.nama}</h2>
        <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
          {customer.businessName || customer.usaha || 'Personal'}
        </p>
        
        <div className="mt-6 space-y-4 text-sm font-medium">
          <div className="flex justify-between border-b border-border/50 pb-2">
            <span className="text-muted-foreground">Phone</span>
            <span>{customer.phone || customer.nomor}</span>
          </div>
          <div className="flex justify-between border-b border-border/50 pb-2">
            <span className="text-muted-foreground">Orders</span>
            <span>{customer.totalOrders || customer.orderCount || 0}</span>
          </div>
          <div className="flex justify-between border-b border-border/50 pb-2">
            <span className="text-muted-foreground">Status</span>
            <span className="uppercase text-primary">{customer.status}</span>
          </div>
        </div>

        <button 
          onClick={onRepeatOrder}
          className="w-full mt-6 py-3 bg-primary text-primary-foreground font-bold uppercase tracking-widest text-xs rounded-full hover:opacity-90 active:scale-95 transition-all"
        >
          Create Repeat Order
        </button>
      </div>

      {/* Timeline & Order History */}
      <div className="col-span-1 lg:col-span-2 space-y-6">
        <div className="border border-border/50 bg-card p-6 rounded-[1.5rem]">
          <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Order History</h3>
          <div className="space-y-3">
            {orders.length === 0 ? (
              <p className="text-xs text-muted-foreground">No orders found.</p>
            ) : (
              orders.map(order => (
                <div key={order.id} className="p-4 bg-muted/30 rounded-full flex justify-between items-center px-6">
                  <div>
                    <p className="font-bold text-sm">{order.itemName || order.barang}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
                      {order.tenor} {order.tenorType || 'hari'}
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-background rounded text-xs font-medium uppercase border border-border/50">
                    {order.status || order.stage}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
