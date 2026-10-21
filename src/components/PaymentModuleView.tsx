import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Send,
  Printer,
  Download,
  Building2,
  RefreshCw,
  X,
  FileCheck,
} from 'lucide-react';
import type { Payment, Farmer, PaymentMethod, PaymentStatus, Firm } from '../types';
import { api } from '../api';
import { formatCurrencyINR, formatDate, exportToCSV } from '../utils';

interface PaymentModuleViewProps {
  firm: Firm | null;
  onOpenPaymentSlip: (payment: Payment, farmer?: Farmer) => void;
  preSelectedFarmer?: Farmer | null;
}

export const PaymentModuleView: React.FC<PaymentModuleViewProps> = ({
  firm,
  onOpenPaymentSlip,
  preSelectedFarmer,
}) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  // Make Payment Modal
  const [showMakePaymentModal, setShowMakePaymentModal] = useState(false);
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('RTGS');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactionReference, setTransactionReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Mark Paid / UTR Update Modal
  const [selectedPaymentForUTR, setSelectedPaymentForUTR] = useState<Payment | null>(null);
  const [utrInput, setUtrInput] = useState('');
  const [savingUTR, setSavingUTR] = useState(false);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const [resPay, resFar] = await Promise.all([
        api.getPayments({
          search,
          status: statusFilter || undefined,
          method: methodFilter || undefined,
          limit: 100,
        }),
        api.getFarmers({ limit: 100 }),
      ]);
      setPayments(resPay.payments);
      setFarmers(resFar.farmers);
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [search, statusFilter, methodFilter]);

  // Handle opening pre-selected farmer payment
  useEffect(() => {
    if (preSelectedFarmer) {
      setSelectedFarmerId(preSelectedFarmer.id);
      setShowMakePaymentModal(true);
    }
  }, [preSelectedFarmer]);

  const handleMakePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const f = farmers.find(item => item.id === selectedFarmerId);
    if (!f) {
      setModalError('Please select a valid farmer');
      return;
    }

    if (!f.bankAccount) {
      setModalError('This farmer does not have bank details. Please add bank details first.');
      return;
    }

    if (f.bankAccount.verificationStatus !== 'verified') {
      const proceed = confirm(
        'Warning: This farmer\'s bank details are NOT yet verified against their passbook. Do you still want to proceed with payment?'
      );
      if (!proceed) return;
    }

    setIsSubmitting(true);
    try {
      const newPayment = await api.createPayment({
        farmerId: selectedFarmerId,
        amount: parseFloat(paymentAmount),
        paymentMethod,
        paymentDate,
        transactionReference: transactionReference.trim() || undefined,
        notes: paymentNotes,
      });

      setPayments(prev => [newPayment, ...prev]);
      setShowMakePaymentModal(false);
      setPaymentAmount('');
      setTransactionReference('');
      setPaymentNotes('');
      alert(`Payment ${newPayment.paymentCode} created successfully!`);
    } catch (err: any) {
      setModalError(err.message || 'Payment creation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUTRSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentForUTR) return;

    setSavingUTR(true);
    try {
      const updated = await api.updatePaymentStatus(
        selectedPaymentForUTR.id,
        'Completed',
        utrInput.trim()
      );
      setPayments(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      setSelectedPaymentForUTR(null);
      setUtrInput('');
      alert(`Payment marked as Completed with UTR ${updated.transactionReference}!`);
    } catch (err: any) {
      alert(err.message || 'Failed to update UTR');
    } finally {
      setSavingUTR(false);
    }
  };

  const handleExportCSV = () => {
    const rows = payments.map(p => {
      const f = farmers.find(item => item.id === p.farmerId);
      return {
        Payment_ID: p.paymentCode,
        Date: p.paymentDate,
        Farmer_Code: f?.farmerCode || 'N/A',
        Farmer_Name: f?.name || 'N/A',
        Amount: p.amount,
        Method: p.paymentMethod,
        Bank: p.bankName,
        Account_Masked: p.accountNumberMasked,
        IFSC: p.ifsc,
        UTR_Reference: p.transactionReference || 'PENDING',
        Status: p.paymentStatus,
        Created_By: p.createdBy,
      };
    });
    exportToCSV('Mandi_RTGS_Payment_Report', rows);
  };

  const currentSelectedFarmer = farmers.find(f => f.id === selectedFarmerId);

  return (
    <div className="space-y-4">
      {/* Search & Top Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by Payment ID, UTR number, farmer name, or bank..."
              className="block w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700 bg-slate-50/50 hover:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedFarmerId(farmers[0]?.id || '');
                setShowMakePaymentModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-xs transition"
            >
              <Send className="w-4 h-4" />
              <span>+ Record RTGS Payment</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              title="Download payment records as CSV"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-semibold mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Status:
          </span>
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1 rounded-lg font-medium transition ${
              statusFilter === '' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('Completed')}
            className={`px-3 py-1 rounded-lg font-medium transition ${
              statusFilter === 'Completed'
                ? 'bg-emerald-800 text-white'
                : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
            }`}
          >
            Completed ✓
          </button>
          <button
            onClick={() => setStatusFilter('Pending')}
            className={`px-3 py-1 rounded-lg font-medium transition ${
              statusFilter === 'Pending'
                ? 'bg-amber-800 text-white'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
            }`}
          >
            Pending UTR
          </button>

          <span className="text-slate-400 mx-2">|</span>

          <span className="text-slate-500 font-semibold mr-1">Method:</span>
          {['RTGS', 'NEFT', 'IMPS', 'Cash'].map(m => (
            <button
              key={m}
              onClick={() => setMethodFilter(methodFilter === m ? '' : m)}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                methodFilter === m ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-800 mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading RTGS payment ledger...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            No payments match your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3.5">Payment ID / Date</th>
                  <th className="px-4 py-3.5">Farmer Beneficiary</th>
                  <th className="px-4 py-3.5">Bank &amp; Account</th>
                  <th className="px-4 py-3.5">Method</th>
                  <th className="px-4 py-3.5">Amount</th>
                  <th className="px-4 py-3.5">UTR Reference</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {payments.map(payment => {
                  const farmer = farmers.find(f => f.id === payment.farmerId);
                  const isCompleted = payment.paymentStatus === 'Completed';

                  return (
                    <tr key={payment.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-slate-900">{payment.paymentCode}</div>
                        <div className="text-[11px] text-slate-500">{formatDate(payment.paymentDate)}</div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{farmer?.name || 'Farmer'}</div>
                        <div className="text-[11px] text-slate-500">
                          <span className="font-mono font-bold text-emerald-800 mr-1">{farmer?.farmerCode}</span>·{' '}
                          {farmer?.village}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{payment.bankName}</div>
                        <div className="font-mono text-slate-600 text-[11px]">
                          A/C: {payment.accountNumberMasked}
                        </div>
                        <div className="font-mono text-[10px] text-slate-500">IFSC: {payment.ifsc}</div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800">
                          {payment.paymentMethod}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-black text-slate-900 text-sm">{formatCurrencyINR(payment.amount)}</div>
                      </td>

                      <td className="px-4 py-3">
                        {payment.transactionReference ? (
                          <div className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded inline-block">
                            {payment.transactionReference}
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedPaymentForUTR(payment);
                              setUtrInput('');
                            }}
                            className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 transition"
                          >
                            + Enter UTR
                          </button>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {isCompleted ? (
                          <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Completed
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Pending UTR
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          {!isCompleted && (
                            <button
                              onClick={() => {
                                setSelectedPaymentForUTR(payment);
                                setUtrInput('');
                              }}
                              className="px-2 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                              title="Mark as Paid"
                            >
                              Mark Paid
                            </button>
                          )}
                          <button
                            onClick={() => onOpenPaymentSlip(payment, farmer)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                            title="Print Mandi Payment Slip"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record RTGS Payment Modal */}
      {showMakePaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-800" />
                <h3 className="text-base font-bold text-slate-900">Record RTGS / Bank Payment</h3>
              </div>
              <button
                onClick={() => setShowMakePaymentModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-900 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleMakePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Select Farmer Beneficiary *</label>
                <select
                  value={selectedFarmerId}
                  onChange={e => setSelectedFarmerId(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 bg-white"
                >
                  <option value="">-- Choose Farmer --</option>
                  {farmers.map(f => (
                    <option key={f.id} value={f.id}>
                      [{f.farmerCode}] {f.name} (S/o {f.fatherName}) - {f.village}
                    </option>
                  ))}
                </select>
              </div>

              {/* Verified Bank Preview Box */}
              {currentSelectedFarmer && (
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">Beneficiary Bank Account:</span>
                    {currentSelectedFarmer.bankAccount?.verificationStatus === 'verified' ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified Passbook
                      </span>
                    ) : (
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" /> Unverified
                      </span>
                    )}
                  </div>
                  {currentSelectedFarmer.bankAccount ? (
                    <div className="font-mono text-slate-800 pt-1">
                      <div>Bank: <strong>{currentSelectedFarmer.bankAccount.bankName}</strong></div>
                      <div>A/C: <strong>{currentSelectedFarmer.bankAccount.accountNumberMasked}</strong></div>
                      <div>IFSC: <strong>{currentSelectedFarmer.bankAccount.ifsc}</strong></div>
                    </div>
                  ) : (
                    <div className="text-red-700 font-semibold pt-1">
                      No bank details recorded! Add bank details first before initiating RTGS transfer.
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Amount (₹) *</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    placeholder="e.g. 150000"
                    className="mt-1 block w-full px-3 py-2 text-sm font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Payment Method *</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                    className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 bg-white"
                  >
                    <option value="RTGS">RTGS (Large Transfer &gt; ₹2 Lakh)</option>
                    <option value="NEFT">NEFT (Standard Mandi Transfer)</option>
                    <option value="IMPS">IMPS (Instant)</option>
                    <option value="Cash">Cash (Mandi Counter)</option>
                    <option value="Other">Other Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Bank UTR / Ref Number</label>
                  <input
                    type="text"
                    value={transactionReference}
                    onChange={e => setTransactionReference(e.target.value)}
                    placeholder="Leave blank if pending transfer"
                    className="mt-1 block w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Notes / Bill Reference</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Settlement for Mustard crop auction"
                  className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowMakePaymentModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-xs transition"
                >
                  {isSubmitting ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enter UTR Modal */}
      {selectedPaymentForUTR && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Mark as Paid &amp; Enter Bank UTR</h3>
              <button onClick={() => setSelectedPaymentForUTR(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Enter the bank UTR (Unique Transaction Reference) number provided by your net-banking / bank portal for
              payment <strong>{selectedPaymentForUTR.paymentCode}</strong> ({formatCurrencyINR(selectedPaymentForUTR.amount)}).
            </p>

            <form onSubmit={handleUpdateUTRSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Bank UTR / Transaction Reference *</label>
                <input
                  type="text"
                  required
                  value={utrInput}
                  onChange={e => setUtrInput(e.target.value.toUpperCase())}
                  placeholder="e.g. SBIN26049182901"
                  className="mt-1 block w-full px-3 py-2 text-sm font-mono font-bold uppercase border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPaymentForUTR(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingUTR || !utrInput.trim()}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg"
                >
                  {savingUTR ? 'Saving...' : 'Confirm & Complete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
