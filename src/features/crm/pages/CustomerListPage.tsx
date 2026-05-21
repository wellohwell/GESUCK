import React from 'react';
import { AuthGuard } from '../../../components/AuthGuard';
import { HeaderBar } from '../../../components/HeaderBar';

export default function CustomerListPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background pt-6 pb-20">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-xl font-bold mb-4">Customer Directory</h1>
          <p className="text-muted-foreground text-sm">Customer list and directory features will be migrated here.</p>
        </div>
      </div>
    </AuthGuard>
  );
}
