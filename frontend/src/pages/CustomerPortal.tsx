import React, { useEffect, useState } from 'react';
import {
  Compass,
  Repeat,
  Receipt,
  Printer,
  Pause,
  Play,
  XCircle,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Subscription, Invoice, User } from '../types';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { PrintableInvoice } from '../components/PrintableInvoice';

interface CustomerPortalProps {
  currentUser: User | null;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({ currentUser }) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPortalData();
  }, [currentUser]);

  const loadPortalData = async () => {
    setLoading(true);
    try {
      const [subs, invs] = await Promise.all([
        api.getSubscriptions(),
        api.getInvoices(),
      ]);
      setSubscriptions(subs);
      setInvoices(invs);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscriptionAction = async (subId: number, status: string) => {
    setError(null);
    setNotification(null);
    try {
      await api.updateSubscriptionStatus(subId, status);
      setNotification(`Subscription updated to ${status}.`);
      loadPortalData();
    } catch (err: any) {
      setError(err.message || 'Action cannot be completed.');
    }
  };

  if (selectedInvoice) {
    return (
      <PrintableInvoice
        invoice={selectedInvoice}
        onBack={() => setSelectedInvoice(null)}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#714B67] to-[#583A50] rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <Compass className="w-8 h-8 text-purple-200" />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Customer Self-Service Portal</h1>
            <p className="text-purple-100 text-xs mt-1">
              Page 2: See and manage your own subscriptions and invoices without having to email anyone.
            </p>
          </div>
        </div>
      </div>

      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center justify-between">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-xs font-bold">Dismiss</button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-xs font-bold">Dismiss</button>
        </div>
      )}

      {/* Subscriptions Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Repeat className="w-4 h-4 text-[#714B67]" /> Your Active Subscriptions ({subscriptions.length})
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          {subscriptions.length === 0 ? (
            <p className="p-6 text-sm text-slate-500 text-center">No subscriptions on record.</p>
          ) : (
            subscriptions.map((sub) => {
              const plan = sub.plan;
              return (
                <div key={sub.id} className="p-5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-base">{sub.subscription_number}</span>
                        <StatusBadge status={sub.status} />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Plan: <strong>{plan?.name}</strong> • Frequency: <strong className="capitalize">{plan?.billing_frequency}</strong>
                      </p>
                      <p className="text-xs text-slate-500">
                        Next Billing Date: <span className="font-mono font-semibold text-slate-800">{sub.next_billing_date}</span>
                      </p>
                    </div>

                    {/* Self-Service Actions (respecting Plan permissions) */}
                    <div className="flex items-center gap-2">
                      {sub.status === 'active' && plan?.allow_pause && (
                        <button
                          onClick={() => handleSubscriptionAction(sub.id, 'paused')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 text-xs font-semibold"
                        >
                          <Pause className="w-3.5 h-3.5" /> Pause
                        </button>
                      )}
                      {sub.status === 'paused' && (
                        <button
                          onClick={() => handleSubscriptionAction(sub.id, 'active')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                        >
                          <Play className="w-3.5 h-3.5" /> Resume
                        </button>
                      )}
                      {sub.status === 'active' && plan?.allow_early_close && (
                        <button
                          onClick={() => handleSubscriptionAction(sub.id, 'closed')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Cancel Early
                        </button>
                      )}
                      {sub.status === 'closed' && plan?.allow_renewal && (
                        <button
                          onClick={() => handleSubscriptionAction(sub.id, 'active')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#714B67] hover:bg-[#583A50] text-white text-xs font-semibold"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Renew
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Lines preview */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2 text-xs">
                    {sub.lines.map((l, i) => (
                      <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md font-medium">
                        {l.product_name} {l.variant_name ? `(${l.variant_name})` : ''} × {l.quantity}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Invoices Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#714B67]" /> Invoices & Billing History ({invoices.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 uppercase font-semibold text-slate-500">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-slate-500">No invoices generated yet.</td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{inv.invoice_number}</td>
                    <td className="py-3 px-4 text-slate-500">{inv.billing_period_start} to {inv.billing_period_end}</td>
                    <td className="py-3 px-4 font-mono font-medium">{inv.due_date}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">${Number(inv.grand_total).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-rose-600">${Number(inv.amount_due).toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={inv.status} isOverdue={inv.status === 'confirmed' && new Date(inv.due_date) < new Date()} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="flex items-center gap-1.5 ml-auto text-xs font-semibold px-2.5 py-1 rounded border border-slate-200 text-slate-700 hover:bg-slate-100"
                      >
                        <Printer className="w-3.5 h-3.5" /> View / Print
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

