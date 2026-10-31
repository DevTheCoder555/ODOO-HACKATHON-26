import React, { useState } from 'react';
import { Calendar, Play, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Modal } from './Modal';
import { api } from '../api/client';

interface BillingRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BillingRunModal: React.FC<BillingRunModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [targetDate, setTargetDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [autoConfirm, setAutoConfirm] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.runBatchBilling(targetDate, autoConfirm);
      setResult(res);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Billing batch run failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Execute Automated Billing Run">
      <div className="space-y-6">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm text-purple-900">
          <p className="font-semibold mb-1">Billing Day Automation Engine</p>
          <p className="text-purple-700 text-xs leading-relaxed">
            Evaluates all active subscriptions due on or before the selected date. Automatically calculates taxes, validates and applies active discount rules, and advances subscriptions to their next billing interval. Guaranteed zero skipping and duplicate billing prevention.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 text-emerald-800 font-bold">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <span>Billing Run Completed Successfully</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-sm">
                <p className="text-xs text-slate-500 font-medium">Subscriptions Due</p>
                <p className="text-xl font-bold text-slate-800">{result.subscriptions_processed}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-sm">
                <p className="text-xs text-slate-500 font-medium">Invoices Created</p>
                <p className="text-xl font-bold text-emerald-600">{result.invoices_generated}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-sm">
                <p className="text-xs text-slate-500 font-medium">Total Billed</p>
                <p className="text-xl font-bold text-slate-800">${Number(result.total_billed).toFixed(2)}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-sm">
                <p className="text-xs text-slate-500 font-medium">Skipped (Billed)</p>
                <p className="text-xl font-bold text-slate-400">{result.skipped_count}</p>
              </div>
            </div>
            <p className="text-xs text-emerald-700">{result.notes}</p>
            <div className="pt-2 flex justify-end">
              <button
                onClick={onClose}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                Close & View Invoices
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Target Billing Run Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#714B67] focus:border-transparent outline-none"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Processes any active subscriptions whose next billing date is on or prior to this date.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="autoConfirm"
                  checked={autoConfirm}
                  onChange={(e) => setAutoConfirm(e.target.checked)}
                  className="w-4 h-4 text-[#714B67] rounded border-slate-300 focus:ring-[#714B67]"
                />
                <label htmlFor="autoConfirm" className="text-sm text-slate-700 select-none">
                  Automatically set generated invoices to <strong className="font-semibold text-slate-900">Confirmed</strong> status
                </label>
              </div>
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
                onClick={handleRun}
                disabled={loading}
                className="flex items-center gap-2 bg-[#714B67] hover:bg-[#583A50] text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Executing Batch...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Run Billing Batch
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

