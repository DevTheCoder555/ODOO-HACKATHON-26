export type UserRole = 'admin' | 'staff' | 'customer';

export interface User {
  id: number;
  email: string;
  full_name: string;
  company_name?: string;
  phone?: string;
  address?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ProductVariant {
  id?: number;
  product_id?: number;
  name: string;
  attribute_name: string;
  attribute_value: string;
  price_extra: string | number;
}

export interface Product {
  id: number;
  name: string;
  product_type: string;
  sales_price: string | number;
  cost_price: string | number;
  notes?: string;
  is_active: boolean;
  variants: ProductVariant[];
  created_at: string;
}

export interface Plan {
  id: number;
  name: string;
  cost: string | number;
  billing_frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  min_quantity: number;
  available_from?: string;
  available_to?: string;
  close_on_end: boolean;
  allow_early_close: boolean;
  allow_pause: boolean;
  allow_renewal: boolean;
  is_active: boolean;
  created_at: string;
}

export interface QuotationTemplateLine {
  id?: number;
  product_id: number;
  variant_id?: number;
  quantity: number;
  unit_price: string | number;
  product_name?: string;
}

export interface QuotationTemplate {
  id: number;
  name: string;
  plan_id: number;
  validity_days: number;
  notes?: string;
  lines: QuotationTemplateLine[];
  created_at: string;
}

export interface TaxRule {
  id: number;
  name: string;
  rate: string | number;
  tax_type: string;
  is_active: boolean;
}

export interface DiscountRule {
  id: number;
  code: string;
  name: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: string | number;
  min_purchase_amount: string | number;
  min_quantity: number;
  start_date: string;
  end_date: string;
  usage_limit?: number;
  used_count: number;
  scope: 'whole_subscription' | 'specific_products';
  specific_product_ids?: number[];
  is_active: boolean;
}

export interface SubscriptionLine {
  id?: number;
  product_id: number;
  variant_id?: number;
  quantity: number;
  unit_price: string | number;
  tax_rate: string | number;
  line_amount: string | number;
  product_name?: string;
  variant_name?: string;
}

export interface Subscription {
  id: number;
  subscription_number: string;
  customer_id: number;
  plan_id: number;
  status: 'draft' | 'quotation' | 'confirmed' | 'active' | 'paused' | 'closed';
  start_date: string;
  expiry_date?: string;
  next_billing_date: string;
  last_billed_date?: string;
  payment_terms: string;
  valid_until?: string;
  discount_id?: number;
  tax_id?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  customer?: User;
  plan?: Plan;
  discount?: DiscountRule;
  tax?: TaxRule;
  lines: SubscriptionLine[];
}

export interface InvoiceLine {
  id: number;
  product_id: number;
  variant_id?: number;
  product_name: string;
  variant_name?: string;
  quantity: number;
  unit_price: string | number;
  tax_rate: string | number;
  tax_amount: string | number;
  discount_amount: string | number;
  line_total: string | number;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  subscription_id: number;
  customer_id: number;
  billing_period_start: string;
  billing_period_end: string;
  status: 'draft' | 'confirmed' | 'paid' | 'cancelled';
  issue_date: string;
  due_date: string;
  subtotal: string | number;
  tax_total: string | number;
  discount_total: string | number;
  grand_total: string | number;
  amount_paid: string | number;
  amount_due: string | number;
  notes?: string;
  lines: InvoiceLine[];
  customer?: User;
}

export interface Payment {
  id: number;
  payment_number: string;
  invoice_id: number;
  customer_id: number;
  payment_method: string;
  amount: string | number;
  payment_date: string;
  reference_note?: string;
}

export interface FinanceSummary {
  active_subscriptions: number;
  total_subscriptions: number;
  total_revenue: string | number;
  total_outstanding: string | number;
  overdue_invoices_count: number;
  overdue_amount: string | number;
  mrr: string | number;
  arr: string | number;
  paid_invoices_count: number;
  unpaid_invoices_count: number;
}

