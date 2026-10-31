import React, { useState } from 'react';
import { Shield, Users, UserCheck, AlertCircle } from 'lucide-react';
import { api } from '../api/client';
import { User } from '../types';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
  onNavigateRegister: () => void;
  onNavigateForgotPassword: () => void;
}

export const Login: React.FC<LoginProps> = ({
  onLoginSuccess,
  onNavigateRegister,
  onNavigateForgotPassword,
}) => {
  const [email, setEmail] = useState('admin@brightloop.com');
  const [password, setPassword] = useState('AdminPass123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(email, password);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(demoEmail, demoPass);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 border border-slate-200">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#714B67] to-[#583A50] text-white flex items-center justify-center text-2xl font-black mx-auto mb-3 shadow-lg shadow-[#714B67]/30">
            B
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Brightloop Software</h1>
          <p className="text-xs text-slate-500 mt-1">Enterprise Subscription Management System</p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#714B67] outline-none"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-slate-700 uppercase">Password</label>
              <button
                type="button"
                onClick={onNavigateForgotPassword}
                className="text-xs text-[#714B67] font-semibold hover:underline"
              >
                Forgot?
              </button>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#714B67] outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#714B67] hover:bg-[#583A50] text-white font-bold py-2.5 rounded-xl shadow-md transition-all text-sm disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Quick Demo Personas */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-3">
            Quick Persona Login (One-Click)
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleQuickDemo('admin@brightloop.com', 'AdminPass123!')}
              className="p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#714B67] text-xs font-bold text-center border border-purple-200 flex flex-col items-center gap-1 transition-all"
            >
              <Shield className="w-4 h-4" /> Admin
            </button>
            <button
              onClick={() => handleQuickDemo('staff@brightloop.com', 'StaffPass123!')}
              className="p-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold text-center border border-indigo-200 flex flex-col items-center gap-1 transition-all"
            >
              <Users className="w-4 h-4" /> Staff
            </button>
            <button
              onClick={() => handleQuickDemo('john@enterprise-corp.com', 'CustomerPass123!')}
              className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold text-center border border-emerald-200 flex flex-col items-center gap-1 transition-all"
            >
              <UserCheck className="w-4 h-4" /> Customer
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-500">
          Small business signing up?{' '}
          <button
            onClick={onNavigateRegister}
            className="font-bold text-[#714B67] hover:underline"
          >
            Create an Account
          </button>
        </div>
      </div>
    </div>
  );
};

