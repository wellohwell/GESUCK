/**
 * Offline Sync Queue helper for PWA Production-Grade Offline-First Architecture
 */

export interface OfflineSyncItem {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  data: any;
  timestamp: string;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
}

const QUEUE_KEY = 'pwa_offline_sync_queue';

// Get current pending sync queue items
export function getOfflineQueue(): OfflineSyncItem[] {
  try {
    const queueJson = localStorage.getItem(QUEUE_KEY);
    return queueJson ? JSON.parse(queueJson) : [];
  } catch (e) {
    console.error('Failed to read offline sync queue:', e);
    return [];
  }
}

// Save queue back to localStorage
export function saveOfflineQueue(queue: OfflineSyncItem[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to save offline sync queue:', e);
  }
}

// Add an item to the offline queue
export function enqueueOfflineAction(type: 'CREATE' | 'UPDATE' | 'DELETE', entity: string, data: any): string {
  const queue = getOfflineQueue();
  const id = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const newItem: OfflineSyncItem = {
    id,
    type,
    entity,
    data,
    timestamp: new Date().toISOString(),
    status: 'pending'
  };
  
  queue.push(newItem);
  saveOfflineQueue(queue);
  
  // Dispatch a custom event to notify listeners (like the Settings tabs)
  window.dispatchEvent(new CustomEvent('pwa_sync_queue_update', { detail: queue }));
  return id;
}

// Clear or update item status
export function removeOfflineAction(id: string) {
  const queue = getOfflineQueue();
  const filtered = queue.filter(item => item.id !== id);
  saveOfflineQueue(filtered);
  window.dispatchEvent(new CustomEvent('pwa_sync_queue_update', { detail: filtered }));
}

// Fast simulate offline synchronization
export async function runBackgroundSync(onProgress?: (activeItem: OfflineSyncItem) => void): Promise<number> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return 0;
  
  let syncedCount = 0;
  const originalQueue = [...queue];
  
  for (const item of originalQueue) {
    if (item.status === 'completed') continue;
    
    // Update status to syncing
    item.status = 'syncing';
    if (onProgress) onProgress(item);
    
    // In a real database write, we would proceed with Firestore sync
    // Standard Firestore handles write queuing on its own, but we synchronize
    // our high-level diagnostic sync queue by waiting briefly to simulate payload push
    await new Promise(resolve => setTimeout(resolve, 800));
    
    item.status = 'completed';
    syncedCount++;
    
    // Remove from queue
    removeOfflineAction(item.id);
  }
  
  localStorage.setItem('pwa_offline_last_sync_time', new Date().toISOString());
  window.dispatchEvent(new Event('pwa_last_sync_update'));
  return syncedCount;
}
