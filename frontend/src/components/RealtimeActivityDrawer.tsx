import React, { useState } from 'react';
import { useRealtime, RealtimeEvent } from '../context/RealtimeContext';
import { X, Activity, Zap, CheckCircle2, FileText, ArrowRight, RefreshCw, DollarSign, Globe2 } from 'lucide-react';

interface RealtimeActivityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RealtimeActivityDrawer: React.FC<RealtimeActivityDrawerProps> = ({ isOpen, onClose }) => {
  const {
    isConnected,
    events,
    currency,
    setCurrency,
    rates,
    symbols,
    ratesSource,
    lastUpdated,
    formatCurrency,
    triggerBankSimulation
  } = useRealtime();

  const [simulating, setSimulating] = useState(false);
  const [simulationStatus, setSimulationStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSimulate = async () => {
    setSimulating(true);
    setSimulationStatus(null);
    try {
      const res = await triggerBankSimulation();
      setSimulationStatus(res.message);
    } catch (err: any) {
      setSimulationStatus(`Simulation failed: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  const renderEventIcon = (type: string) => {
    if (type.includes('PAYMENT')) return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (type.includes('INVOICE')) return <FileText className="w-4 h-4 text-blue-500" />;
    if (type.includes('SUBSCRIPTION')) return <ArrowRight className="w-4 h-4 text-amber-500" />;
    return <Zap className="w-4 h-4 text-purple-500" />;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">Live Event Stream</h2>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`}></span>
                  {isConnected ? 'WS CONNECTED' : 'DISCONNECTED'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Sub-second reactive broadcast pipeline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Forex & Data Source Controls */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 uppercase flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5 text-[#714B67]" />
              Active Dynamic Currency
            </span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="text-xs font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-[#714B67] outline-none cursor-pointer"
            >
              {Object.keys(rates).map((c) => (
                <option key={c} value={c}>
                  {c} ({symbols[c] || c})
                </option>
              ))}
            </select>
          </div>

          <div className="text-[11px] bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-slate-600 font-mono">
            <span>Rate Feed: {ratesSource}</span>
            <span className="font-semibold text-slate-800">
              1 USD = {(rates[currency] || 1.0).toFixed(2)} {currency}
            </span>
          </div>

          {/* Bank Feed Simulator Button */}
          <div>
            <button
              onClick={handleSimulate}
              disabled={simulating}
              className="w-full flex items-center justify-center gap-2 bg-[#714B67] hover:bg-[#583A50] text-white py-2 px-3 rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 ${simulating ? 'animate-spin' : ''}`} />
              {simulating ? 'Simulating Settlement...' : '⚡ Ingest Live Bank Payment ACH'}
            </button>
            {simulationStatus && (
              <p className="mt-1.5 text-[11px] text-center font-medium text-emerald-700 bg-emerald-50 py-1 px-2 rounded-lg border border-emerald-200">
                {simulationStatus}
              </p>
            )}
          </div>
        </div>

        {/* Streaming Event Feed List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            <span>Recent Activity ({events.length})</span>
            {events.length > 0 && <span className="text-[10px] text-emerald-600 font-bold">LIVE STREAM</span>}
          </div>

          {events.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs font-medium">No live events captured yet</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Trigger a batch billing run or record a payment to see live broadcast events in real-time.
              </p>
            </div>
          ) : (
            events.map((evt, idx) => (
              <div
                key={idx}
                className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-[#714B67]/40 transition-all text-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    {renderEventIcon(evt.type)}
                    <span>{evt.type.replace(/_/g, ' ')}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] mt-0.5">{evt.payload?.message || 'Event processed'}</p>
                {evt.payload?.amount !== undefined && (
                  <div className="mt-1 flex items-center gap-2 font-mono text-[11px] text-emerald-700 font-bold">
                    <span>{formatCurrency(evt.payload.amount)}</span>
                    {evt.payload.invoice_number && <span className="text-slate-400 font-normal">• {evt.payload.invoice_number}</span>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

