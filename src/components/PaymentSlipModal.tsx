import React from 'react';
import { X, Printer, CheckCircle2, Building2, Wheat, ShieldCheck } from 'lucide-react';
import type { Payment, Farmer, Firm } from '../types';
import { formatCurrencyINR, formatDate, numberToWordsINR } from '../utils';

interface PaymentSlipModalProps {
  payment: Payment;
  farmer?: Farmer | null;
  firm: Firm | null;
  onClose: () => void;
}

export const PaymentSlipModal: React.FC<PaymentSlipModalProps> = ({
  payment,
  farmer,
  firm,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
        {/* Modal Controls (Hidden in Print) */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 no-print">
          <span className="text-xs font-bold text-slate-700">Mandi RTGS Payment Voucher</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg inline-flex items-center gap-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Payment Slip</span>
            </button>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Paper */}
        <div className="print-card p-6 bg-white border border-slate-200 rounded-xl mt-4">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-emerald-900 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-900 text-amber-300 flex items-center justify-center font-bold">
                <Wheat className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                  {firm?.firmName || 'Kisan Krishi Mandi Traders'}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  {firm?.address} · Mob: {firm?.mobile}
                </p>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Mandi License: {firm?.mandiLicenseNumber || 'APMC-2026-KT'} · GST: {firm?.gstNumber || '08AAACK1234F1Z5'}
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded uppercase">
                Bank Transfer Slip
              </span>
              <div className="font-mono text-sm font-bold text-slate-900 mt-1">{payment.paymentCode}</div>
              <div className="text-xs text-slate-500">{formatDate(payment.paymentDate)}</div>
            </div>
          </div>

          {/* Farmer & Beneficiary Details */}
          <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-200 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Farmer Beneficiary</span>
              <div className="text-base font-black text-slate-900 mt-0.5">
                {farmer?.name || 'Farmer Beneficiary'}
              </div>
              <div className="text-slate-600">Farmer ID: <strong className="font-mono">{farmer?.farmerCode || 'FRM'}</strong></div>
              <div className="text-slate-600">Village: {farmer?.village || 'Mandi Trader'}</div>
              <div className="text-slate-600 font-mono">Mobile: {farmer?.mobile}</div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bank Transfer Details</span>
              <div className="font-bold text-slate-900 mt-0.5">{payment.bankName}</div>
              <div className="text-slate-700 font-mono">
                A/C: <strong>{payment.accountNumberMasked}</strong>
              </div>
              <div className="text-slate-700 font-mono">
                IFSC: <strong>{payment.ifsc}</strong>
              </div>
              <div className="text-slate-700">
                Method: <strong>{payment.paymentMethod} Transfer</strong>
              </div>
            </div>
          </div>

          {/* Amount Box */}
          <div className="my-4 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Payment Amount</span>
              <div className="text-2xl font-black text-emerald-900">{formatCurrencyINR(payment.amount)}</div>
              <div className="text-xs text-slate-600 italic mt-0.5">({numberToWordsINR(payment.amount)})</div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Bank UTR / Ref No.</span>
              <div className="font-mono text-sm font-black text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-300 mt-1">
                {payment.transactionReference || 'PENDING BANK UTR'}
              </div>
              <div className="text-[10px] text-emerald-800 font-semibold mt-1">
                Status: {payment.paymentStatus} ✓
              </div>
            </div>
          </div>

          {/* Settlement Digital Trail */}
          <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-2 space-y-0.5">
            <div>Payment Reference Note: {payment.notes || 'Crop produce settlement'}</div>
            <div>Recorded By: {payment.createdBy} · Timestamp: {payment.createdAt}</div>
          </div>

          {/* Signature Lines */}
          <div className="grid grid-cols-2 gap-8 pt-12 text-center text-xs text-slate-600">
            <div>
              <div className="border-t border-slate-300 pt-2 font-medium">Farmer Signature / Thumb</div>
            </div>
            <div>
              <div className="border-t border-slate-300 pt-2 font-medium">
                For {firm?.firmName || 'Kisan Krishi Mandi Traders'} (Authorized Signatory)
              </div>
            </div>
          </div>

          <div className="mt-8 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-400">
            Generated securely by KisanSetu Mandi RTGS System · Digital Audit Stamp #{payment.id}
          </div>
        </div>
      </div>
    </div>
  );
};
