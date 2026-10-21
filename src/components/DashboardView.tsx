import React from 'react';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Calendar,
  Clock,
  ArrowRight,
  UserPlus,
  Send,
  FileUp,
  Download,
  ShieldCheck,
  Building2,
  ExternalLink,
  QrCode,
} from 'lucide-react';
import type { DashboardStats, Farmer, Payment, Firm } from '../types';
import { formatCurrencyINR, formatDate } from '../utils';

interface DashboardViewProps {
  stats: DashboardStats | null;
  firm: Firm | null;
  onNavigate: (tab: string) => void;
  onSelectFarmer: (farmerId: string) => void;
  onOpenAddFarmer: () => void;
  onOpenMakePayment: (farmer?: Farmer) => void;
  onOpenBulkImport: () => void;
  onDownloadBackup: () => void;
  onOpenFirmQRPoster: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  firm,
  onNavigate,
  onSelectFarmer,
  onOpenAddFarmer,
  onOpenMakePayment,
  onOpenBulkImport,
  onDownloadBackup,
  onOpenFirmQRPoster,
}) => {
  if (!stats) {
    return (
      <div className="py-12 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-800"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mandi Firm Banner & Quick Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full">
              Active Trading Firm
            </span>
            <span className="text-xs text-slate-700">Mandi Yard: {firm?.mandiLicenseNumber || 'Registered'}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">{firm?.firmName || 'Grain Trading Merchant'}</h1>
          <p className="text-xs text-slate-700 mt-0.5">
            Owner: <strong className="text-slate-700">{firm?.ownerName}</strong> · Phone: {firm?.mobile} · Address:{' '}
            {firm?.address}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {firm && (
            <button
              onClick={onOpenFirmQRPoster}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg shadow-xs transition"
              title="View & Print Firm Passbook QR Poster for Farmers"
            >
              <QrCode className="w-4 h-4 text-amber-800" />
              <span>Firm QR Poster</span>
            </button>
          )}
          <button
            onClick={onOpenAddFarmer}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-xs transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add Farmer</span>
          </button>
          <button
            onClick={() => onOpenMakePayment()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition"
          >
            <Send className="w-4 h-4" />
            <span>Record RTGS Payment</span>
          </button>
          <button
            onClick={onOpenBulkImport}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            title="Import Excel or CSV of farmers"
          >
            <FileUp className="w-4 h-4" />
            <span className="hidden sm:inline">Bulk Import</span>
          </button>
          <button
            onClick={onDownloadBackup}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            title="Export full firm data backup (JSON)"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Backup</span>
          </button>
        </div>
      </div>

      {/* 6 Top Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Farmers */}
        <div
          onClick={() => onNavigate('farmers')}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-emerald-500 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Farmers</span>
            <Users className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{stats.totalFarmers}</div>
          <div className="text-[10px] text-slate-700 mt-1 flex items-center gap-1">
            <span>In digital directory</span>
          </div>
        </div>

        {/* Bank Verified */}
        <div
          onClick={() => onNavigate('farmers')}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-emerald-500 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">Bank Verified</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-800 mt-2">{stats.bankVerified}</div>
          <div className="text-[10px] text-slate-700 mt-1">Passbook verified ✓</div>
        </div>

        {/* Bank Details Pending / Missing */}
        <div
          onClick={() => onNavigate('farmers')}
          className="bg-white rounded-xl border border-amber-200 bg-amber-50/30 p-4 shadow-xs hover:border-amber-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-amber-900">
            <span className="text-[11px] font-bold uppercase tracking-wider">Verification Pending</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-800 mt-2">{stats.bankPending + stats.bankMissing}</div>
          <div className="text-[10px] text-amber-800 mt-1">
            {stats.bankPending} pending · {stats.bankMissing} missing
          </div>
        </div>

        {/* Total Payments Amount */}
        <div
          onClick={() => onNavigate('payments')}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-emerald-500 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total RTGS Paid</span>
            <CreditCard className="w-4 h-4 text-blue-700" />
          </div>
          <div className="text-lg font-black text-slate-900 mt-2 line-clamp-1">
            {formatCurrencyINR(stats.totalPaymentAmount)}
          </div>
          <div className="text-[10px] text-slate-700 mt-1">{stats.totalPaymentCount} transfers completed</div>
        </div>

        {/* Today's Payments */}
        <div
          onClick={() => onNavigate('payments')}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-emerald-500 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Today's Transfers</span>
            <Calendar className="w-4 h-4 text-indigo-700" />
          </div>
          <div className="text-lg font-black text-slate-900 mt-2 line-clamp-1">
            {formatCurrencyINR(stats.todayPaymentAmount)}
          </div>
          <div className="text-[10px] text-slate-700 mt-1">{stats.todayPaymentCount} payments today</div>
        </div>

        {/* Pending Payments */}
        <div
          onClick={() => onNavigate('payments')}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-red-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending RTGS</span>
            <Clock className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-lg font-black text-amber-700 mt-2 line-clamp-1">
            {formatCurrencyINR(stats.pendingPaymentAmount)}
          </div>
          <div className="text-[10px] text-slate-700 mt-1">{stats.pendingPaymentCount} transfers awaiting UTR</div>
        </div>
      </div>

      {/* Pending Bank Verification Queue */}
      {stats.pendingVerificationFarmers.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-300 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-700" />
              <div>
                <h3 className="text-sm font-bold text-amber-950">Action Needed: Pending Bank Details &amp; Passbooks</h3>
                <p className="text-xs text-amber-900">
                  Compare uploaded passbook photos with farmer account numbers and verify before initiating RTGS payments.
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('farmers')}
              className="text-xs font-semibold text-amber-950 hover:text-amber-900 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.pendingVerificationFarmers.map(farmer => (
              <div
                key={farmer.id}
                onClick={() => onSelectFarmer(farmer.id)}
                className="bg-white p-3.5 rounded-xl border border-amber-200 hover:border-amber-400 hover:shadow-xs transition cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-900">{farmer.farmerCode}</span>
                    <span className="text-xs font-bold text-slate-900">{farmer.name}</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {farmer.village} · Mob: {farmer.mobile}
                  </div>
                  <div className="text-[11px] text-slate-700 mt-1">
                    {farmer.bankAccount ? (
                      <span>
                        {farmer.bankAccount.bankName} · {farmer.bankAccount.accountNumberMasked}
                      </span>
                    ) : (
                      <span className="text-red-700 font-medium">No bank details added yet</span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-1 rounded-sm">
                    Verify Now
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Layout: Recent Farmers & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Farmers */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-800" />
              <h3 className="text-sm font-bold text-slate-900">Recently Added Farmers</h3>
            </div>
            <button
              onClick={() => onNavigate('farmers')}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {stats.recentFarmers.map(f => (
              <div
                key={f.id}
                onClick={() => onSelectFarmer(f.id)}
                className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-emerald-800">{f.farmerCode}</span>
                    <span className="text-xs font-bold text-slate-900">{f.name}</span>
                    <span className="text-[11px] text-slate-600">S/o {f.fatherName}</span>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    Village: {f.village} · Mob: {f.mobile}
                  </div>
                </div>

                <div className="text-right">
                  {f.bankAccount?.verificationStatus === 'verified' ? (
                    <span className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1 justify-end">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                    </span>
                  ) : f.bankAccount?.verificationStatus === 'pending' ? (
                    <span className="text-[11px] text-amber-800 font-semibold flex items-center gap-1 justify-end">
                      <AlertTriangle className="w-3.5 h-3.5" /> Pending
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-600">Missing Bank</span>
                  )}
                  <div className="text-[10px] text-slate-600 font-mono mt-0.5">
                    {f.bankAccount ? f.bankAccount.accountNumberMasked : 'No Account'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent RTGS Payments */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-800" />
              <h3 className="text-sm font-bold text-slate-900">Recent Bank Transfers &amp; RTGS</h3>
            </div>
            <button
              onClick={() => onNavigate('payments')}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {stats.recentPayments.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-700">No payment records created yet.</div>
            ) : (
              stats.recentPayments.map(p => (
                <div
                  key={p.id}
                  onClick={() => onNavigate('payments')}
                  className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition cursor-pointer"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-900">{p.paymentCode}</span>
                      <span className="text-xs font-semibold text-slate-700">{p.paymentMethod}</span>
                      <span className="text-[11px] text-slate-600">{formatDate(p.paymentDate)}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      {p.bankName} · {p.accountNumberMasked}
                      {p.transactionReference && (
                        <span className="ml-2 font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                          UTR: {p.transactionReference}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-900">{formatCurrencyINR(p.amount)}</div>
                    <div>
                      {p.paymentStatus === 'Completed' ? (
                        <span className="text-[10px] text-emerald-800 font-semibold">Completed ✓</span>
                      ) : p.paymentStatus === 'Processing' ? (
                        <span className="text-[10px] text-blue-700 font-semibold">Processing...</span>
                      ) : (
                        <span className="text-[10px] text-amber-800 font-semibold">Pending UTR</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
