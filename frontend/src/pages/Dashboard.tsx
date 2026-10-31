import React, { useEffect, useState } from 'react';
import {
  Users,
  Repeat,
  DollarSign,
  AlertTriangle,
  Play,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  CheckCircle,
} from 'lucide-react';
import { FinanceSummary, Subscription, Invoice, User } from '../types';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { useRealtime } from '../context/RealtimeContext';

interface DashboardProps {
  currentUser: User | null;
  onNavigate: (tab: string) => void;
  onOpenBillingModal: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentUser,
  onNavigate,
  onOpenBillingModal,
}) => {
  const { formatCurrency, isConnected } = useRealtime();
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [recentSubs, setRecentSubs] = useState<Subscription[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Reactive listener: automatically refresh when real-time events arrive!
  useEffect(() => {
    const handleRealtimeEvent = () => {
      loadData();
    };
    window.addEventListener('brightloop_realtime_event', handleRealtimeEvent);
    return () => {
      window.removeEventListener('brightloop_realtime_event', handleRealtimeEvent);
    };
  }, [currentUser]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (currentUser?.role === 'customer') {
        const subs = await api.getSubscriptions();
        const invs = await api.getInvoices();
        setRecentSubs(subs);
        setRecentInvoices(invs);
      } else {
        const [sum, subs, invs] = await Promise.all([
          api.getFinanceSummary(),
          api.getSubscriptions(),
          api.getInvoices(),
        ]);
        setSummary(sum);
        setRecentSubs(subs.slice(0, 5));
        setRecentInvoices(invs.slice(0, 5));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const isCustomer = currentUser?.role === 'customer';

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-[#714B67] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isCustomer) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-[#714B67] to-[#583A50] rounded-2xl p-8 text-white shadow-xl">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome, {currentUser?.full_name}
          </h1>
          <p className="text-purple-100 text-sm mt-1 max-w-xl">
            Manage your Brightloop subscriptions, download upcoming and paid invoices, and configure your plan preferences directly from your self-service portal.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('customer_portal')}
              className="bg-white text-[#714B67] hover:bg-purple-50 px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all flex items-center gap-2"
            >
              Open Full Self-Service Portal <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Customer Quick Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Repeat className="w-4 h-4 text-[#714B67]" /> Your Active Subscriptions ({recentSubs.length})
            </h2>
            {recentSubs.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">No active subscriptions currently.</p>
            ) : (
              <div className="space-y-3">
                {recentSubs.map((sub) => (
                  <div key={sub.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{sub.subscription_number}</p>
                      <p className="text-xs text-slate-500">Plan: {sub.plan?.name}</p>
                    </div>
                    <StatusBadge status={sub.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#714B67]" /> Recent Invoices ({recentInvoices.length})
            </h2>
            {recentInvoices.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">No invoices issued yet.</p>
            ) : (
              <div className="space-y-3">
                {recentInvoices.map((inv) => (
                  <div key={inv.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{inv.invoice_number}</p>
                      <p className="text-xs text-slate-500">Due: {inv.due_date} • {formatCurrency(inv.grand_total)}</p>
                    </div>
                    <StatusBadge status={inv.status} isOverdue={inv.status === 'confirmed' && new Date(inv.due_date) < new Date()} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Executive Dashboard</h1>
          <p className="text-sm text-slate-500">Brightloop Software recurring billing & revenue hub</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenBillingModal}
            className="flex items-center gap-2 bg-[#714B67] hover:bg-[#583A50] text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md shadow-[#714B67]/20 transition-all"
          >
            <Play className="w-4 h-4 fill-white" /> Run Billing Day Batch
          </button>
          <button
            onClick={() => onNavigate('subscriptions')}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> New Quote / Subscription
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Subscriptions</span>
              <div className="p-2.5 rounded-xl bg-purple-50 text-[#714B67]">
                <Repeat className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-slate-900">{summary.active_subscriptions}</span>
              <span className="text-xs text-slate-500 ml-2 font-medium">of {summary.total_subscriptions} total</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monthly Recurring (MRR)</span>
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-emerald-600">{formatCurrency(summary.mrr)}</span>
              <span className="text-xs text-slate-500 ml-2 font-medium">ARR: {formatCurrency(summary.arr)}</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Revenue Collected</span>
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-slate-900">{formatCurrency(summary.total_revenue)}</span>
              <span className="text-xs text-slate-500 ml-2 font-medium">Paid Invoices: {summary.paid_invoices_count}</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overdue Invoices</span>
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-rose-600">{summary.overdue_invoices_count}</span>
              <span className="text-xs text-rose-600 ml-2 font-semibold">
                ({formatCurrency(summary.overdue_amount)} owed)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Subscriptions */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Repeat className="w-4 h-4 text-[#714B67]" /> Active & Recent Subscriptions
            </h2>
            <button
              onClick={() => onNavigate('subscriptions')}
              className="text-xs font-semibold text-[#714B67] hover:underline"
            >
              View All
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {recentSubs.map((sub) => (
              <div key={sub.id} className="p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{sub.subscription_number}</p>
                  <p className="text-xs text-slate-500 font-medium">
                    {sub.customer?.company_name || sub.customer?.full_name} • Plan: {sub.plan?.name}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-600">Due: {sub.next_billing_date}</span>
                  <StatusBadge status={sub.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#714B67]" /> Invoices & Billing Run
            </h2>
            <button
              onClick={() => onNavigate('invoices')}
              className="text-xs font-semibold text-[#714B67] hover:underline"
            >
              View All Invoices
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {recentInvoices.map((inv) => {
              const isOverdue = inv.status === 'confirmed' && new Date(inv.due_date) < new Date();
              return (
                <div key={inv.id} className="p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{inv.invoice_number}</p>
                    <p className="text-xs text-slate-500 font-medium">
                      {inv.customer?.company_name || inv.customer?.full_name} • {formatCurrency(inv.grand_total)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-600">Due: {inv.due_date}</span>
                    <StatusBadge status={inv.status} isOverdue={isOverdue} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

