import React, { useEffect, useState } from 'react';
import {
  Repeat,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Play,
  Pause,
  XCircle,
  FileText,
  BookmarkCheck,
  ChevronRight,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { Subscription, QuotationTemplate, User, Product, Plan, TaxRule, DiscountRule } from '../types';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';

interface SubscriptionsProps {
  onSelectSubscription?: (sub: Subscription) => void;
  onViewInvoice?: (invoiceId: number) => void;
}

export const Subscriptions: React.FC<SubscriptionsProps> = ({ onSelectSubscription }) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [templates, setTemplates] = useState<QuotationTemplate[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [taxes, setTaxes] = useState<TaxRule[]>([]);
  const [discounts, setDiscounts] = useState<DiscountRule[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  // Modals
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState<boolean>(false);
  const [selectedSubDetail, setSelectedSubDetail] = useState<Subscription | null>(null);

  // Form states
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [quoteNotes, setQuoteNotes] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Custom Quote creation states
  const [customPlanId, setCustomPlanId] = useState<number | ''>('');
  const [customStartDate, setCustomStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customPaymentTerms, setCustomPaymentTerms] = useState<string>('Net 30');
  const [customTaxId, setCustomTaxId] = useState<number | ''>('');
  const [customDiscountId, setCustomDiscountId] = useState<number | ''>('');
  const [customLines, setCustomLines] = useState<Array<{ product_id: number; variant_id?: number; quantity: number; unit_price: number }>>([
    { product_id: 0, quantity: 1, unit_price: 0 },
  ]);

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  // Reactive updates from Real-Time WebSocket stream
  useEffect(() => {
    const handleRealtimeEvent = () => {
      loadData();
    };
    window.addEventListener('brightloop_realtime_event', handleRealtimeEvent);
    return () => {
      window.removeEventListener('brightloop_realtime_event', handleRealtimeEvent);
    };
  }, [statusFilter, search]);

  const loadData = async () => {
    setLoading(true);
    try {
      const subs = await api.getSubscriptions({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search || undefined,
      });
      setSubscriptions(subs);

      const [tpls, custs, prods, plns, txs, dscs] = await Promise.all([
        api.getTemplates(),
        api.getCustomers(),
        api.getProducts(),
        api.getPlans(),
        api.getTaxes(),
        api.getDiscounts(),
      ]);
      setTemplates(tpls);
      setCustomers(custs);
      setProducts(prods);
      setPlans(plns);
      setTaxes(txs);
      setDiscounts(dscs);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusTransition = async (subId: number, newStatus: string) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      await api.updateSubscriptionStatus(subId, newStatus);
      setActionSuccess(`Subscription moved to ${newStatus.toUpperCase()}`);
      loadData();
      if (selectedSubDetail && selectedSubDetail.id === subId) {
        const updated = await api.getSubscription(subId);
        setSelectedSubDetail(updated);
      }
    } catch (err: any) {
      setActionError(err.message || 'Status transition failed');
    }
  };

  const handleGenerateInvoice = async (subId: number) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      const inv = await api.generateInvoiceForSubscription(subId, true);
      setActionSuccess(`Generated Invoice ${inv.invoice_number} successfully!`);
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Invoice generation failed');
    }
  };

  const handleCreateFromTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId || !selectedCustomerId) return;
    try {
      await api.createSubscriptionFromTemplate(
        Number(selectedTemplateId),
        Number(selectedCustomerId),
        quoteNotes
      );
      setIsTemplateModalOpen(false);
      setSelectedTemplateId('');
      setSelectedCustomerId('');
      setQuoteNotes('');
      loadData();
      setActionSuccess('Quotation successfully created from template!');
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleAddCustomLine = () => {
    setCustomLines([...customLines, { product_id: 0, quantity: 1, unit_price: 0 }]);
  };

  const handleUpdateCustomLine = (index: number, field: string, value: any) => {
    const updated = [...customLines];
    if (field === 'product_id') {
      const pid = Number(value);
      const prod = products.find((p) => p.id === pid);
      updated[index].product_id = pid;
      updated[index].unit_price = prod ? Number(prod.sales_price) : 0;
      updated[index].variant_id = undefined;
    } else if (field === 'variant_id') {
      const vid = value ? Number(value) : undefined;
      updated[index].variant_id = vid;
      const prod = products.find((p) => p.id === updated[index].product_id);
      if (prod) {
        let base = Number(prod.sales_price);
        if (vid) {
          const variant = prod.variants.find((v) => v.id === vid);
          if (variant) base += Number(variant.price_extra);
        }
        updated[index].unit_price = base;
      }
    } else if (field === 'quantity') {
      updated[index].quantity = Math.max(1, parseInt(value) || 1);
    } else if (field === 'unit_price') {
      updated[index].unit_price = parseFloat(value) || 0;
    }
    setCustomLines(updated);
  };

  const handleCreateCustomSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !customPlanId) return;

    try {
      await api.createSubscription({
        customer_id: Number(selectedCustomerId),
        plan_id: Number(customPlanId),
        start_date: customStartDate,
        payment_terms: customPaymentTerms,
        tax_id: customTaxId ? Number(customTaxId) : undefined,
        discount_id: customDiscountId ? Number(customDiscountId) : undefined,
        notes: quoteNotes,
        lines: customLines.map((l) => ({
          product_id: l.product_id,
          variant_id: l.variant_id,
          quantity: l.quantity,
          unit_price: l.unit_price,
          tax_rate: 0,
        })),
      });
      setIsCustomModalOpen(false);
      loadData();
      setActionSuccess('Custom subscription quote created successfully!');
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const statuses = [
    { id: 'all', label: 'All States' },
    { id: 'draft', label: 'Draft' },
    { id: 'quotation', label: 'Quotation' },
    { id: 'confirmed', label: 'Confirmed' },
    { id: 'active', label: 'Active' },
    { id: 'paused', label: 'Paused' },
    { id: 'closed', label: 'Closed' },
  ];

  return (
    <div className="space-y-6">
      {/* Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Subscriptions & Quotes
          </h1>
          <p className="text-sm text-slate-500">
            Lifecycle state pipeline: Draft ➔ Quotation ➔ Confirmed ➔ Active ➔ Closed
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="flex items-center gap-2 bg-[#714B67] hover:bg-[#583A50] text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-all"
          >
            <BookmarkCheck className="w-4 h-4" /> Quote from Template
          </button>
          <button
            onClick={() => setIsCustomModalOpen(true)}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Custom Subscription
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-xs font-bold">Dismiss</button>
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-xs font-bold">Dismiss</button>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* State tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {statuses.map((tab) => (
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

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search sub number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadData()}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#714B67] outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Subscription #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Plan & Frequency</th>
                <th className="py-3 px-4">Next Billing Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500">
                    No subscriptions found matching the selected filter.
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => (
                  <tr
                    key={sub.id}
                    onClick={() => setSelectedSubDetail(sub)}
                    className="hover:bg-slate-50/60 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <Repeat className="w-4 h-4 text-[#714B67]" />
                      {sub.subscription_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800">
                        {sub.customer?.company_name || sub.customer?.full_name}
                      </p>
                      <p className="text-xs text-slate-400">{sub.customer?.email}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-800">{sub.plan?.name}</span>
                      <span className="text-xs text-slate-500 capitalize block">
                        Interval: {sub.plan?.billing_frequency}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                      {sub.next_billing_date}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {sub.status === 'draft' && (
                          <button
                            onClick={() => handleStatusTransition(sub.id, 'quotation')}
                            className="text-xs font-semibold px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
                          >
                            Send Quote
                          </button>
                        )}
                        {sub.status === 'quotation' && (
                          <button
                            onClick={() => handleStatusTransition(sub.id, 'confirmed')}
                            className="text-xs font-semibold px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                          >
                            Confirm Quote
                          </button>
                        )}
                        {sub.status === 'confirmed' && (
                          <button
                            onClick={() => handleStatusTransition(sub.id, 'active')}
                            className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          >
                            Activate
                          </button>
                        )}
                        {sub.status === 'active' && (
                          <>
                            <button
                              onClick={() => handleGenerateInvoice(sub.id)}
                              title="Generate Next Cycle Invoice"
                              className="text-xs font-semibold px-2 py-1 rounded bg-purple-50 text-[#714B67] hover:bg-purple-100 flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3" /> Bill Now
                            </button>
                            <button
                              onClick={() => handleStatusTransition(sub.id, 'paused')}
                              title="Pause Subscription"
                              className="text-xs font-semibold px-2 py-1 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 flex items-center gap-1"
                            >
                              <Pause className="w-3 h-3" /> Pause
                            </button>
                            <button
                              onClick={() => handleStatusTransition(sub.id, 'closed')}
                              title="Close Early"
                              className="text-xs font-semibold px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 flex items-center gap-1"
                            >
                              <XCircle className="w-3 h-3" /> Close
                            </button>
                          </>
                        )}
                        {sub.status === 'paused' && (
                          <button
                            onClick={() => handleStatusTransition(sub.id, 'active')}
                            className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center gap-1"
                          >
                            <Play className="w-3 h-3" /> Resume
                          </button>
                        )}
                        {sub.status === 'closed' && (
                          <button
                            onClick={() => handleStatusTransition(sub.id, 'active')}
                            className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-800 hover:bg-slate-200"
                          >
                            Renew
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedSubDetail(sub)}
                          className="p-1 text-slate-400 hover:text-slate-700"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Quote from Template (Page 3 Requirement) */}
      <Modal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        title="Create Quote from Quotation Template"
      >
        <form onSubmit={handleCreateFromTemplate} className="space-y-4">
          <p className="text-xs text-slate-500">
            A sales rep starts from a quotation template with pre-configured plan and product lines.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Select Quotation Template
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              required
            >
              <option value="">-- Choose Template --</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} (Valid {tpl.validity_days} days)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Select Customer
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              required
            >
              <option value="">-- Choose Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} ({c.company_name || c.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Offer Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={quoteNotes}
              onChange={(e) => setQuoteNotes(e.target.value)}
              placeholder="Custom terms, seat allocations, or special remarks..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsTemplateModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-[#714B67] hover:bg-[#583A50] text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-sm"
            >
              Generate Quotation
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Custom Subscription Builder (with Variants e.g. Odoo brand +560) */}
      <Modal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        title="Build Custom Subscription Offer"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateCustomSubscription} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Customer
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                required
              >
                <option value="">-- Select Customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.company_name || c.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Subscription Plan
              </label>
              <select
                value={customPlanId}
                onChange={(e) => setCustomPlanId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                required
              >
                <option value="">-- Select Plan --</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (${Number(p.cost).toFixed(2)} / {p.billing_frequency})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Payment Terms
              </label>
              <select
                value={customPaymentTerms}
                onChange={(e) => setCustomPaymentTerms(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="Immediate">Immediate</option>
                <option value="Net 15">Net 15 Days</option>
                <option value="Net 30">Net 30 Days</option>
                <option value="Net 60">Net 60 Days</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Tax Rule
              </label>
              <select
                value={customTaxId}
                onChange={(e) => setCustomTaxId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="">None (0%)</option>
                {taxes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({(Number(t.rate) * 100).toFixed(0)}%)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Product Lines with Variants */}
          <div className="border-t border-slate-200 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Product Lines & Variants
              </span>
              <button
                type="button"
                onClick={handleAddCustomLine}
                className="text-xs font-semibold text-[#714B67] hover:underline"
              >
                + Add Line
              </button>
            </div>

            <div className="space-y-3">
              {customLines.map((line, idx) => {
                const selectedProd = products.find((p) => p.id === line.product_id);
                return (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-5">
                      <select
                        value={line.product_id}
                        onChange={(e) => handleUpdateCustomLine(idx, 'product_id', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                        required
                      >
                        <option value="0">-- Select Product --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (${Number(p.sales_price).toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-3">
                      {selectedProd && selectedProd.variants?.length > 0 ? (
                        <select
                          value={line.variant_id || ''}
                          onChange={(e) => handleUpdateCustomLine(idx, 'variant_id', e.target.value)}
                          className="w-full px-2 py-1.5 border border-purple-300 bg-purple-50 text-[#714B67] font-medium rounded-lg text-xs"
                        >
                          <option value="">Standard Base</option>
                          {selectedProd.variants.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name} (+${Number(v.price_extra).toFixed(2)})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No variants</span>
                      )}
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(e) => handleUpdateCustomLine(idx, 'quantity', e.target.value)}
                        placeholder="Qty"
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs text-center"
                      />
                    </div>

                    <div className="col-span-2 text-right font-semibold text-slate-800 text-xs">
                      ${(line.unit_price * line.quantity).toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCustomModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-[#714B67] hover:bg-[#583A50] text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-sm"
            >
              Create Subscription Quote
            </button>
          </div>
        </form>
      </Modal>

      {/* Subscription Detail Slide-over / Modal */}
      {selectedSubDetail && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedSubDetail(null)}
          title={`Subscription Details: ${selectedSubDetail.subscription_number}`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-6">
            {/* Header Status Pipeline */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current State</span>
                  <div className="mt-1">
                    <StatusBadge status={selectedSubDetail.status} />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedSubDetail.status === 'draft' && (
                    <button
                      onClick={() => handleStatusTransition(selectedSubDetail.id, 'quotation')}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
                    >
                      Convert to Quotation
                    </button>
                  )}
                  {selectedSubDetail.status === 'quotation' && (
                    <button
                      onClick={() => handleStatusTransition(selectedSubDetail.id, 'confirmed')}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700"
                    >
                      Confirm Quote
                    </button>
                  )}
                  {selectedSubDetail.status === 'confirmed' && (
                    <button
                      onClick={() => handleStatusTransition(selectedSubDetail.id, 'active')}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                    >
                      Activate Subscription
                    </button>
                  )}
                  {selectedSubDetail.status === 'active' && (
                    <>
                      <button
                        onClick={() => handleGenerateInvoice(selectedSubDetail.id)}
                        className="px-3 py-1.5 bg-[#714B67] text-white rounded-lg text-xs font-bold hover:bg-[#583A50]"
                      >
                        Generate Invoice
                      </button>
                      <button
                        onClick={() => handleStatusTransition(selectedSubDetail.id, 'paused')}
                        className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700"
                      >
                        Pause
                      </button>
                      <button
                        onClick={() => handleStatusTransition(selectedSubDetail.id, 'closed')}
                        className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700"
                      >
                        Close Early
                      </button>
                    </>
                  )}
                  {selectedSubDetail.status === 'paused' && (
                    <button
                      onClick={() => handleStatusTransition(selectedSubDetail.id, 'active')}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                    >
                      Resume Active
                    </button>
                  )}
                  {selectedSubDetail.status === 'closed' && (
                    <button
                      onClick={() => handleStatusTransition(selectedSubDetail.id, 'active')}
                      className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900"
                    >
                      Renew Subscription
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-slate-400 font-semibold uppercase">Customer</p>
                <p className="font-bold text-slate-800 mt-0.5">{selectedSubDetail.customer?.full_name}</p>
                <p className="text-slate-500">{selectedSubDetail.customer?.email}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold uppercase">Plan & Cycle</p>
                <p className="font-bold text-slate-800 mt-0.5">{selectedSubDetail.plan?.name}</p>
                <p className="text-slate-500 capitalize">{selectedSubDetail.plan?.billing_frequency} recurring</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold uppercase">Next Billing Date</p>
                <p className="font-bold text-slate-800 font-mono mt-0.5">{selectedSubDetail.next_billing_date}</p>
                <p className="text-slate-500">Terms: {selectedSubDetail.payment_terms}</p>
              </div>
            </div>

            {/* Product Lines */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Itemized Product Lines</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Product / Variant</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedSubDetail.lines.map((l, i) => (
                      <tr key={i}>
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-slate-800">{l.product_name}</p>
                          {l.variant_name && <p className="text-purple-700 font-medium">{l.variant_name}</p>}
                        </td>
                        <td className="py-2.5 px-3 text-center font-medium">{l.quantity}</td>
                        <td className="py-2.5 px-3 text-right">${Number(l.unit_price).toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">${Number(l.line_amount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Plan Lifecycle Permissions */}
            {selectedSubDetail.plan && (
              <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-100 text-xs">
                <p className="font-bold text-purple-900 mb-1">Plan Lifecycle Policy Enforcement:</p>
                <div className="flex flex-wrap gap-2 text-purple-800">
                  <span className="bg-white px-2 py-0.5 rounded border border-purple-200">
                    Auto-close on End: {selectedSubDetail.plan.close_on_end ? 'Yes' : 'No'}
                  </span>
                  <span className="bg-white px-2 py-0.5 rounded border border-purple-200">
                    Early Close Allowed: {selectedSubDetail.plan.allow_early_close ? 'Yes' : 'No'}
                  </span>
                  <span className="bg-white px-2 py-0.5 rounded border border-purple-200">
                    Pause Allowed: {selectedSubDetail.plan.allow_pause ? 'Yes' : 'No'}
                  </span>
                  <span className="bg-white px-2 py-0.5 rounded border border-purple-200">
                    Renewal Allowed: {selectedSubDetail.plan.allow_renewal ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

