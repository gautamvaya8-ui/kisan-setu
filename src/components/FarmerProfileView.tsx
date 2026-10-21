import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Camera,
  Eye,
  Trash2,
  Sparkles,
  Send,
  QrCode,
  Printer,
  Download,
  Building2,
  RefreshCw,
  Phone,
  MapPin,
  FileText,
  Clock,
  ShieldCheck,
  Edit,
  Save,
  X,
  CreditCard,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react';
import QRCode from 'qrcode';
import type { Farmer, BankAccount, DocumentRecord, Purchase, Payment, VerificationStatus } from '../types';
import { api } from '../api';
import { formatCurrencyINR, formatDate, formatDateTime } from '../utils';

interface FarmerProfileViewProps {
  farmerId: string;
  onBack: () => void;
  onOpenMakePayment: (farmer: Farmer) => void;
  onPrintPaymentSlip: (payment: Payment, farmer: Farmer) => void;
  onOpenFarmerPortalWithToken: (token: string) => void;
}

export const FarmerProfileView: React.FC<FarmerProfileViewProps> = ({
  farmerId,
  onBack,
  onOpenMakePayment,
  onPrintPaymentSlip,
  onOpenFarmerPortalWithToken,
}) => {
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'bank' | 'purchases' | 'payments' | 'qr'>('bank');

  // Bank Form State
  const [bankName, setBankName] = useState('');
  const [branch, setBranch] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [accountType, setAccountType] = useState<'Savings' | 'Current' | 'KCC'>('Savings');
  const [savingBank, setSavingBank] = useState(false);
  const [bankSuccessMsg, setBankSuccessMsg] = useState<string | null>(null);

  // Passbook Upload & OCR
  const [uploadingPassbook, setUploadingPassbook] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<{
    accountHolderName?: string;
    accountNumber?: string;
    bankName?: string;
    ifscCode?: string;
    branch?: string;
    confidence?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // QR Code Data URL
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Add Purchase Modal State
  const [showAddPurchaseModal, setShowAddPurchaseModal] = useState(false);
  const [billNumber, setBillNumber] = useState('');
  const [cropName, setCropName] = useState('Wheat (Sharbati)');
  const [quantityQuintals, setQuantityQuintals] = useState('');
  const [ratePerQuintal, setRatePerQuintal] = useState('');
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [savingPurchase, setSavingPurchase] = useState(false);

  const fetchFarmerData = async () => {
    setLoading(true);
    try {
      const [f, purList, payList] = await Promise.all([
        api.getFarmerById(farmerId),
        api.getPurchases(farmerId),
        api.getPayments({ farmerId, limit: 100 }),
      ]);
      setFarmer(f);
      setPurchases(purList);
      setPayments(payList.payments);

      if (f.bankAccount) {
        setBankName(f.bankAccount.bankName || '');
        setBranch(f.bankAccount.branch || '');
        setAccountHolderName(f.bankAccount.accountHolderName || f.name);
        setAccountNumber(f.bankAccount.accountNumber || '');
        setIfsc(f.bankAccount.ifsc || '');
        setAccountType(f.bankAccount.accountType || 'Savings');
      } else {
        setAccountHolderName(f.name);
      }

      // Generate QR Code
      if (f.qrToken) {
        const portalUrl = `${window.location.origin}/?farmerToken=${encodeURIComponent(f.qrToken)}`;
        const qrUrl = await QRCode.toDataURL(portalUrl, {
          width: 320,
          margin: 2,
          color: {
            dark: '#064e3b',
            light: '#ffffff',
          },
        });
        setQrCodeDataUrl(qrUrl);
      }
    } catch (err) {
      console.error('Failed to load farmer details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarmerData();
  }, [farmerId]);

  // Save Bank Details
  const handleSaveBankDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmer) return;
    setSavingBank(true);
    setBankSuccessMsg(null);

    try {
      const updatedBank = await api.saveBankDetails(farmer.id, {
        bankName,
        branch,
        accountHolderName,
        accountNumber,
        ifsc,
        accountType,
      });
      setFarmer(prev => (prev ? { ...prev, bankAccount: updatedBank } : null));
      setBankSuccessMsg('Bank details saved successfully. Please verify against the passbook image.');
      setTimeout(() => setBankSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to save bank details');
    } finally {
      setSavingBank(false);
    }
  };

  // Verify Bank Details
  const handleVerifyBank = async (status: VerificationStatus) => {
    if (!farmer) return;
    try {
      const updatedBank = await api.verifyBankDetails(
        farmer.id,
        status,
        status === 'verified' ? 'Verified by Mandi Admin against Passbook' : 'Rejected by Mandi Admin'
      );
      setFarmer(prev => (prev ? { ...prev, bankAccount: updatedBank } : null));
      setBankSuccessMsg(
        status === 'verified'
          ? '✓ Bank Details successfully verified!'
          : 'Bank details marked as rejected.'
      );
      setTimeout(() => setBankSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update verification status');
    }
  };

  // Passbook File Upload
  const handlePassbookFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !farmer) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      setUploadingPassbook(true);
      try {
        const doc = await api.uploadPassbook(farmer.id, {
          fileDataUrl: base64Data,
          mimeType: file.type || 'image/jpeg',
          title: `Passbook - ${farmer.name}`,
        });
        setFarmer(prev => (prev ? { ...prev, passbookDoc: doc } : null));
        setBankSuccessMsg('Passbook photo uploaded successfully!');
        setTimeout(() => setBankSuccessMsg(null), 4000);
      } catch (err: any) {
        alert(err.message || 'Failed to upload passbook');
      } finally {
        setUploadingPassbook(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Analyze with Gemini AI OCR
  const handleAnalyzeOCR = async () => {
    if (!farmer?.passbookDoc?.fileDataUrl) {
      alert('Please upload a passbook image first.');
      return;
    }

    setOcrLoading(true);
    setOcrResult(null);

    try {
      const detected = await api.analyzePassbookOCR(farmer.passbookDoc.fileDataUrl);
      setOcrResult(detected);
    } catch (err: any) {
      alert(err.message || 'OCR extraction failed');
    } finally {
      setOcrLoading(false);
    }
  };

  // Apply OCR to Form
  const handleApplyOCRToForm = () => {
    if (!ocrResult) return;
    if (ocrResult.accountHolderName) setAccountHolderName(ocrResult.accountHolderName);
    if (ocrResult.accountNumber) setAccountNumber(ocrResult.accountNumber);
    if (ocrResult.bankName) setBankName(ocrResult.bankName);
    if (ocrResult.ifscCode) setIfsc(ocrResult.ifscCode);
    if (ocrResult.branch) setBranch(ocrResult.branch);
    setBankSuccessMsg('OCR detected data copied to form. Please review and click "Save Bank Details".');
    setTimeout(() => setBankSuccessMsg(null), 4000);
  };

  // Delete Passbook
  const handleDeletePassbook = async () => {
    if (!farmer?.passbookDoc) return;
    if (!confirm('Are you sure you want to delete this passbook image?')) return;

    try {
      await api.deleteDocument(farmer.passbookDoc.id);
      setFarmer(prev => (prev ? { ...prev, passbookDoc: undefined } : null));
      setOcrResult(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete passbook');
    }
  };

  // Regenerate Farmer QR Token
  const handleRegenerateQR = async () => {
    if (!farmer) return;
    if (!confirm('Regenerate QR token? Older printed QR cards will no longer be valid.')) return;

    try {
      const res = await api.regenerateFarmerQR(farmer.id);
      const portalUrl = `${window.location.origin}/?farmerToken=${encodeURIComponent(res.qrToken)}`;
      const qrUrl = await QRCode.toDataURL(portalUrl, {
        width: 320,
        margin: 2,
        color: { dark: '#064e3b', light: '#ffffff' },
      });
      setQrCodeDataUrl(qrUrl);
      setFarmer(prev => (prev ? { ...prev, qrToken: res.qrToken } : null));
      alert('New secure QR token generated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to regenerate QR token');
    }
  };

  // Record Purchase / Mandi Bill
  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmer) return;
    setSavingPurchase(true);

    try {
      const newPur = await api.createPurchase({
        farmerId: farmer.id,
        billNumber,
        cropName,
        quantityQuintals: parseFloat(quantityQuintals),
        ratePerQuintal: parseFloat(ratePerQuintal),
        date: new Date().toISOString().split('T')[0],
        notes: purchaseNotes,
      });
      setPurchases(prev => [newPur, ...prev]);
      setShowAddPurchaseModal(false);
      setBillNumber('');
      setQuantityQuintals('');
      setRatePerQuintal('');
      setPurchaseNotes('');
      alert(`Mandi Bill #${newPur.billNumber} recorded for ₹${newPur.totalAmount.toLocaleString('en-IN')}`);
    } catch (err: any) {
      alert(err.message || 'Failed to record purchase');
    } finally {
      setSavingPurchase(false);
    }
  };

  if (loading || !farmer) {
    return (
      <div className="py-20 text-center">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-800 mx-auto mb-2" />
        <p className="text-xs text-slate-600">Loading farmer profile &amp; bank ledger...</p>
      </div>
    );
  }

  const isVerified = farmer.bankAccount?.verificationStatus === 'verified';
  const isPending = farmer.bankAccount?.verificationStatus === 'pending';
  const hasPassbook = Boolean(farmer.passbookDoc);

  return (
    <div className="space-y-6">
      {/* Back Button & Farmer Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-900 mb-4 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Farmer Directory</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-900 font-extrabold text-2xl flex items-center justify-center shrink-0 border-2 border-emerald-300 shadow-xs">
              {farmer.name.slice(0, 1)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-sm">
                  {farmer.farmerCode}
                </span>
                {isVerified ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified Bank Details
                  </span>
                ) : isPending ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Bank Verification Pending
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-red-800 bg-red-100 px-2.5 py-0.5 rounded-full">
                    No Bank Details
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-black text-slate-900 mt-1">{farmer.name}</h1>
              <div className="text-xs text-slate-600 mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>
                  Father: <strong>{farmer.fatherName}</strong>
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="w-3 h-3 text-slate-400" />
                  {farmer.mobile}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {farmer.village}, Tehsil {farmer.tehsil}, {farmer.district} ({farmer.state})
                </span>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onOpenMakePayment(farmer)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-xs transition"
            >
              <Send className="w-4 h-4" />
              <span>Make RTGS Payment</span>
            </button>
            <button
              onClick={() => setActiveTab('qr')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              <QrCode className="w-4 h-4" />
              <span>Farmer QR</span>
            </button>
            <button
              onClick={() => setShowAddPurchaseModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>+ Record Bill</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="mt-6 border-t border-slate-100 pt-3 flex space-x-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('bank')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'bank'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Bank Details &amp; Passbook Verification</span>
          </button>

          <button
            onClick={() => setActiveTab('purchases')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'purchases'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Mandi Bills &amp; Purchases ({purchases.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'payments'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>RTGS Payment Ledger ({payments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('qr')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'qr'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Farmer QR &amp; Self-Service</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {bankSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{bankSuccessMsg}</span>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 1: BANK DETAILS & PASSBOOK COMPARISON WORKFLOW  */}
      {/* ==================================================== */}
      {activeTab === 'bank' && (
        <div className="space-y-6">
          {/* Prominent Verification Action Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">Bank Verification Status</h3>
                {isVerified ? (
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Verified
                  </span>
                ) : (
                  <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Pending Verification
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {isVerified
                  ? `Verified by ${farmer.bankAccount?.verifiedBy || 'Mandi Admin'} on ${formatDateTime(
                      farmer.bankAccount?.verifiedAt || ''
                    )}`
                  : 'Compare the passbook image on the right with the digital bank account details on the left before verifying.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleVerifyBank('verified')}
                className="px-5 py-2.5 text-xs font-black text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-xs transition flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>VERIFY BANK DETAILS</span>
              </button>
              {isVerified && (
                <button
                  onClick={() => handleVerifyBank('pending')}
                  className="px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Mark Unverified
                </button>
              )}
            </div>
          </div>

          {/* Comparative Screen: Profile Bank Info (Left) + Passbook Image (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left: Bank Details Form */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-800" />
                  <h3 className="text-sm font-bold text-slate-900">Farmer Bank Account Details</h3>
                </div>
                {farmer.bankAccount?.accountNumberMasked && (
                  <span className="font-mono text-xs text-slate-500">
                    Display Masked: {farmer.bankAccount.accountNumberMasked}
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveBankDetails} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Bank Name *</label>
                  <input
                    type="text"
                    required
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    placeholder="e.g. State Bank of India, Bank of Baroda, PNB"
                    className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Account Holder Name *</label>
                  <input
                    type="text"
                    required
                    value={accountHolderName}
                    onChange={e => setAccountHolderName(e.target.value)}
                    placeholder="Exact name as printed in passbook"
                    className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
                  />
                  <span className="text-[10px] text-slate-500">Farmer registered name: {farmer.name}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Account Number *</label>
                    <input
                      type="text"
                      required
                      value={accountNumber}
                      onChange={e => setAccountNumber(e.target.value.replace(/\s+/g, ''))}
                      placeholder="e.g. 38192048123"
                      className="mt-1 block w-full px-3 py-2 text-sm font-mono font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">IFSC Code (11 Digits) *</label>
                    <input
                      type="text"
                      required
                      value={ifsc}
                      onChange={e => setIfsc(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                      placeholder="e.g. SBIN0031245"
                      maxLength={11}
                      className="mt-1 block w-full px-3 py-2 text-sm font-mono font-bold uppercase border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Branch Name</label>
                    <input
                      type="text"
                      value={branch}
                      onChange={e => setBranch(e.target.value)}
                      placeholder="e.g. Sangod Agricultural Branch"
                      className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Account Type</label>
                    <select
                      value={accountType}
                      onChange={e => setAccountType(e.target.value as any)}
                      className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 bg-white"
                    >
                      <option value="Savings">Savings Account</option>
                      <option value="Current">Current Account</option>
                      <option value="KCC">Kisan Credit Card (KCC)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Saving new bank details will reset verification to Pending.
                  </span>
                  <button
                    type="submit"
                    disabled={savingBank}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingBank ? 'Saving...' : 'Save Bank Details'}</span>
                  </button>
                </div>
              </form>

              {/* OCR Comparative Detection Box if run */}
              {ocrResult && (
                <div className="mt-4 p-4 rounded-xl bg-blue-50/80 border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      Gemini OCR Detected Information
                    </span>
                    <span className="text-[10px] bg-blue-200 text-blue-800 font-bold px-1.5 py-0.5 rounded uppercase">
                      Confidence: {ocrResult.confidence || 'Medium'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-700 font-mono">
                    <div className="flex justify-between py-0.5 border-b border-blue-100">
                      <span className="text-slate-500">Detected Name:</span>
                      <strong className="text-slate-900">{ocrResult.accountHolderName || 'N/A'}</strong>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-blue-100">
                      <span className="text-slate-500">Detected A/C Number:</span>
                      <strong className="text-slate-900">{ocrResult.accountNumber || 'N/A'}</strong>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-blue-100">
                      <span className="text-slate-500">Detected IFSC:</span>
                      <strong className="text-slate-900">{ocrResult.ifscCode || 'N/A'}</strong>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-500">Detected Bank:</span>
                      <strong className="text-slate-900">{ocrResult.bankName || 'N/A'}</strong>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-blue-200 flex items-center justify-between">
                    <span className="text-[10px] text-blue-700">
                      Manual confirmation required. Check photo before copying.
                    </span>
                    <button
                      type="button"
                      onClick={handleApplyOCRToForm}
                      className="px-3 py-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                    >
                      Copy Detected Info to Form
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Passbook Photo Viewer & Upload */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-800" />
                  <h3 className="text-sm font-bold text-slate-900">Passbook Document / Photo</h3>
                </div>
                <div className="flex items-center gap-2">
                  {hasPassbook && (
                    <button
                      onClick={handleAnalyzeOCR}
                      disabled={ocrLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition"
                      title="Inspect passbook image with AI to detect account number, IFSC, and name"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{ocrLoading ? 'Analyzing...' : 'Scan with AI OCR'}</span>
                    </button>
                  )}
                </div>
              </div>

              {hasPassbook && farmer.passbookDoc ? (
                <div className="space-y-3">
                  {/* Large Passbook Preview */}
                  <div className="relative rounded-xl overflow-hidden border border-slate-300 bg-slate-900 shadow-inner group">
                    <img
                      src={farmer.passbookDoc.fileDataUrl}
                      alt="Passbook"
                      className="w-full h-72 object-contain bg-slate-950/70"
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-xs p-1 rounded-lg">
                      <a
                        href={farmer.passbookDoc.fileDataUrl}
                        download={`passbook_${farmer.farmerCode}.png`}
                        className="p-1.5 text-white hover:text-emerald-400 transition"
                        title="Download image"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <button
                        onClick={handleDeletePassbook}
                        className="p-1.5 text-white hover:text-red-400 transition"
                        title="Delete Document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Document Meta */}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Uploaded on: {formatDateTime(farmer.passbookDoc.uploadedAt)}</span>
                    <span>By: {farmer.passbookDoc.uploadedBy}</span>
                  </div>

                  {/* Replace Photo Button */}
                  <div className="pt-2 flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*,application/pdf"
                      onChange={handlePassbookFileChange}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPassbook}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition inline-flex items-center gap-1.5"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{uploadingPassbook ? 'Uploading...' : 'Replace Passbook Photo'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center bg-slate-50/50">
                  <Camera className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-800">No Passbook Photo Uploaded Yet</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Upload a clear photo of the first page of the farmer's passbook or bank statement to compare with
                    their bank details.
                  </p>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*,application/pdf"
                    onChange={handlePassbookFileChange}
                    className="hidden"
                  />

                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPassbook}
                      className="px-4 py-2.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl inline-flex items-center gap-1.5 shadow-xs transition"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{uploadingPassbook ? 'Uploading...' : 'Upload Passbook Photo'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-3">
                    Alternatively, the farmer can scan their QR code to upload it directly from their mobile phone!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: PURCHASES / MANDI BILLS CONNECTION            */}
      {/* ==================================================== */}
      {activeTab === 'purchases' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Mandi Purchases &amp; Bills Trail</h3>
              <p className="text-xs text-slate-500">
                Connected agricultural commodity records for {farmer.name}. Connect bills to RTGS payments.
              </p>
            </div>
            <button
              onClick={() => setShowAddPurchaseModal(true)}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl transition inline-flex items-center gap-1.5"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>+ Record Mandi Purchase</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {purchases.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No grain purchases recorded for this farmer yet.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Bill # / Date</th>
                    <th className="px-4 py-3">Crop / Lot</th>
                    <th className="px-4 py-3">Quantity (Qtls)</th>
                    <th className="px-4 py-3">Rate / Qtl</th>
                    <th className="px-4 py-3">Total Payable</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {purchases.map(pur => (
                    <tr key={pur.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-slate-900">{pur.billNumber}</div>
                        <div className="text-[11px] text-slate-500">{formatDate(pur.date)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{pur.cropName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{pur.lotNumber}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{pur.quantityQuintals} Qtls</td>
                      <td className="px-4 py-3 font-mono text-slate-700">₹{pur.ratePerQuintal} / qtl</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{formatCurrencyINR(pur.totalAmount)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => onOpenMakePayment(farmer)}
                          className="px-3 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                        >
                          Pay RTGS
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: RTGS PAYMENT LEDGER                           */}
      {/* ==================================================== */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">RTGS &amp; Bank Transfer Ledger</h3>
              <p className="text-xs text-slate-500">
                Payment history for {farmer.name}. Bank account ending: {farmer.bankAccount?.accountNumberMasked}
              </p>
            </div>
            <button
              onClick={() => onOpenMakePayment(farmer)}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl transition inline-flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              <span>+ Make New Payment</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {payments.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">No payments created for this farmer yet.</div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Payment ID / Date</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Bank &amp; Account</th>
                    <th className="px-4 py-3">UTR / Reference</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Payment Slip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {payments.map(pay => (
                    <tr key={pay.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-slate-900">{pay.paymentCode}</div>
                        <div className="text-[11px] text-slate-500">{formatDate(pay.paymentDate)}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{pay.paymentMethod}</td>
                      <td className="px-4 py-3">
                        <div className="text-slate-800">{pay.bankName}</div>
                        <div className="font-mono text-[10px] text-slate-500">A/C: {pay.accountNumberMasked}</div>
                      </td>
                      <td className="px-4 py-3">
                        {pay.transactionReference ? (
                          <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                            {pay.transactionReference}
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-600 font-medium">Pending UTR</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 text-sm">{formatCurrencyINR(pay.amount)}</td>
                      <td className="px-4 py-3">
                        {pay.paymentStatus === 'Completed' ? (
                          <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                            Completed ✓
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                            {pay.paymentStatus}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => onPrintPaymentSlip(pay, farmer)}
                          className="px-3 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition inline-flex items-center gap-1"
                          title="Print RTGS Mandi Payment Slip"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Slip</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 4: FARMER UNIQUE QR CODE & SELF-SERVICE          */}
      {/* ==================================================== */}
      {activeTab === 'qr' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs max-w-2xl mx-auto text-center space-y-6">
          <div>
            <div className="w-12 h-12 bg-emerald-100 text-emerald-900 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900">Farmer Digital Identity &amp; Self-Service QR</h3>
            <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
              Eliminates the WhatsApp problem. Print this QR code on the farmer's bill or give them a laminated card.
              The farmer scans this QR to submit passbook photos securely without manual employee WhatsApp searches.
            </p>
          </div>

          {/* Rendered QR Code */}
          <div className="bg-white p-6 rounded-2xl border-2 border-emerald-800 inline-block shadow-md">
            {qrCodeDataUrl ? (
              <img src={qrCodeDataUrl} alt={`QR for ${farmer.name}`} className="w-64 h-64 mx-auto" />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center bg-slate-100">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-800" />
              </div>
            )}
            <div className="mt-3">
              <div className="font-bold text-slate-900 text-sm">{farmer.name}</div>
              <div className="font-mono text-xs text-emerald-800 font-bold">{farmer.farmerCode}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{farmer.village} · Mandi Verified</div>
            </div>
          </div>

          {/* Security Note */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-left text-xs text-emerald-900 flex items-start gap-2 max-w-md mx-auto">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <strong>Bank Security Guard:</strong> This QR code does NOT expose bank account details publicly. When
              scanned, the farmer must verify their registered mobile number before submitting passbook photos.
            </div>
          </div>

          {/* QR Action Buttons */}
          <div className="flex flex-wrap justify-center items-center gap-2 pt-2">
            <a
              href={qrCodeDataUrl}
              download={`Farmer_QR_${farmer.farmerCode}_${farmer.name}.png`}
              className="px-4 py-2.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl inline-flex items-center gap-1.5 transition"
            >
              <Download className="w-4 h-4" />
              <span>Download QR Image</span>
            </a>
            <button
              onClick={() => onOpenFarmerPortalWithToken(farmer.qrToken)}
              className="px-4 py-2.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl inline-flex items-center gap-1.5 transition"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Test Farmer Self-Service Portal</span>
            </button>
            <button
              onClick={handleRegenerateQR}
              className="px-3.5 py-2.5 text-xs font-semibold text-slate-500 hover:text-red-600 rounded-xl transition"
            >
              Regenerate Token
            </button>
          </div>
        </div>
      )}

      {/* Record Mandi Bill / Purchase Modal */}
      {showAddPurchaseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Record Grain Purchase / Bill</h3>
              <button onClick={() => setShowAddPurchaseModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Mandi Bill / Parchee Number *</label>
                <input
                  type="text"
                  required
                  value={billNumber}
                  onChange={e => setBillNumber(e.target.value)}
                  placeholder="e.g. BILL-26-904"
                  className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Crop / Commodity Name *</label>
                <select
                  value={cropName}
                  onChange={e => setCropName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 bg-white"
                >
                  <option value="Wheat (Sharbati)">Wheat (Sharbati)</option>
                  <option value="Wheat (Mill Quality)">Wheat (Mill Quality)</option>
                  <option value="Soybean (Yellow)">Soybean (Yellow)</option>
                  <option value="Mustard (Bold)">Mustard (Bold)</option>
                  <option value="Gram / Chana">Gram / Chana</option>
                  <option value="Paddy (1121 / Basmati)">Paddy (1121 / Basmati)</option>
                  <option value="Coriander / Dhaniya">Coriander / Dhaniya</option>
                  <option value="Maize / Makka">Maize / Makka</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Quantity (Quintals) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={quantityQuintals}
                    onChange={e => setQuantityQuintals(e.target.value)}
                    placeholder="e.g. 54.5"
                    className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Rate (₹ per Quintal) *</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={ratePerQuintal}
                    onChange={e => setRatePerQuintal(e.target.value)}
                    placeholder="e.g. 2450"
                    className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
              </div>

              {quantityQuintals && ratePerQuintal && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                  <span className="text-xs text-emerald-900 font-semibold">Total Payable:</span>
                  <span className="text-base font-black text-emerald-900">
                    {formatCurrencyINR(parseFloat(quantityQuintals) * parseFloat(ratePerQuintal))}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700">Notes (Optional)</label>
                <input
                  type="text"
                  value={purchaseNotes}
                  onChange={e => setPurchaseNotes(e.target.value)}
                  placeholder="e.g. Moisture 11%, Weighing scale 2"
                  className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPurchaseModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPurchase}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-xs transition"
                >
                  {savingPurchase ? 'Saving...' : 'Save Mandi Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
