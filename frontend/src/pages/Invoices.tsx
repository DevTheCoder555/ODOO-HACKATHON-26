import React, { useEffect, useState } from 'react';
import {
  Receipt,
  Play,
  Printer,
  DollarSign,
  Send,
  XCircle,
  CheckCircle,
  AlertTriangle,
  Clock,
  Filter,
} from 'lucide-react';
import { Invoice } from '../types';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { PrintableInvoice } from '../components/PrintableInvoice';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { BillingRunModal } from '../components/BillingRunModal';
import { useRealtime } from '../context/RealtimeContext';

export const Invoices: React.FC = () => {
  const { formatCurrency } = useRealtime();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<Invoice | null>(null);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [isBillingModalOpen, setIsBillingModalOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    loadInvoices();
  }, [statusFilter]);

  // Reactive real-time updates
  useEffect(() => {
    const handleRealtimeEvent = () => {
      loadInvoices();
    };
    window.addEventListener('brightloop_realtime_event', handleRealtimeEvent);
    return () => {
      window.removeEventListener('brightloop_realtime_event', handleRealtimeEvent);
    };
  }, [statusFilter]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const isOverdueTab = statusFilter === 'overdue';
      const statusParam = ['all', 'overdue'].includes(statusFilter) ? undefined : statusFilter;
      const data = await api.getInvoices({
        status: statusParam,
        overdue_only: isOverdueTab,
      });
      setInvoices(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmInvoice = async (invoiceId: number) => {
    try {
      await api.updateInvoiceStatus(invoiceId, 'confirmed');
      setNotification('Invoice confirmed.');
      loadInvoices();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCancelInvoice = async (invoiceId: number) => {
    if (!confirm('Are you sure you want to cancel this invoice?')) return;
    try {
      await api.updateInvoiceStatus(invoiceId, 'cancelled');
      setNotification('Invoice marked as cancelled.');
      loadInvoices();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSendInvoice = async (invoiceId: number) => {
    try {
      const res = await api.sendInvoice(invoiceId);
      setNotification(res.message);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (selectedInvoiceForPrint) {
    return (
      <PrintableInvoice
        invoice={selectedInvoiceForPrint}
        onBack={() => setSelectedInvoiceForPrint(null)}
      />
    );
  }

  const tabs = [
    { id: 'all', label: 'All Invoices' },
    { id: 'draft', label: 'Draft' },
    { id: 'confirmed', label: 'Outstanding (Confirmed)' },
    { id: 'paid', label: 'Paid' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Invoices & Recurring Billing
          </h1>
          <p className="text-sm text-slate-500">
            Automated recurring generation, payment collection, and overdue debt management
          </p>
        </div>

        <button
          onClick={() => setIsBillingModalOpen(true)}
          className="flex items-center gap-2 bg-[#714B67] hover:bg-[#583A50] text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md shadow-[#714B67]/20 transition-all"
        >
          <Play className="w-4 h-4 fill-white" /> Run Billing Day Batch
        </button>
      </div>

      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center justify-between">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-xs font-bold">Dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === tab.id
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Billing Period</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500">
                    No invoices found.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const isOverdue =
                    inv.status === 'confirmed' &&
                    new Date(inv.due_date) < new Date() &&
                    Number(inv.amount_due) > 0;

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800">
                          {inv.customer?.company_name || inv.customer?.full_name}
                        </p>
                        <p className="text-xs text-slate-400">{inv.customer?.email}</p>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 font-medium">
                        {inv.billing_period_start} → {inv.billing_period_end}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono">
                        <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                          {inv.due_date}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        {formatCurrency(inv.grand_total)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold">
                        <span className={Number(inv.amount_due) > 0 ? 'text-slate-900' : 'text-emerald-600'}>
                          {formatCurrency(inv.amount_due)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={inv.status} isOverdue={isOverdue} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedInvoiceForPrint(inv)}
                            title="Print / PDF Invoice"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {inv.status === 'draft' && (
                            <button
                              onClick={() => handleConfirmInvoice(inv.id)}
                              className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors"
                            >
                              Confirm
                            </button>
                          )}

                          {inv.status === 'confirmed' && (
                            <>
                              <button
                                onClick={() => setSelectedInvoiceForPayment(inv)}
                                className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1"
                              >
                                <DollarSign className="w-3 h-3" /> Record Payment
                              </button>
                              <button
                                onClick={() => handleSendInvoice(inv.id)}
                                title="Send to Customer"
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {inv.status !== 'cancelled' && inv.status !== 'paid' && (
                            <button
                              onClick={() => handleCancelInvoice(inv.id)}
                              title="Cancel Invoice"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={!!selectedInvoiceForPayment}
        onClose={() => setSelectedInvoiceForPayment(null)}
        invoice={selectedInvoiceForPayment}
        onSuccess={() => {
          loadInvoices();
          setNotification('Payment recorded successfully!');
        }}
      />

      {/* Billing Day Automation Run Modal */}
      <BillingRunModal
        isOpen={isBillingModalOpen}
        onClose={() => setIsBillingModalOpen(false)}
        onSuccess={loadInvoices}
      />
    </div>
  );
};

