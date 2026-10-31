import React, { useEffect, useState } from 'react';
import { Percent, Plus, Tag, Calendar, Check, AlertCircle, Shield } from 'lucide-react';
import { DiscountRule, Product } from '../types';
import { api } from '../api/client';
import { Modal } from '../components/Modal';

export const Discounts: React.FC = () => {
  const [discounts, setDiscounts] = useState<DiscountRule[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Form states (Page 4 requirement)
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('10.00');
  const [minPurchaseAmount, setMinPurchaseAmount] = useState('0.00');
  const [minQuantity, setMinQuantity] = useState(0);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [usageLimit, setUsageLimit] = useState<number | ''>(50);
  const [scope, setScope] = useState<'whole_subscription' | 'specific_products'>('whole_subscription');
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);

  useEffect(() => {
    loadDiscounts();
  }, []);

  const loadDiscounts = async () => {
    setLoading(true);
    try {
      const [d, p] = await Promise.all([api.getDiscounts(), api.getProducts()]);
      setDiscounts(d);
      setProducts(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createDiscount({
        code: code.trim().toUpperCase(),
        name,
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
        min_purchase_amount: parseFloat(minPurchaseAmount) || 0,
        min_quantity: minQuantity || 0,
        start_date: startDate,
        end_date: endDate,
        usage_limit: usageLimit ? Number(usageLimit) : undefined,
        scope,
        specific_product_ids: scope === 'specific_products' ? selectedProductIds : undefined,
      });
      setIsModalOpen(false);
      setCode('');
      setName('');
      setNotification('Discount rule created successfully!');
      loadDiscounts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Discount Rules & Engine
            </h1>
            <span className="text-xs bg-purple-100 text-[#714B67] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Shield className="w-3 h-3" /> Admin Configured
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Rules apply automatically on billing day without manual intervention, respecting seat counts, usage limits, and date validity.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[#714B67] hover:bg-[#583A50] text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" /> Create Discount Rule
        </button>
      </div>

      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center justify-between">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-xs font-bold">Dismiss</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 uppercase font-semibold text-slate-500">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Rule Name</th>
                <th className="py-3 px-4">Discount</th>
                <th className="py-3 px-4">Scope</th>
                <th className="py-3 px-4">Conditions</th>
                <th className="py-3 px-4">Validity</th>
                <th className="py-3 px-4 text-center">Usage</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {discounts.map((d) => {
                const isExpired = new Date(d.end_date) < new Date();
                const isExhausted = d.usage_limit && d.used_count >= d.usage_limit;

                return (
                  <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 bg-slate-50/60 rounded">
                      {d.code}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{d.name}</td>
                    <td className="py-3 px-4 font-bold text-[#714B67]">
                      {d.discount_type === 'percentage'
                        ? `${Number(d.discount_value)}% Off`
                        : `$${Number(d.discount_value).toFixed(2)} Off`}
                    </td>
                    <td className="py-3 px-4 capitalize">
                      <span className="px-2 py-0.5 rounded bg-purple-50 text-[#714B67] font-medium">
                        {d.scope.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {d.min_quantity > 0 && <span>Min Seats: <strong>{d.min_quantity}</strong> </span>}
                      {Number(d.min_purchase_amount) > 0 && <span>Min Spend: <strong>${Number(d.min_purchase_amount)}</strong></span>}
                      {!d.min_quantity && !Number(d.min_purchase_amount) && <span className="text-slate-400">None</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {d.start_date} to {d.end_date}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      <strong>{d.used_count}</strong> / {d.usage_limit || '∞'}
                    </td>
                    <td className="py-3 px-4">
                      {isExpired ? (
                        <span className="text-rose-600 font-semibold">Expired</span>
                      ) : isExhausted ? (
                        <span className="text-amber-600 font-semibold">Limit Reached</span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">Active</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Discount Rule (Page 4 requirement) */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Discount Rule" maxWidth="max-w-xl">
        <form onSubmit={handleCreateDiscount} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Promo Code</label>
              <input
                type="text"
                placeholder="e.g. SEATS20"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono uppercase"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Rule Name</label>
              <input
                type="text"
                placeholder="e.g. 20% Volume Seat Discount"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Discount Type</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Discount Value</label>
              <input
                type="number"
                step="0.01"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Min Quantity (Seats)</label>
              <input
                type="number"
                min="0"
                value={minQuantity}
                onChange={(e) => setMinQuantity(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Min Purchase Spend ($)</label>
              <input
                type="number"
                step="0.01"
                value={minPurchaseAmount}
                onChange={(e) => setMinPurchaseAmount(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Usage Limit</label>
              <input
                type="number"
                placeholder="Unlimited"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value ? parseInt(e.target.value) : '')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Application Scope</label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value="whole_subscription">Whole Subscription Order</option>
              <option value="specific_products">Specific Products Only</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-[#714B67] hover:bg-[#583A50] text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-sm"
            >
              Create Rule
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

