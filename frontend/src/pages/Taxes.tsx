import React, { useEffect, useState } from 'react';
import { Receipt, Plus, Shield } from 'lucide-react';
import { TaxRule } from '../types';
import { api } from '../api/client';
import { Modal } from '../components/Modal';

export const Taxes: React.FC = () => {
  const [taxes, setTaxes] = useState<TaxRule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [name, setName] = useState('');
  const [rate, setRate] = useState('0.10');
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    loadTaxes();
  }, []);

  const loadTaxes = async () => {
    setLoading(true);
    try {
      const data = await api.getTaxes();
      setTaxes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTax = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createTax({
        name,
        rate: parseFloat(rate),
        tax_type: 'percentage',
      });
      setIsModalOpen(false);
      setName('');
      setNotification('Tax rule created successfully!');
      loadTaxes();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Tax Rules & Calculation</h1>
            <span className="text-xs bg-purple-100 text-[#714B67] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Shield className="w-3 h-3" /> Admin Only
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Taxes are calculated automatically on billing day from rules the admin has set (Page 3)
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[#714B67] hover:bg-[#583A50] text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Tax Rule
        </button>
      </div>

      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center justify-between">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-xs font-bold">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {taxes.map((t) => (
          <div key={t.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900">{t.name}</h3>
              <p className="text-xs text-slate-400 capitalize mt-0.5">Type: {t.tax_type}</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-[#714B67]">
                {(Number(t.rate) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Tax Rule">
        <form onSubmit={handleCreateTax} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Rule Name</label>
            <input
              type="text"
              placeholder="e.g. Standard VAT (20%)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Rate (as decimal e.g. 0.20 for 20%)</label>
            <input
              type="number"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              required
            />
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
              Save Tax Rule
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

