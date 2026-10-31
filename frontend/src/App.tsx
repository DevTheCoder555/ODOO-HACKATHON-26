import React, { useState, useEffect } from 'react';
import { api } from './api/client';
import { User } from './types';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Subscriptions } from './pages/Subscriptions';
import { Invoices } from './pages/Invoices';
import { Products } from './pages/Products';
import { Plans } from './pages/Plans';
import { QuotationTemplates } from './pages/QuotationTemplates';
import { Discounts } from './pages/Discounts';
import { Taxes } from './pages/Taxes';
import { FinanceAnalytics } from './pages/FinanceAnalytics';
import { StaffManagement } from './pages/StaffManagement';
import { CustomerPortal } from './pages/CustomerPortal';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ResetPassword } from './pages/ResetPassword';
import { BillingRunModal } from './components/BillingRunModal';
import { RealtimeProvider } from './context/RealtimeContext';
import { RealtimeNotificationToast } from './components/RealtimeNotificationToast';
import { RealtimeActivityDrawer } from './components/RealtimeActivityDrawer';
import { OfflineBanner } from './components/OfflineBanner';

export const App: React.FC = () => {
  return (
    <RealtimeProvider>
      <AppShell />
    </RealtimeProvider>
  );
};

const AppShell: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot_password'>('login');
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isBillingModalOpen, setIsBillingModalOpen] = useState<boolean>(false);
  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = api.getUser();
    if (storedUser) {
      setCurrentUser(storedUser);
      if (storedUser.role === 'customer') {
        setCurrentTab('customer_portal');
      }
    } else {
      // Auto-authenticate as Admin for instant test driving!
      api.login('admin@brightloop.com', 'AdminPass123!')
        .then((res) => {
          setCurrentUser(res.user);
        })
        .catch(() => {
          // Fallback to login screen if error
        });
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    api.clearToken();
    setCurrentUser(null);
    setAuthView('login');
  };

  const handleSwitchPersona = async (email: string) => {
    let pass = 'AdminPass123!';
    if (email.startsWith('staff')) pass = 'StaffPass123!';
    if (email.startsWith('john') || email.startsWith('sarah')) pass = 'CustomerPass123!';

    try {
      const res = await api.login(email, pass);
      setCurrentUser(res.user);
      if (res.user.role === 'customer') {
        setCurrentTab('customer_portal');
      } else {
        setCurrentTab('dashboard');
      }
    } catch (e: any) {
      alert(`Persona login failed: ${e.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#714B67] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Unauthenticated screen
  if (!currentUser) {
    if (authView === 'register') {
      return (
        <Register
          onRegisterSuccess={(u) => {
            setCurrentUser(u);
            setCurrentTab('customer_portal');
          }}
          onNavigateLogin={() => setAuthView('login')}
        />
      );
    }
    if (authView === 'forgot_password') {
      return <ResetPassword onNavigateLogin={() => setAuthView('login')} />;
    }
    return (
      <Login
        onLoginSuccess={(u) => {
          setCurrentUser(u);
          if (u.role === 'customer') setCurrentTab('customer_portal');
          else setCurrentTab('dashboard');
        }}
        onNavigateRegister={() => setAuthView('register')}
        onNavigateForgotPassword={() => setAuthView('forgot_password')}
      />
    );
  }

  // Authenticated Application Shell
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        onSwitchPersona={handleSwitchPersona}
        onOpenActivityDrawer={() => setIsActivityDrawerOpen(true)}
      />

      {/* Offline Resilient Cache Alert */}
      <OfflineBanner />

      <div className="flex flex-1">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          userRole={currentUser.role}
        />

        <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
          {currentTab === 'dashboard' && (
            <Dashboard
              currentUser={currentUser}
              onNavigate={setCurrentTab}
              onOpenBillingModal={() => setIsBillingModalOpen(true)}
            />
          )}

          {currentTab === 'subscriptions' && <Subscriptions />}

          {currentTab === 'invoices' && <Invoices />}

          {currentTab === 'products' && <Products />}

          {currentTab === 'plans' && <Plans />}

          {currentTab === 'templates' && <QuotationTemplates />}

          {currentTab === 'discounts' && <Discounts />}

          {currentTab === 'taxes' && <Taxes />}

          {currentTab === 'analytics' && <FinanceAnalytics />}

          {currentTab === 'staff' && <StaffManagement />}

          {currentTab === 'customer_portal' && (
            <CustomerPortal currentUser={currentUser} />
          )}
        </main>
      </div>

      <BillingRunModal
        isOpen={isBillingModalOpen}
        onClose={() => setIsBillingModalOpen(false)}
        onSuccess={() => {}}
      />

      {/* Real-time Notification Toast */}
      <RealtimeNotificationToast />

      {/* Real-time Activity Drawer */}
      <RealtimeActivityDrawer
        isOpen={isActivityDrawerOpen}
        onClose={() => setIsActivityDrawerOpen(false)}
      />
    </div>
  );
};

