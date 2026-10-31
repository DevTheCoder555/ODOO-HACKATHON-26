import React, { useState } from 'react';
import { DollarSign, Check, AlertCircle } from 'lucide-react';
import { Modal } from './Modal';
import { Invoice } from '../types';
import { api } from '../api/client';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onSuccess: () => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}) => {
  if (!invoice) return null;

  const [paymentMethod, setPaymentMethod] = useState<string>('Credit Card');
  const [amount, setAmount] = useState<string>(String(invoice.amount_due || invoice.grand_total));
  const [referenceNote, setReferenceNote] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please provide a valid positive payment amount.');
      setLoading(false);
      return;
    }

    try {
      await api.recordPayment({
        invoice_id: invoice.id,
        payment_method: paymentMethod,
        amount: numAmount,
        reference_note: referenceNote.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Payment recording failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Record Payment: ${invoice.invoice_number}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center text-sm">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Invoice Amount</p>
            <p className="font-bold text-slate-900 text-lg">${Number(invoice.grand_total).toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Current Balance Due</p>
            <p className="font-bold text-rose-600 text-lg">${Number(invoice.amount_due).toFixed(2)}</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Payment Method
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#714B67] focus:border-transparent outline-none bg-white"
          >
            <option value="Credit Card">Credit Card</option>
            <option value="Bank Transfer">Bank Transfer (ACH / Wire)</option>
            <option value="Stripe">Stripe Online</option>
            <option value="Check">Company Check</option>
            <option value="Cash">Cash / Direct</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Amount ($)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-slate-400 font-semibold">$</span>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#714B67] focus:border-transparent outline-none font-medium"
              required
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Supports full payment or partial payments. Invoice status changes to Paid when balance reaches 0.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Reference / Note (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Check #40291, Wire TX-9921, Stripe ch_3L..."
            value={referenceNote}
            onChange={(e) => setReferenceNote(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#714B67] focus:border-transparent outline-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-[#714B67] hover:bg-[#583A50] text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {loading ? 'Recording...' : 'Confirm & Record Payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

