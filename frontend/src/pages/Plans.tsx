import React, { useEffect, useState } from 'react';
import { Layers, Plus, Calendar, Clock, Check, Shield } from 'lucide-react';
import { Plan } from '../types';
import { api } from '../api/client';
import { Modal } from '../components/Modal';

export const Plans: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [cost, setCost] = useState('499.00');
  const [billingFrequency, setBillingFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [minQuantity, setMinQuantity] = useState(1);
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableTo, setAvailableTo] = useState('');
  const [closeOnEnd, setCloseOnEnd] = useState(false);
  const [allowEarlyClose, setAllowEarlyClose] = useState(true);
  const [allowPause, setAllowPause] = useState(true);
  const [allowRenewal, setAllowRenewal] = useState(true);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await api.getPlans();
      setPlans(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createPlan({
        name,
        cost: parseFloat(cost),
        billing_frequency: billingFrequency,
        min_quantity: minQuantity,
        available_from: availableFrom || null,
        available_to: availableTo || null,
        close_on_end: closeOnEnd,
        allow_early_close: allowEarlyClose,
        allow_pause: allowPause,
        allow_renewal: allowRenewal,
      });
      setIsModalOpen(false);
      setName('');
      setNotification('Subscription Plan created successfully!');
      loadPlans();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Subscription Plans & Lifecycle
          </h1>
          <p className="text-sm text-slate-500">
            Configure frequencies (daily, weekly, monthly, yearly), minimum quantities, availability dates, and lifecycle rules
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[#714B67] hover:bg-[#583A50] text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" /> Add Plan
        </button>
      </div>

      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center justify-between">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-xs font-bold">Dismiss</button>
        </div>
      )}

      {/* Grid of Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-100 text-[#714B67]">
                  {p.billing_frequency}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  Min Qty: <strong>{p.min_quantity}</strong>
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 mt-3">{p.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-slate-900">${Number(p.cost).toFixed(2)}</span>
                <span className="text-xs text-slate-500">/ {p.billing_frequency}</span>
              </div>

              {/* Lifecycle Policy Badges (Page 3 requirement) */}
              <div className="mt-6 pt-4 border-t border-slate-100 space-y-2 text-xs">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Lifecycle Policies</p>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Close on End:</span>
                  <span className={`font-semibold ${p.close_on_end ? 'text-purple-700' : 'text-slate-400'}`}>
                    {p.close_on_end ? 'Auto-close' : 'Manual'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Early Close:</span>
                  <span className={`font-semibold ${p.allow_early_close ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {p.allow_early_close ? 'Allowed' : 'Restricted'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Pause Sub:</span>
                  <span className={`font-semibold ${p.allow_pause ? 'text-amber-600' : 'text-slate-400'}`}>
                    {p.allow_pause ? 'Allowed' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Renewal:</span>
                  <span className={`font-semibold ${p.allow_renewal ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {p.allow_renewal ? 'Allowed' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Plan Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Configure Subscription Plan">
        <form onSubmit={handleCreatePlan} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Plan Name</label>
            <input
              type="text"
              placeholder="e.g. Enterprise Monthly Growth"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Base Cost ($)</label>
              <input
                type="number"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Billing Interval</label>
              <select
                value={billingFrequency}
                onChange={(e) => setBillingFrequency(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Min Quantity</label>
              <input
                type="number"
                min="1"
                value={minQuantity}
                onChange={(e) => setMinQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                required
              />
            </div>
          </div>

          {/* Lifecycle Toggles (Page 3 requirement) */}
          <div className="border-t border-slate-200 pt-3 space-y-3">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Admin Lifecycle Controls (Plan by Plan)
            </p>
            <div className="space-y-2 text-sm text-slate-700">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={closeOnEnd}
                  onChange={(e) => setCloseOnEnd(e.target.checked)}
                  className="rounded text-[#714B67]"
                />
                Close on its own when end date is reached (auto-close)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allowEarlyClose}
                  onChange={(e) => setAllowEarlyClose(e.target.checked)}
                  className="rounded text-[#714B67]"
                />
                Allow customer to close early
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allowPause}
                  onChange={(e) => setAllowPause(e.target.checked)}
                  className="rounded text-[#714B67]"
                />
                Allow subscription to be paused and resumed
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allowRenewal}
                  onChange={(e) => setAllowRenewal(e.target.checked)}
                  className="rounded text-[#714B67]"
                />
                Allow subscription renewal
              </label>
            </div>
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
              Save Plan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

