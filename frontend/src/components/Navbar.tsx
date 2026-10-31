import React from 'react';
import { User as UserIcon, LogOut, Shield, Users, UserCheck, Activity, Globe2 } from 'lucide-react';
import { User } from '../types';
import { useRealtime } from '../context/RealtimeContext';

interface NavbarProps {
  currentUser: User | null;
  onLogout: () => void;
  onSwitchPersona: (email: string) => void;
  onOpenActivityDrawer: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  onSwitchPersona,
  onOpenActivityDrawer,
}) => {
  const { isConnected, events, currency, setCurrency, rates, symbols } = useRealtime();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#714B67] to-[#583A50] flex items-center justify-center text-white font-black text-xl shadow-md shadow-[#714B67]/20">
            B
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 tracking-tight text-lg">Brightloop</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-100 text-[#714B67]">
                Software
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
              Subscription Management System
            </p>
          </div>
        </div>

        {/* Persona Quick Switcher (For Pair Programming / Demo evaluation) */}
        <div className="hidden lg:flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase px-2">Role Demo:</span>
          <button
            onClick={() => onSwitchPersona('admin@brightloop.com')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all flex items-center gap-1 ${
              currentUser?.role === 'admin'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Shield className="w-3 h-3 text-[#714B67]" /> Admin
          </button>
          <button
            onClick={() => onSwitchPersona('staff@brightloop.com')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all flex items-center gap-1 ${
              currentUser?.role === 'staff'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Users className="w-3 h-3 text-indigo-600" /> Staff
          </button>
          <button
            onClick={() => onSwitchPersona('john@enterprise-corp.com')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all flex items-center gap-1 ${
              currentUser?.role === 'customer'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <UserCheck className="w-3 h-3 text-emerald-600" /> Customer
          </button>
        </div>

        {/* Dynamic Data & Real-Time Controls */}
        <div className="flex items-center gap-3">
          {/* Dynamic Currency Selector */}
          <div className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200/70 border border-slate-200 rounded-xl px-2 py-1 transition-colors">
            <Globe2 className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer pr-1"
              title="Dynamic Display Currency"
            >
              {Object.keys(rates).map((c) => (
                <option key={c} value={c}>
                  {c} ({symbols[c] || c})
                </option>
              ))}
            </select>
          </div>

          {/* Real-Time WebSocket Pulse Button */}
          <button
            onClick={onOpenActivityDrawer}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all border ${
              isConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            }`}
            title="Real-Time Event Stream (Click to view live stream drawer)"
          >
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`}></span>
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isConnected ? 'Live Stream' : 'Offline'}</span>
            {events.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-slate-900 text-white text-[10px]">
                {events.length}
              </span>
            )}
          </button>

          {/* User Status & Logout */}
          {currentUser && (
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
              <div className="text-right hidden xl:block">
                <p className="text-sm font-semibold text-slate-800 leading-tight">
                  {currentUser.full_name}
                </p>
                <p className="text-xs text-slate-500 font-mono capitalize">
                  {currentUser.role}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs border border-slate-300">
                {currentUser.full_name.charAt(0)}
              </div>
              <button
                onClick={onLogout}
                title="Log out"
                className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

