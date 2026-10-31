import React, { useEffect, useState } from 'react';
import { UserPlus, Shield, UserCheck, AlertCircle } from 'lucide-react';
import { User } from '../types';
import { api } from '../api/client';
import { Modal } from '../components/Modal';

export const StaffManagement: React.FC = () => {
  const [staffList, setStaffList] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const data = await api.getStaff();
      setStaffList(data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.createStaff({
        email,
        full_name: fullName,
        password,
        phone,
      });
      setIsModalOpen(false);
      setEmail('');
      setFullName('');
      setPassword('');
      setNotification('Staff member added successfully!');
      loadStaff();
    } catch (err: any) {
      setError(err.message || 'Staff creation failed.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Staff Management</h1>
            <span className="text-xs bg-purple-100 text-[#714B67] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Shield className="w-3 h-3" /> Admin Only Access
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Page 2: Only the admin can add a new member of staff. Staff handle day-to-day work with limited access.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[#714B67] hover:bg-[#583A50] text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-all"
        >
          <UserPlus className="w-4 h-4" /> Add Staff Member
        </button>
      </div>

      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center justify-between">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-xs font-bold">Dismiss</button>
        </div>
      )}

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staffList.map((s) => (
          <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-[#714B67] flex items-center justify-center font-bold text-lg">
              {s.full_name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900">{s.full_name}</h3>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                  s.role === 'admin' ? 'bg-[#714B67] text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {s.role}
                </span>
              </div>
              <p className="text-xs text-slate-500">{s.email}</p>
              {s.phone && <p className="text-xs text-slate-400 mt-0.5">{s.phone}</p>}
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Staff Account">
        <form onSubmit={handleCreateStaff} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Full Name</label>
            <input
              type="text"
              placeholder="e.g. David Miller"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Email Address</label>
            <input
              type="email"
              placeholder="staff@brightloop.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Password</label>
            <input
              type="password"
              placeholder="Must be >8 chars with uppercase, lowercase, special char"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Policy: &gt;8 chars, uppercase, lowercase, and special character.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Phone (Optional)</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
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
              Create Staff Account
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

