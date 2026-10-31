import React from 'react';
import {
  LayoutDashboard,
  Repeat,
  FileText,
  BookmarkCheck,
  Package,
  Layers,
  Percent,
  Receipt,
  TrendingUp,
  UserPlus,
  Compass,
} from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  userRole?: UserRole;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  userRole = 'customer',
}) => {
  const isAdmin = userRole === 'admin';
  const isStaff = userRole === 'staff';
  const isCustomer = userRole === 'customer';

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'staff', 'customer'],
    },
    {
      id: 'subscriptions',
      label: 'Subscriptions',
      icon: Repeat,
      roles: ['admin', 'staff'],
    },
    {
      id: 'invoices',
      label: 'Invoices & Billing',
      icon: FileText,
      roles: ['admin', 'staff'],
    },
    {
      id: 'templates',
      label: 'Quotation Templates',
      icon: BookmarkCheck,
      roles: ['admin', 'staff'],
    },
    {
      id: 'products',
      label: 'Products & Variants',
      icon: Package,
      roles: ['admin', 'staff'],
    },
    {
      id: 'plans',
      label: 'Subscription Plans',
      icon: Layers,
      roles: ['admin', 'staff'],
    },
    {
      id: 'discounts',
      label: 'Discount Rules',
      icon: Percent,
      roles: ['admin', 'staff'],
    },
    {
      id: 'taxes',
      label: 'Tax Rules',
      icon: Receipt,
      roles: ['admin', 'staff'],
    },
    {
      id: 'analytics',
      label: 'Finance Analytics',
      icon: TrendingUp,
      roles: ['admin', 'staff'],
    },
    {
      id: 'staff',
      label: 'Staff Management',
      icon: UserPlus,
      roles: ['admin'],
    },
    {
      id: 'customer_portal',
      label: 'Customer Self-Portal',
      icon: Compass,
      roles: ['customer', 'admin', 'staff'],
    },
  ];

  const visibleItems = navItems.filter((item) => item.roles.includes(userRole));

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 min-h-[calc(100vh-4rem)] border-r border-slate-800">
      <div className="p-4 flex-1 space-y-1">
        <p className="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
          {isAdmin ? 'System Administration' : isStaff ? 'Sales & Operations' : 'Customer Portal'}
        </p>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#714B67] text-white font-semibold shadow-md shadow-[#714B67]/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 text-xs">
          <p className="text-slate-400 font-semibold mb-1">Brightloop Core</p>
          <p className="text-slate-500 text-[11px] leading-relaxed">
            High scalability architecture • Idempotent recurring engine • Sub-2s analytics.
          </p>
        </div>
      </div>
    </aside>
  );
};

