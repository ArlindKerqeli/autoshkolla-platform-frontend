import { create } from 'zustand';

interface QueuedRequest {
  id: string;
  method: string;
  url: string;
  data?: unknown;
  timestamp: number;
}

interface OfflineState {
  isOffline: boolean;
  lastSyncTime: number | null;
  offlineQueue: QueuedRequest[];
  setOffline: (offline: boolean) => void;
  setLastSyncTime: (time: number) => void;
  addToQueue: (request: Omit<QueuedRequest, 'id' | 'timestamp'>) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
}

export const useOfflineStore = create<OfflineState>((set) => ({
  isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
  lastSyncTime: null,
  offlineQueue: [],
  setOffline: (offline) => set({ isOffline: offline }),
  setLastSyncTime: (time) => set({ lastSyncTime: time }),
  addToQueue: (request) =>
    set((state) => ({
      offlineQueue: [
        ...state.offlineQueue,
        {
          ...request,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        },
      ],
    })),
  removeFromQueue: (id) =>
    set((state) => ({
      offlineQueue: state.offlineQueue.filter((r) => r.id !== id),
    })),
  clearQueue: () => set({ offlineQueue: [] }),
}));
