import React from 'react';
import { Printer, Download, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Invoice } from '../types';
import { StatusBadge } from './StatusBadge';

interface PrintableInvoiceProps {
  invoice: Invoice;
  onBack?: () => void;
}

export const PrintableInvoice: React.FC<PrintableInvoiceProps> = ({ invoice, onBack }) => {
  const isPaid = invoice.status === 'paid' || Number(invoice.amount_due) <= 0;
  const isOverdue = invoice.status === 'confirmed' && new Date(invoice.due_date) < new Date() && Number(invoice.amount_due) > 0;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
      {/* Top action bar (hidden during print) */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        )}
        <div className="flex items-center gap-3 ml-auto">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-[#714B67] hover:bg-[#583A50] text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" /> Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Invoice Document Box */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-8 sm:p-12 print:border-none print:shadow-none print:p-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-200 pb-8 mb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-lg bg-[#714B67] flex items-center justify-center text-white font-black text-xl">
                B
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Brightloop Software</h1>
            </div>
            <p className="text-sm text-slate-500">Subscription & Cloud ERP Solutions</p>
            <p className="text-sm text-slate-500">100 Innovation Way, Suite 400</p>
            <p className="text-sm text-slate-500">San Francisco, CA 94105</p>
            <p className="text-sm text-slate-500">billing@brightloop.com</p>
          </div>

          <div className="mt-6 sm:mt-0 text-left sm:text-right">
            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">INVOICE</h2>
            <p className="text-base font-semibold text-slate-700 mt-1">{invoice.invoice_number}</p>
            <div className="mt-2">
              <StatusBadge status={invoice.status} isOverdue={isOverdue} />
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Billed To</h3>
            <p className="font-bold text-slate-800 text-base">{invoice.customer?.company_name || invoice.customer?.full_name}</p>
            <p className="text-sm text-slate-600">{invoice.customer?.full_name}</p>
            <p className="text-sm text-slate-600">{invoice.customer?.email}</p>
            {invoice.customer?.phone && <p className="text-sm text-slate-600">{invoice.customer.phone}</p>}
            {invoice.customer?.address && <p className="text-sm text-slate-600 whitespace-pre-line">{invoice.customer.address}</p>}
          </div>

          <div className="sm:text-right space-y-1.5 text-sm">
            <div className="flex justify-between sm:justify-end gap-6">
              <span className="text-slate-500">Issue Date:</span>
              <span className="font-medium text-slate-800">{invoice.issue_date}</span>
            </div>
            <div className="flex justify-between sm:justify-end gap-6">
              <span className="text-slate-500">Due Date:</span>
              <span className="font-semibold text-slate-900">{invoice.due_date}</span>
            </div>
            <div className="flex justify-between sm:justify-end gap-6">
              <span className="text-slate-500">Billing Period:</span>
              <span className="font-medium text-slate-800">{invoice.billing_period_start} to {invoice.billing_period_end}</span>
            </div>
            <div className="flex justify-between sm:justify-end gap-6">
              <span className="text-slate-500">Subscription Ref:</span>
              <span className="font-mono text-xs font-semibold text-slate-700">SUB-#{invoice.subscription_id}</span>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-y border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Item & Description</th>
                <th className="py-3 px-4 text-center">Qty</th>
                <th className="py-3 px-4 text-right">Unit Price</th>
                <th className="py-3 px-4 text-right">Tax</th>
                <th className="py-3 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {invoice.lines.map((line, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="py-4 px-4">
                    <p className="font-semibold text-slate-900">{line.product_name}</p>
                    {line.variant_name && (
                      <p className="text-xs text-[#714B67] font-medium mt-0.5">
                        Variant: {line.variant_name}
                      </p>
                    )}
                  </td>
                  <td className="py-4 px-4 text-center font-medium text-slate-700">{line.quantity}</td>
                  <td className="py-4 px-4 text-right font-medium text-slate-700">
                    ${Number(line.unit_price).toFixed(2)}
                  </td>
                  <td className="py-4 px-4 text-right text-slate-500 text-xs">
                    {(Number(line.tax_rate) * 100).toFixed(0)}% (${Number(line.tax_amount).toFixed(2)})
                  </td>
                  <td className="py-4 px-4 text-right font-semibold text-slate-900">
                    ${Number(line.line_total).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start border-t border-slate-200 pt-6">
          <div className="mb-6 sm:mb-0 max-w-sm text-sm text-slate-500">
            <h4 className="font-semibold text-slate-700 mb-1">Notes & Terms</h4>
            <p className="text-xs leading-relaxed">
              {invoice.notes || "Thank you for partnering with Brightloop Software. Payment is due within the terms specified on your contract."}
            </p>
            {isPaid && (
              <div className="mt-4 flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span className="text-xs font-semibold">Payment Received in Full. Zero balance due.</span>
              </div>
            )}
          </div>

          <div className="w-full sm:w-80 space-y-2.5 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-medium text-slate-800">${Number(invoice.subtotal).toFixed(2)}</span>
            </div>

            {Number(invoice.discount_total) > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Discount Applied:</span>
                <span>-${Number(invoice.discount_total).toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-600">
              <span>Tax Total:</span>
              <span className="font-medium text-slate-800">+${Number(invoice.tax_total).toFixed(2)}</span>
            </div>

            <div className="border-t border-slate-200 pt-2 flex justify-between text-base font-bold text-slate-900">
              <span>Grand Total:</span>
              <span>${Number(invoice.grand_total).toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-slate-600 text-xs">
              <span>Amount Paid:</span>
              <span className="font-medium text-emerald-600">-${Number(invoice.amount_paid).toFixed(2)}</span>
            </div>

            <div className={`flex justify-between text-sm font-bold p-3 rounded-lg ${
              Number(invoice.amount_due) <= 0
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-slate-100 text-slate-900 border border-slate-200"
            }`}>
              <span>Amount Due:</span>
              <span>${Number(invoice.amount_due).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 mt-12 pt-6 text-center text-xs text-slate-400">
          <p>Brightloop Software Inc. • Registered Company • www.brightloop.com • support@brightloop.com</p>
        </div>
      </div>
    </div>
  );
};

