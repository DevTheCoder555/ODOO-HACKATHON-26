import {
  AuthResponse, User, Product, Plan, QuotationTemplate,
  TaxRule, DiscountRule, Subscription, Invoice, Payment, FinanceSummary
} from '../types';
import { offlineCache } from './cache';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('brightloop_token');
  }

  setToken(token: string) {
    localStorage.setItem('brightloop_token', token);
  }

  clearToken() {
    localStorage.removeItem('brightloop_token');
    localStorage.removeItem('brightloop_user');
  }

  getUser(): User | null {
    const raw = localStorage.getItem('brightloop_user');
    return raw ? JSON.parse(raw) : null;
  }

  setUser(user: User) {
    localStorage.setItem('brightloop_user', JSON.stringify(user));
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const isGet = !options.method || options.method.toUpperCase() === 'GET';
    const cacheKey = offlineCache.generateKey(endpoint);

    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      if (!res.ok) {
        let errorDetail = 'Request failed';
        try {
          const errJson = await res.json();
          errorDetail = errJson.detail || errJson.message || errorDetail;
        } catch (e) {
          errorDetail = res.statusText;
        }
        throw new Error(errorDetail);
      }

      const data = await res.json();
      // Cache successful GET responses for offline resilience
      if (isGet) {
        offlineCache.set(cacheKey, data);
      }
      return data;
    } catch (err: any) {
      // If network is offline or request failed, check cached layer
      if (isGet) {
        const cached = offlineCache.get<T>(cacheKey);
        if (cached) {
          console.warn(`[Offline Cache] Serving ${endpoint} from local offline cache.`);
          window.dispatchEvent(new CustomEvent('brightloop_offline_event', {
            detail: { isOffline: true, endpoint }
          }));
          return cached;
        }
      }
      throw err;
    }
  }

  // ----------------- Auth -----------------
  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.access_token);
    this.setUser(data.user);
    return data;
  }

  async register(payload: any): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setToken(data.access_token);
    this.setUser(data.user);
    return data;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async forgotPassword(email: string): Promise<{
    message: string;
    reset_token?: string;
    dev_reset_token?: string;
    dev_reset_link?: string;
    reset_link_simulated?: string;
  }> {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, new_password: string): Promise<{ message: string }> {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password }),
    });
  }

  // ----------------- Users -----------------
  async getCustomers(): Promise<User[]> {
    return this.request<User[]>('/users/customers');
  }

  async getStaff(): Promise<User[]> {
    return this.request<User[]>('/users/staff');
  }

  async createStaff(payload: any): Promise<User> {
    return this.request<User>('/users/staff', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ----------------- Products -----------------
  async getProducts(): Promise<Product[]> {
    return this.request<Product[]>('/products');
  }

  async createProduct(payload: any): Promise<Product> {
    return this.request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async addVariant(productId: number, payload: any): Promise<any> {
    return this.request(`/products/${productId}/variants`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ----------------- Plans -----------------
  async getPlans(): Promise<Plan[]> {
    return this.request<Plan[]>('/plans');
  }

  async createPlan(payload: any): Promise<Plan> {
    return this.request<Plan>('/plans', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ----------------- Quotation Templates -----------------
  async getTemplates(): Promise<QuotationTemplate[]> {
    return this.request<QuotationTemplate[]>('/templates');
  }

  async createTemplate(payload: any): Promise<QuotationTemplate> {
    return this.request<QuotationTemplate>('/templates', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ----------------- Taxes & Discounts -----------------
  async getTaxes(): Promise<TaxRule[]> {
    return this.request<TaxRule[]>('/taxes');
  }

  async createTax(payload: any): Promise<TaxRule> {
    return this.request<TaxRule>('/taxes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getDiscounts(): Promise<DiscountRule[]> {
    return this.request<DiscountRule[]>('/discounts');
  }

  async createDiscount(payload: any): Promise<DiscountRule> {
    return this.request<DiscountRule>('/discounts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ----------------- Subscriptions -----------------
  async getSubscriptions(params?: { status?: string; plan_id?: number; customer_id?: number; search?: string }): Promise<Subscription[]> {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    if (params?.plan_id) q.append('plan_id', String(params.plan_id));
    if (params?.customer_id) q.append('customer_id', String(params.customer_id));
    if (params?.search) q.append('search', params.search);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request<Subscription[]>(`/subscriptions${qs}`);
  }

  async getSubscription(id: number): Promise<Subscription> {
    return this.request<Subscription>(`/subscriptions/${id}`);
  }

  async createSubscription(payload: any): Promise<Subscription> {
    return this.request<Subscription>('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async createSubscriptionFromTemplate(templateId: number, customerId: number, notes?: string): Promise<Subscription> {
    const q = new URLSearchParams({
      template_id: String(templateId),
      customer_id: String(customerId),
    });
    if (notes) q.append('notes', notes);
    return this.request<Subscription>(`/subscriptions/from-template?${q.toString()}`, {
      method: 'POST',
    });
  }

  async updateSubscriptionStatus(id: number, status: string): Promise<Subscription> {
    return this.request<Subscription>(`/subscriptions/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async generateInvoiceForSubscription(id: number, autoConfirm: boolean = false): Promise<Invoice> {
    return this.request<Invoice>(`/subscriptions/${id}/generate-invoice?auto_confirm=${autoConfirm}`, {
      method: 'POST',
    });
  }

  // ----------------- Invoices -----------------
  async getInvoices(params?: { status?: string; customer_id?: number; overdue_only?: boolean }): Promise<Invoice[]> {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    if (params?.customer_id) q.append('customer_id', String(params.customer_id));
    if (params?.overdue_only) q.append('overdue_only', 'true');
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request<Invoice[]>(`/invoices${qs}`);
  }

  async getInvoice(id: number): Promise<Invoice> {
    return this.request<Invoice>(`/invoices/${id}`);
  }

  async updateInvoiceStatus(id: number, status: string): Promise<Invoice> {
    return this.request<Invoice>(`/invoices/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async sendInvoice(id: number): Promise<any> {
    return this.request(`/invoices/${id}/send`, {
      method: 'POST',
    });
  }

  async runBatchBilling(target_date?: string, auto_confirm: boolean = false): Promise<any> {
    return this.request('/invoices/batch/run-billing', {
      method: 'POST',
      body: JSON.stringify({ target_date, auto_confirm }),
    });
  }

  // ----------------- Payments -----------------
  async getPayments(invoiceId?: number): Promise<Payment[]> {
    const q = invoiceId ? `?invoice_id=${invoiceId}` : '';
    return this.request<Payment[]>(`/payments${q}`);
  }

  async recordPayment(payload: { invoice_id: number; amount: string | number; payment_method: string; reference_note?: string }): Promise<Payment> {
    return this.request<Payment>('/payments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ----------------- Analytics -----------------
  async getFinanceSummary(params?: { start_date?: string; end_date?: string; plan_id?: number; customer_id?: number }): Promise<FinanceSummary> {
    const q = new URLSearchParams();
    if (params?.start_date) q.append('start_date', params.start_date);
    if (params?.end_date) q.append('end_date', params.end_date);
    if (params?.plan_id) q.append('plan_id', String(params.plan_id));
    if (params?.customer_id) q.append('customer_id', String(params.customer_id));
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request<FinanceSummary>(`/analytics/summary${qs}`);
  }

  async getRevenueTrends(months: number = 6): Promise<any[]> {
    return this.request<any[]>(`/analytics/revenue-trends?months=${months}`);
  }

  async getPlanDistribution(): Promise<any[]> {
    return this.request<any[]>('/analytics/plan-distribution');
  }

  // ----------------- Dynamic Forex & Webhooks -----------------
  async getLiveForexRates(): Promise<{
    base: string;
    rates: Record<string, number>;
    symbols: Record<string, string>;
    source: string;
    last_updated: string;
  }> {
    return this.request('/forex/rates');
  }

  async convertCurrency(amount: number | string, fromCurrency: string = 'USD', toCurrency: string = 'EUR'): Promise<any> {
    return this.request('/forex/convert', {
      method: 'POST',
      body: JSON.stringify({ amount, from_currency: fromCurrency, to_currency: toCurrency }),
    });
  }

  async simulateBankDeposit(): Promise<any> {
    return this.request('/webhooks/simulate-bank-event', {
      method: 'POST',
    });
  }
}

export const api = new ApiClient();

