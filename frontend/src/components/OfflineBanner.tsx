import React from 'react';
import { useRealtime } from '../context/RealtimeContext';
import { WifiOff, Database, ShieldCheck } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const { isOnline, isUsingCachedData } = useRealtime();

  if (isOnline && !isUsingCachedData) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-900 px-4 py-2 text-xs flex items-center justify-between">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 font-medium">
          <div className="p-1 rounded-md bg-amber-500 text-white flex-shrink-0">
            <WifiOff className="w-3.5 h-3.5" />
          </div>
          <span>
            <strong className="font-bold">Offline Cache Active:</strong> Network connectivity is unavailable. Serving subscriptions, invoices, plans, and analytics from the local resilient cache layer.
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full border border-amber-300">
          <Database className="w-3 h-3" />
          <span>Local Cache Fallback</span>
        </div>
      </div>
    </div>
  );
};

