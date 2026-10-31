import React, { useState, useEffect } from 'react';
import { Mail, KeyRound, Check, X, AlertCircle } from 'lucide-react';
import { api } from '../api/client';

interface ResetPasswordProps {
  onNavigateLogin: () => void;
}

export const ResetPassword: React.FC<ResetPasswordProps> = ({ onNavigateLogin }) => {
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [simulatedLink, setSimulatedLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if token was passed in URL params (e.g., /reset-password?token=XYZ)
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    if (urlToken) {
      setToken(urlToken);
      setStep('reset');
    }
  }, []);

  // Policy validation
  const isLengthValid = newPassword.length > 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const isPasswordValid = isLengthValid && hasUppercase && hasLowercase && hasSpecialChar;

  const handleRequestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.forgotPassword(email);
      setMessage(res.message);
      const devToken = res.dev_reset_token || res.reset_token;
      if (devToken) {
        setToken(devToken);
        setSimulatedLink(res.dev_reset_link || res.reset_link_simulated || null);
        setStep('reset');
      }
    } catch (err: any) {
      setError(err.message || 'Request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.resetPassword(token, newPassword);
      setMessage(res.message);
      setTimeout(() => {
        onNavigateLogin();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 border border-slate-200">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-[#714B67] flex items-center justify-center mx-auto mb-3">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Password Reset</h1>
          <p className="text-xs text-slate-500 mt-1">
            Page 2: A reset link arrives at your registered email address.
          </p>
        </div>

        {message && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === 'request' ? (
          <form onSubmit={handleRequestLink} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Your Registered Email
              </label>
              <input
                type="email"
                placeholder="customer@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#714B67] outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#714B67] hover:bg-[#583A50] text-white font-bold py-2.5 rounded-xl shadow-md transition-all text-sm disabled:opacity-50"
            >
              {loading ? 'Sending Link...' : 'Dispatch Reset Link'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-xs text-purple-900">
              <p className="font-semibold mb-0.5">Simulated Reset Link Generated:</p>
              <p className="font-mono text-[10px] break-all">{simulatedLink}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                New Password
              </label>
              <input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#714B67] outline-none"
                required
              />

              <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className={`flex items-center gap-1.5 ${isLengthValid ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {isLengthValid ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  <span>&gt;8 characters ({newPassword.length} chars)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {hasUppercase ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  <span>At least one uppercase letter (A-Z)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasLowercase ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {hasLowercase ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  <span>At least one lowercase letter (a-z)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasSpecialChar ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {hasSpecialChar ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  <span>At least one special character</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isPasswordValid}
              className="w-full bg-[#714B67] hover:bg-[#583A50] text-white font-bold py-2.5 rounded-xl shadow-md transition-all text-sm disabled:opacity-50"
            >
              {loading ? 'Updating Password...' : 'Save New Password & Log In'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-xs">
          <button onClick={onNavigateLogin} className="text-slate-500 hover:text-slate-800 font-semibold">
            ← Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

