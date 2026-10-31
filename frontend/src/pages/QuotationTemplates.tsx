import React, { useEffect, useState } from 'react';
import { BookmarkCheck, Plus, Clock, Package, Check } from 'lucide-react';
import { QuotationTemplate, Plan, Product } from '../types';
import { api } from '../api/client';
import { Modal } from '../components/Modal';

export const QuotationTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<QuotationTemplate[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [planId, setPlanId] = useState<number | ''>('');
  const [validityDays, setValidityDays] = useState(30);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Array<{ product_id: number; variant_id?: number; quantity: number; unit_price: number }>>([
    { product_id: 0, quantity: 1, unit_price: 0 },
  ]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [t, p, pr] = await Promise.all([
        api.getTemplates(),
        api.getPlans(),
        api.getProducts(),
      ]);
      setTemplates(t);
      setPlans(p);
      setProducts(pr);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLine = () => {
    setLines([...lines, { product_id: 0, quantity: 1, unit_price: 0 }]);
  };

  const handleUpdateLine = (index: number, field: string, value: any) => {
    const updated = [...lines];
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
    }
    setLines(updated);
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planId) return;
    try {
      await api.createTemplate({
        name,
        plan_id: Number(planId),
        validity_days: validityDays,
        notes,
        lines: lines.map((l) => ({
          product_id: l.product_id,
          variant_id: l.variant_id,
          quantity: l.quantity,
          unit_price: l.unit_price,
        })),
      });
      setIsModalOpen(false);
      setName('');
      setNotification('Quotation Template created successfully!');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Quotation Templates
          </h1>
          <p className="text-sm text-slate-500">
            Speed up offers with pre-configured plans, product lines, and validity periods (Page 3)
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[#714B67] hover:bg-[#583A50] text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center justify-between">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-xs font-bold">Dismiss</button>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((tpl) => (
          <div key={tpl.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-100 text-[#714B67]">
                  Valid for {tpl.validity_days} Days
                </span>
                <BookmarkCheck className="w-5 h-5 text-[#714B67]" />
              </div>

              <h3 className="text-lg font-bold text-slate-900 mt-3">{tpl.name}</h3>
              {tpl.notes && <p className="text-xs text-slate-500 mt-1">{tpl.notes}</p>}

              <div className="mt-4 pt-3 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Pre-configured Lines ({tpl.lines.length})
                </p>
                <div className="space-y-1.5">
                  {tpl.lines.map((line, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <div>
                        <span className="font-semibold text-slate-800">{line.product_name || `Product #${line.product_id}`}</span>
                        <span className="text-slate-400 block text-[10px]">Qty: {line.quantity}</span>
                      </div>
                      <span className="font-bold text-slate-900">${Number(line.unit_price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Quotation Template" maxWidth="max-w-2xl">
        <form onSubmit={handleCreateTemplate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Template Name</label>
            <input
              type="text"
              placeholder="e.g. Enterprise Cloud Standard Offer"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Associated Plan</label>
              <select
                value={planId}
                onChange={(e) => setPlanId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                required
              >
                <option value="">-- Select Plan --</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.billing_frequency})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Validity (Days)</label>
              <input
                type="number"
                min="1"
                value={validityDays}
                onChange={(e) => setValidityDays(parseInt(e.target.value) || 30)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Product Lines</span>
              <button
                type="button"
                onClick={handleAddLine}
                className="text-xs font-semibold text-[#714B67] hover:underline"
              >
                + Add Line
              </button>
            </div>

            <div className="space-y-2">
              {lines.map((line, idx) => {
                const prod = products.find((p) => p.id === line.product_id);
                return (
                  <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <select
                        value={line.product_id}
                        onChange={(e) => handleUpdateLine(idx, 'product_id', e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                        required
                      >
                        <option value="0">-- Product --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-4">
                      {prod && prod.variants?.length > 0 ? (
                        <select
                          value={line.variant_id || ''}
                          onChange={(e) => handleUpdateLine(idx, 'variant_id', e.target.value)}
                          className="w-full px-2 py-1.5 border border-purple-300 bg-purple-50 text-[#714B67] text-xs rounded-lg"
                        >
                          <option value="">Standard Edition</option>
                          {prod.variants.map((v) => (
                            <option key={v.id} value={v.id}>{v.name} (+${Number(v.price_extra).toFixed(2)})</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No variants</span>
                      )}
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(e) => handleUpdateLine(idx, 'quantity', e.target.value)}
                        placeholder="Qty"
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs text-center"
                      />
                    </div>
                  </div>
                );
              })}
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
              Save Template
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

