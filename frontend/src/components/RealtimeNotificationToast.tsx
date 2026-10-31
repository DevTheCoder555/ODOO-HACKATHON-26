import React from 'react';
import { useRealtime } from '../context/RealtimeContext';
import { Zap, CheckCircle2, FileText, ArrowRight, X } from 'lucide-react';

export const RealtimeNotificationToast: React.FC = () => {
  const { activeNotification, dismissNotification, formatCurrency } = useRealtime();

  if (!activeNotification) return null;

  const { type, payload, timestamp } = activeNotification;

  let badgeColor = 'bg-emerald-500 text-white';
  let title = 'Real-Time Event';
  let icon = <Zap className="w-4 h-4 text-white animate-pulse" />;

  if (type === 'PAYMENT_RECEIVED' || type === 'PAYMENT_RECORDED') {
    badgeColor = 'bg-emerald-600 text-white';
    title = 'Live Payment Received';
    icon = <CheckCircle2 className="w-4 h-4 text-white" />;
  } else if (type === 'INVOICE_STATUS_UPDATED' || type === 'INVOICE_GENERATED') {
    badgeColor = 'bg-blue-600 text-white';
    title = 'Invoice Event';
    icon = <FileText className="w-4 h-4 text-white" />;
  } else if (type === 'BILLING_BATCH_COMPLETED') {
    badgeColor = 'bg-purple-600 text-white';
    title = 'Batch Billing Completed';
    icon = <Zap className="w-4 h-4 text-white" />;
  } else if (type === 'SUBSCRIPTION_STATUS_UPDATED') {
    badgeColor = 'bg-amber-600 text-white';
    title = 'Subscription Lifecycle';
    icon = <ArrowRight className="w-4 h-4 text-white" />;
  }

  return (
    <div className="fixed top-20 right-6 z-50 max-w-sm w-full bg-slate-900 border border-slate-700 text-white shadow-2xl rounded-2xl p-4 transition-all animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl flex-shrink-0 ${badgeColor}`}>
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-300">
                {title}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            </div>
            <p className="text-sm font-semibold text-white mt-0.5">
              {payload.message || 'New live update recorded'}
            </p>
            {payload.amount !== undefined && (
              <p className="text-xs font-mono text-emerald-400 mt-1 font-bold">
                {formatCurrency(payload.amount)}
                {payload.customer_name ? ` • ${payload.customer_name}` : ''}
              </p>
            )}
            <span className="text-[10px] text-slate-400 mt-1 block">
              {new Date(timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>

        <button
          onClick={dismissNotification}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

