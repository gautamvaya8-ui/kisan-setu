import React, { useState, useEffect } from 'react';
import {
  Search,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Send,
  Eye,
  FileUp,
  Download,
  Filter,
  RefreshCw,
  Building2,
  Phone,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { Farmer } from '../types';
import { api } from '../api';
import { exportToCSV } from '../utils';

interface FarmerMasterViewProps {
  onSelectFarmer: (farmerId: string) => void;
  onOpenAddFarmer: () => void;
  onOpenMakePayment: (farmer: Farmer) => void;
  onOpenBulkImport: () => void;
  onOpenQRModal: (farmer: Farmer) => void;
}

export const FarmerMasterView: React.FC<FarmerMasterViewProps> = ({
  onSelectFarmer,
  onOpenAddFarmer,
  onOpenMakePayment,
  onOpenBulkImport,
  onOpenQRModal,
}) => {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchFarmers = async () => {
    setLoading(true);
    try {
      const res = await api.getFarmers({
        search,
        verificationStatus: statusFilter || undefined,
        page,
        limit: 15,
      });
      setFarmers(res.farmers);
      setTotalPages(res.totalPages);
      setTotalCount(res.total);
    } catch (err) {
      console.error('Failed to load farmers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarmers();
  }, [search, statusFilter, page]);

  const handleExportCSV = () => {
    const rows = farmers.map(f => ({
      Farmer_ID: f.farmerCode,
      Name: f.name,
      Father_Name: f.fatherName,
      Mobile: f.mobile,
      Village: f.village,
      District: f.district,
      Bank_Name: f.bankAccount?.bankName || 'N/A',
      Account_Masked: f.bankAccount?.accountNumberMasked || 'N/A',
      IFSC: f.bankAccount?.ifsc || 'N/A',
      Verification_Status: f.bankAccount?.verificationStatus || 'Missing',
    }));
    exportToCSV('Farmers_Master_Directory', rows);
  };

  return (
    <div className="space-y-4">
      {/* Search & Top Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Prominent Search Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search farmer by name, mobile, Farmer ID, village, bank, or account..."
              className="block w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 bg-slate-50/50 hover:bg-white transition"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenAddFarmer}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-xs transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add Farmer</span>
            </button>
            <button
              onClick={onOpenBulkImport}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              title="Bulk import farmers from CSV"
            >
              <FileUp className="w-4 h-4" />
              <span className="hidden sm:inline">Import CSV</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              title="Download filtered farmers as CSV"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Chips Bar */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-600 font-semibold mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Filter:
            </span>
            <button
              onClick={() => {
                setStatusFilter('');
                setPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                statusFilter === ''
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Farmers ({totalCount})
            </button>
            <button
              onClick={() => {
                setStatusFilter('verified');
                setPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                statusFilter === 'verified'
                  ? 'bg-emerald-800 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              Bank Verified
            </button>
            <button
              onClick={() => {
                setStatusFilter('pending');
                setPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                statusFilter === 'pending'
                  ? 'bg-amber-800 text-white shadow-2xs'
                  : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              Verification Pending
            </button>
            <button
              onClick={() => {
                setStatusFilter('missing');
                setPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                statusFilter === 'missing'
                  ? 'bg-red-800 text-white shadow-2xs'
                  : 'bg-red-50 text-red-900 hover:bg-red-100'
              }`}
            >
              Missing Bank Details
            </button>
          </div>

          <div className="text-xs text-slate-600">
            Showing Page {page} of {totalPages} ({totalCount} total)
          </div>
        </div>
      </div>

      {/* Farmers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-800 mx-auto mb-2" />
            <p className="text-xs text-slate-600">Loading farmer directory...</p>
          </div>
        ) : farmers.length === 0 ? (
          <div className="py-16 text-center">
            <UserPlus className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800">No farmers found</h4>
            <p className="text-xs text-slate-600 mt-1">Try adjusting your search criteria or add a new farmer.</p>
            <button
              onClick={onOpenAddFarmer}
              className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg inline-flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add New Farmer Profile</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3.5">Farmer ID &amp; Name</th>
                  <th className="px-4 py-3.5">Mobile &amp; Village</th>
                  <th className="px-4 py-3.5">Bank Details</th>
                  <th className="px-4 py-3.5">Verification</th>
                  <th className="px-4 py-3.5">Passbook</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {farmers.map(farmer => {
                  const bank = farmer.bankAccount;
                  const isVerified = bank?.verificationStatus === 'verified';
                  const isPending = bank?.verificationStatus === 'pending';
                  const hasPassbook = Boolean(farmer.passbookDoc);

                  return (
                    <tr key={farmer.id} className="hover:bg-slate-50/80 transition">
                      {/* Farmer ID & Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-900 font-bold flex items-center justify-center shrink-0 border border-emerald-200">
                            {farmer.name.slice(0, 1)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[11px] font-bold text-emerald-800">
                                {farmer.farmerCode}
                              </span>
                            </div>
                            <div className="font-bold text-slate-900 text-sm">{farmer.name}</div>
                            <div className="text-[11px] text-slate-600">S/o {farmer.fatherName}</div>
                          </div>
                        </div>
                      </td>

                      {/* Mobile & Village */}
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 font-mono text-slate-800 font-semibold">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{farmer.mobile}</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-600 text-[11px]">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{farmer.village}, {farmer.tehsil}</span>
                          </div>
                        </div>
                      </td>

                      {/* Bank Details */}
                      <td className="px-4 py-3">
                        {bank ? (
                          <div>
                            <div className="font-semibold text-slate-900">{bank.bankName}</div>
                            <div className="font-mono text-slate-700 text-[11px]">
                              A/C: {bank.accountNumberMasked}
                            </div>
                            <div className="font-mono text-[10px] text-slate-600">
                              IFSC: {bank.ifsc}
                            </div>
                          </div>
                        ) : (
                          <span className="text-red-700 font-medium">Bank details missing</span>
                        )}
                      </td>

                      {/* Verification Status */}
                      <td className="px-4 py-3">
                        {isVerified ? (
                          <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Verified</span>
                          </div>
                        ) : isPending ? (
                          <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Pending</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                            <span>Not Provided</span>
                          </div>
                        )}
                      </td>

                      {/* Passbook Doc */}
                      <td className="px-4 py-3">
                        {hasPassbook ? (
                          <button
                            onClick={() => onSelectFarmer(farmer.id)}
                            className="text-[11px] font-medium text-emerald-800 hover:text-emerald-950 underline flex items-center gap-1"
                          >
                            <span>Passbook attached</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-600">No Photo</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => onSelectFarmer(farmer.id)}
                            className="p-1.5 text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
                            title="View Full Profile & Bank Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onOpenMakePayment(farmer)}
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                            title="Record RTGS / Bank Payment"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onOpenQRModal(farmer)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                            title="Farmer QR Code"
                          >
                            <QrCode className="w-4 h-4" />
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

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50 text-xs">
            <span className="text-slate-600">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
