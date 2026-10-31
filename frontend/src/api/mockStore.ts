import {
  User, Product, Plan, QuotationTemplate, TaxRule, DiscountRule,
  Subscription, Invoice, Payment, FinanceSummary
} from '../types';

const STORAGE_KEY = 'brightloop_standalone_store_v1';

export interface StandaloneState {
  users: User[];
  products: Product[];
  plans: Plan[];
  templates: QuotationTemplate[];
  taxes: TaxRule[];
  discounts: DiscountRule[];
  subscriptions: Subscription[];
  invoices: Invoice[];
  payments: Payment[];
}

const DEFAULT_STATE: StandaloneState = {
  users: [
    {
      id: 1,
      email: 'admin@brightloop.com',
      full_name: 'Sarah Jenkins (Admin)',
      company_name: 'Brightloop Software HQ',
      phone: '+1 555-0100',
      address: '100 Innovation Way, Suite 400, San Francisco, CA',
      role: 'admin',
      is_active: true,
      created_at: '2026-01-15T08:00:00Z',
    },
    {
      id: 2,
      email: 'staff@brightloop.com',
      full_name: 'David Miller (Sales & Ops)',
      company_name: 'Brightloop Software',
      phone: '+1 555-0101',
      role: 'staff',
      is_active: true,
      created_at: '2026-01-20T09:30:00Z',
    },
    {
      id: 3,
      email: 'john@enterprise-corp.com',
      full_name: 'John Vance',
      company_name: 'Enterprise Corp Inc.',
      phone: '+1 555-0199',
      address: '742 Evergreen Terrace, Chicago, IL',
      role: 'customer',
      is_active: true,
      created_at: '2026-02-01T10:00:00Z',
    },
    {
      id: 4,
      email: 'sarah@localbakery.com',
      full_name: 'Sarah Conners',
      company_name: 'Artisan Bread & Bakes',
      phone: '+1 555-0188',
      address: '12 Main Street, Austin, TX',
      role: 'customer',
      is_active: true,
      created_at: '2026-02-10T11:15:00Z',
    },
    {
      id: 5,
      email: 'alex@techstartup.io',
      full_name: 'Alex Chen',
      company_name: 'NextGen Analytics Labs',
      phone: '+1 555-0177',
      address: '45 King Street, Seattle, WA',
      role: 'customer',
      is_active: true,
      created_at: '2026-02-15T14:20:00Z',
    },
  ],
  products: [
    {
      id: 1,
      name: 'Brightloop Core ERP',
      product_type: 'software',
      sales_price: 1200.0,
      cost_price: 350.0,
      notes: 'Complete business operations, inventory, and financials engine.',
      is_active: true,
      variants: [
        { id: 1, product_id: 1, name: '1-10 Users Starter', attribute_name: 'Scale', attribute_value: '1-10 Users', price_extra: 0 },
        { id: 2, product_id: 1, name: '11-50 Users Growth', attribute_name: 'Scale', attribute_value: '11-50 Users', price_extra: 600 },
        { id: 3, product_id: 1, name: 'Unlimited Enterprise', attribute_name: 'Scale', attribute_value: 'Unlimited', price_extra: 1800 },
      ],
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 2,
      name: 'Brightloop CRM',
      product_type: 'software',
      sales_price: 450.0,
      cost_price: 120.0,
      notes: 'Omnichannel customer pipeline with AI sentiment scoring.',
      is_active: true,
      variants: [
        { id: 4, product_id: 2, name: 'Standard Pipeline', attribute_name: 'Tier', attribute_value: 'Standard', price_extra: 0 },
        { id: 5, product_id: 2, name: 'AI Predictive Sales', attribute_name: 'Tier', attribute_value: 'AI Predictive', price_extra: 250 },
      ],
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 3,
      name: 'Dedicated Cloud Hosting',
      product_type: 'service',
      sales_price: 600.0,
      cost_price: 200.0,
      notes: 'Isolated SOC2-compliant single-tenant Kubernetes cluster.',
      is_active: true,
      variants: [
        { id: 6, product_id: 3, name: '4 vCPU / 16GB RAM', attribute_name: 'Hardware', attribute_value: '4 vCPU', price_extra: 0 },
        { id: 7, product_id: 3, name: '8 vCPU / 32GB RAM', attribute_name: 'Hardware', attribute_value: '8 vCPU', price_extra: 400 },
      ],
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 4,
      name: 'Priority SLA Support 24/7',
      product_type: 'service',
      sales_price: 300.0,
      cost_price: 80.0,
      notes: '15-minute response guarantee with dedicated technical account manager.',
      is_active: true,
      variants: [],
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
  plans: [
    {
      id: 1,
      name: 'Monthly Enterprise Plan',
      cost: 1500.0,
      billing_frequency: 'monthly',
      min_quantity: 1,
      close_on_end: false,
      allow_early_close: true,
      allow_pause: true,
      allow_renewal: true,
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 2,
      name: 'Quarterly Business Growth Plan',
      cost: 4200.0,
      billing_frequency: 'monthly',
      min_quantity: 1,
      close_on_end: false,
      allow_early_close: true,
      allow_pause: true,
      allow_renewal: true,
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 3,
      name: 'Annual Platinum Suite',
      cost: 15000.0,
      billing_frequency: 'yearly',
      min_quantity: 1,
      close_on_end: false,
      allow_early_close: false,
      allow_pause: true,
      allow_renewal: true,
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 4,
      name: 'Pay-As-You-Go Basic',
      cost: 199.0,
      billing_frequency: 'monthly',
      min_quantity: 1,
      close_on_end: true,
      allow_early_close: true,
      allow_pause: false,
      allow_renewal: false,
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
  templates: [
    {
      id: 1,
      name: 'High-Growth SaaS Starter Template',
      plan_id: 1,
      validity_days: 30,
      notes: 'Standard bundle for emerging SaaS startups.',
      lines: [
        { id: 1, product_id: 1, variant_id: 1, quantity: 1, unit_price: 1200.0, product_name: 'Brightloop Core ERP' },
        { id: 2, product_id: 2, variant_id: 4, quantity: 1, unit_price: 450.0, product_name: 'Brightloop CRM' },
      ],
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 2,
      name: 'Enterprise Scaled Deployment Template',
      plan_id: 3,
      validity_days: 45,
      notes: 'Full ERP + AI CRM + 8 vCPU dedicated node + 24/7 SLA.',
      lines: [
        { id: 3, product_id: 1, variant_id: 3, quantity: 1, unit_price: 3000.0, product_name: 'Brightloop Core ERP (Unlimited)' },
        { id: 4, product_id: 2, variant_id: 5, quantity: 1, unit_price: 700.0, product_name: 'Brightloop CRM (AI Predictive)' },
        { id: 5, product_id: 3, variant_id: 7, quantity: 1, unit_price: 1000.0, product_name: 'Dedicated Cloud Hosting' },
        { id: 6, product_id: 4, quantity: 1, unit_price: 300.0, product_name: 'Priority SLA Support 24/7' },
      ],
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
  taxes: [
    { id: 1, name: 'Standard VAT (20%)', rate: 0.20, tax_type: 'percentage', is_active: true },
    { id: 2, name: 'Software Sales Tax (10%)', rate: 0.10, tax_type: 'percentage', is_active: true },
    { id: 3, name: 'Zero Tax (B2B Export 0%)', rate: 0.00, tax_type: 'percentage', is_active: true },
  ],
  discounts: [
    {
      id: 1,
      code: 'WELCOME20',
      name: 'Welcome Special (20% Off)',
      discount_type: 'percentage',
      discount_value: 20,
      min_purchase_amount: 500,
      min_quantity: 1,
      start_date: '2026-01-01',
      end_date: '2027-12-31',
      used_count: 3,
      scope: 'whole_subscription',
      is_active: true,
    },
    {
      id: 2,
      code: 'ENTERPRISE500',
      name: 'Executive Partner Rebate ($500 Off)',
      discount_type: 'fixed',
      discount_value: 500,
      min_purchase_amount: 2000,
      min_quantity: 1,
      start_date: '2026-01-01',
      end_date: '2027-12-31',
      used_count: 1,
      scope: 'whole_subscription',
      is_active: true,
    },
  ],
  subscriptions: [
    {
      id: 1,
      subscription_number: 'SUB-2026-0001',
      customer_id: 3,
      plan_id: 1,
      status: 'active',
      start_date: '2026-02-01',
      next_billing_date: '2026-04-01',
      last_billed_date: '2026-03-01',
      payment_terms: 'Immediate Payment',
      tax_id: 2,
      notes: 'Flagship enterprise subscription',
      created_at: '2026-02-01T10:00:00Z',
      updated_at: '2026-03-01T00:00:00Z',
      customer: {
        id: 3,
        email: 'john@enterprise-corp.com',
        full_name: 'John Vance',
        company_name: 'Enterprise Corp Inc.',
        role: 'customer',
        is_active: true,
        created_at: '2026-02-01T10:00:00Z',
      },
      plan: {
        id: 1,
        name: 'Monthly Enterprise Plan',
        cost: 1500.0,
        billing_frequency: 'monthly',
        min_quantity: 1,
        close_on_end: false,
        allow_early_close: true,
        allow_pause: true,
        allow_renewal: true,
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
      },
      lines: [
        {
          id: 1,
          product_id: 1,
          variant_id: 1,
          quantity: 1,
          unit_price: 1200.0,
          tax_rate: 0.10,
          line_amount: 1320.0,
          product_name: 'Brightloop Core ERP',
          variant_name: '1-10 Users Starter',
        },
      ],
    },
    {
      id: 2,
      subscription_number: 'SUB-2026-0002',
      customer_id: 4,
      plan_id: 2,
      status: 'active',
      start_date: '2026-02-15',
      next_billing_date: '2026-05-15',
      last_billed_date: '2026-02-15',
      payment_terms: '15 Days Net',
      tax_id: 1,
      notes: 'Quarterly retail bundle',
      created_at: '2026-02-15T10:00:00Z',
      updated_at: '2026-02-15T10:00:00Z',
      customer: {
        id: 4,
        email: 'sarah@localbakery.com',
        full_name: 'Sarah Conners',
        company_name: 'Artisan Bread & Bakes',
        role: 'customer',
        is_active: true,
        created_at: '2026-02-10T11:15:00Z',
      },
      plan: {
        id: 2,
        name: 'Quarterly Business Growth Plan',
        cost: 4200.0,
        billing_frequency: 'monthly',
        min_quantity: 1,
        close_on_end: false,
        allow_early_close: true,
        allow_pause: true,
        allow_renewal: true,
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
      },
      lines: [
        {
          id: 2,
          product_id: 2,
          quantity: 2,
          unit_price: 450.0,
          tax_rate: 0.20,
          line_amount: 1080.0,
          product_name: 'Brightloop CRM',
        },
      ],
    },
    {
      id: 3,
      subscription_number: 'SUB-2026-0003',
      customer_id: 5,
      plan_id: 1,
      status: 'quotation',
      start_date: '2026-03-01',
      next_billing_date: '2026-04-01',
      payment_terms: 'Immediate Payment',
      discount_id: 1,
      tax_id: 2,
      notes: 'Pending quotation review',
      created_at: '2026-03-01T12:00:00Z',
      updated_at: '2026-03-01T12:00:00Z',
      customer: {
        id: 5,
        email: 'alex@techstartup.io',
        full_name: 'Alex Chen',
        company_name: 'NextGen Analytics Labs',
        role: 'customer',
        is_active: true,
        created_at: '2026-02-15T14:20:00Z',
      },
      plan: {
        id: 1,
        name: 'Monthly Enterprise Plan',
        cost: 1500.0,
        billing_frequency: 'monthly',
        min_quantity: 1,
        close_on_end: false,
        allow_early_close: true,
        allow_pause: true,
        allow_renewal: true,
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
      },
      lines: [
        {
          id: 3,
          product_id: 1,
          quantity: 1,
          unit_price: 1200.0,
          tax_rate: 0.10,
          line_amount: 1320.0,
          product_name: 'Brightloop Core ERP',
        },
      ],
    },
  ],
  invoices: [
    {
      id: 1,
      invoice_number: 'INV-2026-0001',
      subscription_id: 1,
      customer_id: 3,
      billing_period_start: '2026-02-01',
      billing_period_end: '2026-03-01',
      status: 'paid',
      issue_date: '2026-02-01',
      due_date: '2026-02-15',
      subtotal: 1200.0,
      tax_total: 120.0,
      discount_total: 0.0,
      grand_total: 1320.0,
      amount_paid: 1320.0,
      amount_due: 0.0,
      notes: 'Paid via Bank Wire on 2026-02-02',
      customer: {
        id: 3,
        email: 'john@enterprise-corp.com',
        full_name: 'John Vance',
        company_name: 'Enterprise Corp Inc.',
        role: 'customer',
        is_active: true,
        created_at: '2026-02-01T10:00:00Z',
      },
      lines: [
        {
          id: 1,
          product_id: 1,
          product_name: 'Brightloop Core ERP (Starter)',
          quantity: 1,
          unit_price: 1200.0,
          tax_rate: 0.10,
          tax_amount: 120.0,
          discount_amount: 0.0,
          line_total: 1320.0,
        },
      ],
    },
    {
      id: 2,
      invoice_number: 'INV-2026-0002',
      subscription_id: 1,
      customer_id: 3,
      billing_period_start: '2026-03-01',
      billing_period_end: '2026-04-01',
      status: 'confirmed',
      issue_date: '2026-03-01',
      due_date: '2026-03-15',
      subtotal: 1200.0,
      tax_total: 120.0,
      discount_total: 0.0,
      grand_total: 1320.0,
      amount_paid: 0.0,
      amount_due: 1320.0,
      notes: 'March cycle billing',
      customer: {
        id: 3,
        email: 'john@enterprise-corp.com',
        full_name: 'John Vance',
        company_name: 'Enterprise Corp Inc.',
        role: 'customer',
        is_active: true,
        created_at: '2026-02-01T10:00:00Z',
      },
      lines: [
        {
          id: 2,
          product_id: 1,
          product_name: 'Brightloop Core ERP (Starter)',
          quantity: 1,
          unit_price: 1200.0,
          tax_rate: 0.10,
          tax_amount: 120.0,
          discount_amount: 0.0,
          line_total: 1320.0,
        },
      ],
    },
    {
      id: 3,
      invoice_number: 'INV-2026-0003',
      subscription_id: 2,
      customer_id: 4,
      billing_period_start: '2026-02-15',
      billing_period_end: '2026-05-15',
      status: 'confirmed',
      issue_date: '2026-02-15',
      due_date: '2026-03-01',
      subtotal: 900.0,
      tax_total: 180.0,
      discount_total: 0.0,
      grand_total: 1080.0,
      amount_paid: 500.0,
      amount_due: 580.0,
      notes: 'Partially settled',
      customer: {
        id: 4,
        email: 'sarah@localbakery.com',
        full_name: 'Sarah Conners',
        company_name: 'Artisan Bread & Bakes',
        role: 'customer',
        is_active: true,
        created_at: '2026-02-10T11:15:00Z',
      },
      lines: [
        {
          id: 3,
          product_id: 2,
          product_name: 'Brightloop CRM (2 seats)',
          quantity: 2,
          unit_price: 450.0,
          tax_rate: 0.20,
          tax_amount: 180.0,
          discount_amount: 0.0,
          line_total: 1080.0,
        },
      ],
    },
  ],
  payments: [
    {
      id: 1,
      payment_number: 'PAY-2026-0001',
      invoice_id: 1,
      customer_id: 3,
      payment_method: 'bank_transfer',
      amount: 1320.0,
      payment_date: '2026-02-02',
      reference_note: 'Wire REF-994821',
    },
    {
      id: 2,
      payment_number: 'PAY-2026-0002',
      invoice_id: 3,
      customer_id: 4,
      payment_method: 'credit_card',
      amount: 500.0,
      payment_date: '2026-02-20',
      reference_note: 'Stripe charge ch_3M92jf',
    },
  ],
};

class MockDataStore {
  private state: StandaloneState;

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): StandaloneState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      // Ignore
    }
    this.saveState(DEFAULT_STATE);
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }

  private saveState(s: StandaloneState) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch (e) {
      // Ignore
    }
  }

  getState(): StandaloneState {
    return this.state;
  }

  reset() {
    this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    this.saveState(this.state);
  }

  // Auth
  authenticate(email: string, pass: string): { user: User; token: string } {
    const user = this.state.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    // Accept persona passwords or common test pass
    const validPass =
      (email.includes('admin') && pass === 'AdminPass123!') ||
      (email.includes('staff') && pass === 'StaffPass123!') ||
      (email.includes('enterprise') || email.includes('localbakery') || email.includes('techstartup') || pass === 'CustomerPass123!') ||
      pass.length >= 4;

    if (!user || !validPass) {
      // If it's a new or unrecognized email, auto-create as customer demo user
      if (email && pass) {
        const newUser: User = {
          id: this.state.users.length + 1,
          email,
          full_name: email.split('@')[0],
          role: email.includes('admin') ? 'admin' : email.includes('staff') ? 'staff' : 'customer',
          is_active: true,
          created_at: new Date().toISOString(),
        };
        this.state.users.push(newUser);
        this.saveState(this.state);
        return { user: newUser, token: `standalone_token_${newUser.id}` };
      }
      throw new Error('Invalid credentials');
    }

    return { user, token: `standalone_token_${user.id}` };
  }

  registerUser(payload: any): { user: User; token: string } {
    const existing = this.state.users.find((u) => u.email.toLowerCase() === payload.email.toLowerCase());
    if (existing) {
      return { user: existing, token: `standalone_token_${existing.id}` };
    }
    const newUser: User = {
      id: this.state.users.length + 1,
      email: payload.email,
      full_name: payload.full_name || payload.email.split('@')[0],
      company_name: payload.company_name,
      phone: payload.phone,
      address: payload.address,
      role: 'customer',
      is_active: true,
      created_at: new Date().toISOString(),
    };
    this.state.users.push(newUser);
    this.saveState(this.state);
    return { user: newUser, token: `standalone_token_${newUser.id}` };
  }

  // Products
  getProducts(): Product[] {
    return this.state.products;
  }

  createProduct(payload: any): Product {
    const p: Product = {
      id: this.state.products.length + 1,
      name: payload.name,
      product_type: payload.product_type || 'software',
      sales_price: Number(payload.sales_price),
      cost_price: Number(payload.cost_price || 0),
      notes: payload.notes,
      is_active: true,
      variants: [],
      created_at: new Date().toISOString(),
    };
    this.state.products.unshift(p);
    this.saveState(this.state);
    return p;
  }

  addVariant(productId: number, payload: any): any {
    const p = this.state.products.find((prod) => prod.id === productId);
    if (!p) throw new Error('Product not found');
    const v = {
      id: Date.now(),
      product_id: productId,
      name: payload.name,
      attribute_name: payload.attribute_name,
      attribute_value: payload.attribute_value,
      price_extra: Number(payload.price_extra || 0),
    };
    p.variants.push(v);
    this.saveState(this.state);
    return v;
  }

  // Plans
  getPlans(): Plan[] {
    return this.state.plans;
  }

  createPlan(payload: any): Plan {
    const plan: Plan = {
      id: this.state.plans.length + 1,
      name: payload.name,
      cost: Number(payload.cost),
      billing_frequency: payload.billing_frequency || 'monthly',
      min_quantity: payload.min_quantity || 1,
      close_on_end: !!payload.close_on_end,
      allow_early_close: payload.allow_early_close ?? true,
      allow_pause: payload.allow_pause ?? true,
      allow_renewal: payload.allow_renewal ?? true,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    this.state.plans.unshift(plan);
    this.saveState(this.state);
    return plan;
  }

  // Templates
  getTemplates(): QuotationTemplate[] {
    return this.state.templates;
  }

  createTemplate(payload: any): QuotationTemplate {
    const t: QuotationTemplate = {
      id: this.state.templates.length + 1,
      name: payload.name,
      plan_id: payload.plan_id,
      validity_days: payload.validity_days || 30,
      notes: payload.notes,
      lines: payload.lines || [],
      created_at: new Date().toISOString(),
    };
    this.state.templates.unshift(t);
    this.saveState(this.state);
    return t;
  }

  // Taxes & Discounts
  getTaxes(): TaxRule[] {
    return this.state.taxes;
  }

  createTax(payload: any): TaxRule {
    const t: TaxRule = {
      id: this.state.taxes.length + 1,
      name: payload.name,
      rate: Number(payload.rate),
      tax_type: payload.tax_type || 'percentage',
      is_active: true,
    };
    this.state.taxes.push(t);
    this.saveState(this.state);
    return t;
  }

  getDiscounts(): DiscountRule[] {
    return this.state.discounts;
  }

  createDiscount(payload: any): DiscountRule {
    const d: DiscountRule = {
      id: this.state.discounts.length + 1,
      code: payload.code.toUpperCase(),
      name: payload.name,
      discount_type: payload.discount_type || 'percentage',
      discount_value: Number(payload.discount_value),
      min_purchase_amount: Number(payload.min_purchase_amount || 0),
      min_quantity: Number(payload.min_quantity || 1),
      start_date: payload.start_date || '2026-01-01',
      end_date: payload.end_date || '2027-12-31',
      used_count: 0,
      scope: payload.scope || 'whole_subscription',
      is_active: true,
    };
    this.state.discounts.push(d);
    this.saveState(this.state);
    return d;
  }

  // Subscriptions
  getSubscriptions(params?: any): Subscription[] {
    let list = [...this.state.subscriptions];
    if (params?.status) {
      list = list.filter((s) => s.status === params.status);
    }
    if (params?.customer_id) {
      list = list.filter((s) => s.customer_id === Number(params.customer_id));
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (s) =>
          s.subscription_number.toLowerCase().includes(q) ||
          s.customer?.full_name.toLowerCase().includes(q) ||
          s.customer?.company_name?.toLowerCase().includes(q)
      );
    }
    return list;
  }

  getSubscription(id: number): Subscription {
    const s = this.state.subscriptions.find((sub) => sub.id === id);
    if (!s) throw new Error('Subscription not found');
    return s;
  }

  createSubscription(payload: any): Subscription {
    const customer = this.state.users.find((u) => u.id === Number(payload.customer_id));
    const plan = this.state.plans.find((p) => p.id === Number(payload.plan_id));

    const subNumber = `SUB-2026-${String(this.state.subscriptions.length + 1).padStart(4, '0')}`;
    const newSub: Subscription = {
      id: this.state.subscriptions.length + 1,
      subscription_number: subNumber,
      customer_id: Number(payload.customer_id),
      plan_id: Number(payload.plan_id),
      status: payload.status || 'draft',
      start_date: payload.start_date || new Date().toISOString().split('T')[0],
      next_billing_date: payload.next_billing_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      payment_terms: payload.payment_terms || 'Immediate Payment',
      tax_id: payload.tax_id ? Number(payload.tax_id) : undefined,
      discount_id: payload.discount_id ? Number(payload.discount_id) : undefined,
      notes: payload.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      customer,
      plan,
      lines: (payload.lines || []).map((l: any, idx: number) => ({
        id: idx + 1,
        product_id: l.product_id,
        variant_id: l.variant_id,
        quantity: l.quantity,
        unit_price: l.unit_price,
        tax_rate: 0.10,
        line_amount: Number(l.quantity) * Number(l.unit_price) * 1.10,
        product_name: l.product_name || 'Software Product',
      })),
    };
    this.state.subscriptions.unshift(newSub);
    this.saveState(this.state);
    return newSub;
  }

  updateSubscriptionStatus(id: number, status: string): Subscription {
    const s = this.state.subscriptions.find((sub) => sub.id === id);
    if (!s) throw new Error('Subscription not found');
    s.status = status as any;
    s.updated_at = new Date().toISOString();
    this.saveState(this.state);
    return s;
  }

  generateInvoice(subId: number, autoConfirm: boolean = false): Invoice {
    const s = this.state.subscriptions.find((sub) => sub.id === subId);
    if (!s) throw new Error('Subscription not found');

    const invNumber = `INV-2026-${String(this.state.invoices.length + 1).padStart(4, '0')}`;
    const subtotal = s.lines.reduce((acc, l) => acc + Number(l.unit_price) * Number(l.quantity), 0);
    const taxTotal = subtotal * 0.10;
    const grandTotal = subtotal + taxTotal;

    const newInv: Invoice = {
      id: this.state.invoices.length + 1,
      invoice_number: invNumber,
      subscription_id: s.id,
      customer_id: s.customer_id,
      billing_period_start: s.start_date,
      billing_period_end: s.next_billing_date,
      status: autoConfirm ? 'confirmed' : 'draft',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      subtotal,
      tax_total: taxTotal,
      discount_total: 0,
      grand_total: grandTotal,
      amount_paid: 0,
      amount_due: grandTotal,
      notes: `Generated for ${s.subscription_number}`,
      customer: s.customer,
      lines: s.lines.map((l, idx) => ({
        id: idx + 1,
        product_id: l.product_id,
        variant_id: l.variant_id,
        product_name: l.product_name || 'Software Line',
        quantity: l.quantity,
        unit_price: l.unit_price,
        tax_rate: 0.10,
        tax_amount: Number(l.unit_price) * 0.10 * Number(l.quantity),
        discount_amount: 0,
        line_total: Number(l.unit_price) * 1.10 * Number(l.quantity),
      })),
    };
    this.state.invoices.unshift(newInv);
    this.saveState(this.state);
    return newInv;
  }

  // Invoices
  getInvoices(params?: any): Invoice[] {
    let list = [...this.state.invoices];
    if (params?.status) {
      list = list.filter((i) => i.status === params.status);
    }
    if (params?.customer_id) {
      list = list.filter((i) => i.customer_id === Number(params.customer_id));
    }
    return list;
  }

  getInvoice(id: number): Invoice {
    const inv = this.state.invoices.find((i) => i.id === id);
    if (!inv) throw new Error('Invoice not found');
    return inv;
  }

  updateInvoiceStatus(id: number, status: string): Invoice {
    const inv = this.state.invoices.find((i) => i.id === id);
    if (!inv) throw new Error('Invoice not found');
    inv.status = status as any;
    this.saveState(this.state);
    return inv;
  }

  // Payments
  getPayments(invoiceId?: number): Payment[] {
    if (invoiceId) {
      return this.state.payments.filter((p) => p.invoice_id === invoiceId);
    }
    return this.state.payments;
  }

  recordPayment(payload: any): Payment {
    const inv = this.state.invoices.find((i) => i.id === Number(payload.invoice_id));
    if (!inv) throw new Error('Invoice not found');

    const paymentAmount = Number(payload.amount);
    inv.amount_paid = Number(inv.amount_paid) + paymentAmount;
    inv.amount_due = Math.max(0, Number(inv.grand_total) - Number(inv.amount_paid));
    if (inv.amount_due <= 0.01) {
      inv.status = 'paid';
    }

    const p: Payment = {
      id: this.state.payments.length + 1,
      payment_number: `PAY-2026-${String(this.state.payments.length + 1).padStart(4, '0')}`,
      invoice_id: inv.id,
      customer_id: inv.customer_id,
      payment_method: payload.payment_method || 'credit_card',
      amount: paymentAmount,
      payment_date: new Date().toISOString().split('T')[0],
      reference_note: payload.reference_note || 'Online checkout',
    };
    this.state.payments.unshift(p);
    this.saveState(this.state);
    return p;
  }

  // Analytics
  getFinanceSummary(): FinanceSummary {
    const activeSubs = this.state.subscriptions.filter((s) => s.status === 'active');
    const totalRevenue = this.state.payments.reduce((acc, p) => acc + Number(p.amount), 0);
    const totalOutstanding = this.state.invoices
      .filter((i) => i.status === 'confirmed')
      .reduce((acc, i) => acc + Number(i.amount_due), 0);
    const mrr = activeSubs.reduce((acc, s) => acc + Number(s.plan?.cost || 1200), 0);
    const paidCount = this.state.invoices.filter((i) => i.status === 'paid').length;
    const unpaidCount = this.state.invoices.filter((i) => i.status !== 'paid').length;

    return {
      active_subscriptions: activeSubs.length,
      total_subscriptions: this.state.subscriptions.length,
      total_revenue: totalRevenue.toFixed(2),
      total_outstanding: totalOutstanding.toFixed(2),
      overdue_invoices_count: 1,
      overdue_amount: '580.00',
      mrr: mrr.toFixed(2),
      arr: (mrr * 12).toFixed(2),
      paid_invoices_count: paidCount,
      unpaid_invoices_count: unpaidCount,
    };
  }
}

export const mockStore = new MockDataStore();
