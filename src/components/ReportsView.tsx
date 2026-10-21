import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Building2,
  RefreshCw,
  Search,
} from 'lucide-react';
import type { Farmer, Payment, Purchase, Firm } from '../types';
import { api } from '../api';
import { formatCurrencyINR, formatDate, exportToCSV } from '../utils';

interface ReportsViewProps {
  firm: Firm | null;
}

type ReportType =
  | 'farmer_master'
  | 'bank_details'
  | 'payment_report'
  | 'rtgs_report'
  | 'pending_payment'
  | 'daily_purchase'
  | 'monthly_payment'
  | 'farmer_transactions';

export const ReportsView: React.FC<ReportsViewProps> = ({ firm }) => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('farmer_master');
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterVillage, setFilterVillage] = useState('');
  const [filterBank, setFilterBank] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [resF, resP, resPur] = await Promise.all([
        api.getFarmers({ limit: 500 }),
        api.getPayments({ limit: 500 }),
        api.getPurchases(),
      ]);
      setFarmers(resF.farmers);
      setPayments(resP.payments);
      setPurchases(resPur);
    } catch (err) {
      console.error('Failed to load reports data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute reports
  const getFilteredData = () => {
    let rows: Record<string, any>[] = [];

    switch (selectedReport) {
      case 'farmer_master':
        rows = farmers.map(f => ({
          Farmer_Code: f.farmerCode,
          Name: f.name,
          Father_Name: f.fatherName,
          Mobile: f.mobile,
          Village: f.village,
          District: f.district,
          Bank_Name: f.bankAccount?.bankName || 'Missing',
          Account_Number: f.bankAccount?.accountNumberMasked || 'Missing',
          IFSC: f.bankAccount?.ifsc || 'Missing',
          Verification: f.bankAccount?.verificationStatus || 'Missing',
        }));
        break;

      case 'bank_details':
        rows = farmers
          .filter(f => f.bankAccount)
          .map(f => ({
            Farmer_Code: f.farmerCode,
            Farmer_Name: f.name,
            Bank_Name: f.bankAccount!.bankName,
            Branch: f.bankAccount!.branch,
            Account_Masked: f.bankAccount!.accountNumberMasked,
            IFSC: f.bankAccount!.ifsc,
            Account_Type: f.bankAccount!.accountType,
            Verification_Status: f.bankAccount!.verificationStatus,
            Verified_By: f.bankAccount!.verifiedBy || 'Pending',
          }));
        break;

      case 'payment_report':
        rows = payments.map(p => {
          const f = farmers.find(item => item.id === p.farmerId);
          return {
            Payment_Code: p.paymentCode,
            Date: p.paymentDate,
            Farmer_Code: f?.farmerCode || 'N/A',
            Farmer_Name: f?.name || 'N/A',
            Amount: p.amount,
            Method: p.paymentMethod,
            Bank: p.bankName,
            Account: p.accountNumberMasked,
            UTR: p.transactionReference || 'N/A',
            Status: p.paymentStatus,
          };
        });
        break;

      case 'rtgs_report':
        rows = payments
          .filter(p => p.paymentMethod === 'RTGS' || p.paymentMethod === 'NEFT')
          .map(p => {
            const f = farmers.find(item => item.id === p.farmerId);
            return {
              Payment_ID: p.paymentCode,
              Date: p.paymentDate,
              Farmer_Name: f?.name || 'N/A',
              Amount: p.amount,
              Bank_Name: p.bankName,
              Account: p.accountNumberMasked,
              IFSC: p.ifsc,
              UTR_Number: p.transactionReference || 'PENDING',
              Status: p.paymentStatus,
            };
          });
        break;

      case 'pending_payment':
        rows = payments
          .filter(p => p.paymentStatus === 'Pending' || p.paymentStatus === 'Processing')
          .map(p => {
            const f = farmers.find(item => item.id === p.farmerId);
            return {
              Payment_ID: p.paymentCode,
              Date: p.paymentDate,
              Farmer_Name: f?.name || 'N/A',
              Amount: p.amount,
              Bank_Name: p.bankName,
              Account: p.accountNumberMasked,
              IFSC: p.ifsc,
              Status: p.paymentStatus,
            };
          });
        break;

      case 'daily_purchase':
        rows = purchases.map(pur => {
          const f = farmers.find(item => item.id === pur.farmerId);
          return {
            Bill_Number: pur.billNumber,
            Date: pur.date,
            Farmer_Code: f?.farmerCode || 'N/A',
            Farmer_Name: f?.name || 'N/A',
            Commodity: pur.cropName,
            Quantity_Quintals: pur.quantityQuintals,
            Rate_Per_Qtl: pur.ratePerQuintal,
            Total_Payable: pur.totalAmount,
          };
        });
        break;

      case 'monthly_payment':
        rows = payments.map(p => ({
          Month: p.paymentDate.slice(0, 7),
          Payment_Code: p.paymentCode,
          Amount: p.amount,
          Method: p.paymentMethod,
          Status: p.paymentStatus,
        }));
        break;

      case 'farmer_transactions':
        rows = farmers.map(f => {
          const farmerPayments = payments.filter(p => p.farmerId === f.id && p.paymentStatus === 'Completed');
          const totalPaid = farmerPayments.reduce((sum, p) => sum + p.amount, 0);
          const farmerPurchases = purchases.filter(pur => pur.farmerId === f.id);
          const totalBilled = farmerPurchases.reduce((sum, pur) => sum + pur.totalAmount, 0);
          return {
            Farmer_Code: f.farmerCode,
            Name: f.name,
            Mobile: f.mobile,
            Village: f.village,
            Total_Billed_Produce: totalBilled,
            Total_RTGS_Paid: totalPaid,
            Balance_Pending: Math.max(0, totalBilled - totalPaid),
            Verification: f.bankAccount?.verificationStatus || 'Missing',
          };
        });
        break;
    }

    if (filterVillage) {
      rows = rows.filter(r => (r.Village || '').toLowerCase().includes(filterVillage.toLowerCase()));
    }
    if (filterBank) {
      rows = rows.filter(r => (r.Bank_Name || r.Bank || '').toLowerCase().includes(filterBank.toLowerCase()));
    }

    return rows;
  };

  const currentRows = getFilteredData();

  const handleExport = () => {
    exportToCSV(`Mandi_Report_${selectedReport}`, currentRows);
  };

  const handlePrint = () => {
    window.print();
  };

  const reportsList = [
    { id: 'farmer_master' as const, name: '1. Farmer Master Directory', desc: 'Complete farmer demographics & bank accounts' },
    { id: 'bank_details' as const, name: '2. Bank & Passbook Verification', desc: 'Account numbers, IFSC codes, & audit verification status' },
    { id: 'payment_report' as const, name: '3. All Payments Ledger', desc: 'Master register of all outward payments' },
    { id: 'rtgs_report' as const, name: '4. RTGS / NEFT Report', desc: 'Banking transfer report with UTR references' },
    { id: 'pending_payment' as const, name: '5. Pending Payment Report', desc: 'Transfers awaiting bank UTR confirmation' },
    { id: 'daily_purchase' as const, name: '6. Mandi Purchase & Bills', desc: 'Farmer bills, quantities (Qtls), and crop rates' },
    { id: 'monthly_payment' as const, name: '7. Monthly Payment Summary', desc: 'Monthly aggregated payout distribution' },
    { id: 'farmer_transactions' as const, name: '8. Farmer-Wise Settlement', desc: 'Total produce sold vs RTGS paid vs balance' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
              Financial &amp; APMC Audit Reports
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Mandi Reports &amp; Statements</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {firm?.firmName} · Export accurate bank transfer reports and agricultural purchase records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="px-4 py-2.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-xs transition inline-flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition inline-flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Reports Grid Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {reportsList.map(rep => (
          <button
            key={rep.id}
            onClick={() => setSelectedReport(rep.id)}
            className={`p-3 text-left rounded-xl border transition ${
              selectedReport === rep.id
                ? 'bg-emerald-900 text-white border-emerald-900 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-500 hover:bg-slate-50'
            }`}
          >
            <div className="font-bold text-xs">{rep.name}</div>
            <div
              className={`text-[10px] mt-0.5 line-clamp-1 ${
                selectedReport === rep.id ? 'text-emerald-200' : 'text-slate-400'
              }`}
            >
              {rep.desc}
            </div>
          </button>
        ))}
      </div>

      {/* Filter Options */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex flex-wrap items-center gap-3 text-xs">
        <span className="font-bold text-slate-600 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" />
          Report Filters:
        </span>
        <input
          type="text"
          value={filterVillage}
          onChange={e => setFilterVillage(e.target.value)}
          placeholder="Filter by Village..."
          className="px-2.5 py-1 border border-slate-300 rounded-lg text-xs"
        />
        <input
          type="text"
          value={filterBank}
          onChange={e => setFilterBank(e.target.value)}
          placeholder="Filter by Bank name..."
          className="px-2.5 py-1 border border-slate-300 rounded-lg text-xs"
        />
        {(filterVillage || filterBank) && (
          <button
            onClick={() => {
              setFilterVillage('');
              setFilterBank('');
            }}
            className="text-xs text-red-600 font-semibold"
          >
            Clear Filters
          </button>
        )}
        <div className="ml-auto text-slate-500 font-mono text-[11px]">{currentRows.length} Records in Statement</div>
      </div>

      {/* Report Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print-card">
        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-800 mx-auto mb-2" />
            <p className="text-xs text-slate-500">Generating report tables...</p>
          </div>
        ) : currentRows.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">No records found for the selected report filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  {Object.keys(currentRows[0]).map(col => (
                    <th key={col} className="px-3.5 py-3 whitespace-nowrap">
                      {col.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-mono">
                {currentRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    {Object.keys(row).map(key => (
                      <td key={key} className="px-3.5 py-2.5 whitespace-nowrap text-slate-800">
                        {typeof row[key] === 'number' && (key.includes('Amount') || key.includes('Paid') || key.includes('Total') || key.includes('Balance'))
                          ? formatCurrencyINR(row[key])
                          : String(row[key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
