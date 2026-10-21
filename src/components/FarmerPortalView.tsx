import React, { useState, useEffect, useRef } from 'react';
import {
  Wheat,
  QrCode,
  ShieldCheck,
  Phone,
  Upload,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Building2,
  ArrowRight,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { api } from '../api';

interface FarmerPortalViewProps {
  initialToken?: string;
  onExitPortal: () => void;
}

export const FarmerPortalView: React.FC<FarmerPortalViewProps> = ({
  initialToken,
  onExitPortal,
}) => {
  const [tokenInput, setTokenInput] = useState(initialToken || '');
  const [farmerPreview, setFarmerPreview] = useState<any | null>(null);
  const [firmName, setFirmName] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Verification step
  const [mobileInput, setMobileInput] = useState('');
  const [isVerifyingMobile, setIsVerifyingMobile] = useState(false);
  const [verifiedFarmer, setVerifiedFarmer] = useState<any | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Submission step
  const [passbookDataUrl, setPassbookDataUrl] = useState<string | null>(null);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // If initial token is provided, load preview
  useEffect(() => {
    if (initialToken) {
      loadTokenPreview(initialToken);
    }
  }, [initialToken]);

  const loadTokenPreview = async (tok: string) => {
    if (!tok.trim()) return;
    setLoadingPreview(true);
    setTokenError(null);
    try {
      const res = await api.getFarmerByQRToken(tok.trim());
      setFarmerPreview(res.farmer);
      setFirmName(res.firmName);
    } catch (err: any) {
      setTokenError(err.message || 'Invalid or expired QR code');
      setFarmerPreview(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleVerifyMobile = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError(null);
    setIsVerifyingMobile(true);

    try {
      const res = await api.verifyFarmerMobile(tokenInput.trim(), mobileInput.trim());
      setVerifiedFarmer(res.farmer);
      if (res.farmer.bankName) setBankName(res.farmer.bankName);
      if (res.farmer.ifsc) setIfsc(res.farmer.ifsc);
    } catch (err: any) {
      setVerifyError(err.message || 'Mobile verification failed');
    } finally {
      setIsVerifyingMobile(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPassbookDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitPassbook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passbookDataUrl) {
      alert('Please select or capture a passbook photo');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.submitFarmerPassbook(tokenInput.trim(), mobileInput.trim(), passbookDataUrl, {
        bankName,
        accountHolderName: verifiedFarmer.name,
        accountNumber,
        ifsc,
      });
      setSubmissionSuccess(res.message);
    } catch (err: any) {
      alert(err.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 py-8 px-4 flex flex-col justify-center">
      <div className="max-w-lg w-full mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Portal Header */}
        <div className="bg-emerald-900 text-white p-6 relative">
          <button
            onClick={onExitPortal}
            className="absolute top-4 right-4 text-xs font-semibold bg-emerald-800 hover:bg-emerald-700 text-emerald-100 px-3 py-1.5 rounded-lg transition"
          >
            ← Exit Portal
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-800 text-amber-300 flex items-center justify-center font-bold">
              <Wheat className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] bg-emerald-800 text-emerald-200 font-bold px-2 py-0.5 rounded-full uppercase">
                Farmer Self-Service Link
              </span>
              <h2 className="text-xl font-black mt-1">KisanSetu Mandi Portal</h2>
              <p className="text-xs text-emerald-200">
                {firmName || 'Grain Trading Merchant Passbook Submission'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* STEP 1: Enter / Confirm QR Token */}
          {!farmerPreview ? (
            <div className="space-y-4">
              <div className="text-center py-4">
                <QrCode className="w-12 h-12 text-emerald-800 mx-auto mb-2" />
                <h3 className="text-base font-bold text-slate-900">Scan or Enter Farmer QR Token</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  If you scanned a QR code from your grain purchase bill, the token will be loaded automatically.
                </p>
              </div>

              {tokenError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-900 text-xs font-semibold rounded-xl">
                  {tokenError}
                </div>
              )}

              <div className="space-y-3">
                <input
                  type="text"
                  value={tokenInput}
                  onChange={e => setTokenInput(e.target.value)}
                  placeholder="Paste QR Token (e.g. FQR_FRM-00001_...)"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700"
                />
                <button
                  onClick={() => loadTokenPreview(tokenInput)}
                  disabled={loadingPreview || !tokenInput.trim()}
                  className="w-full py-2.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-xs transition"
                >
                  {loadingPreview ? 'Verifying QR Token...' : 'Load Farmer Details'}
                </button>
              </div>

              {/* Sample QR token for quick test */}
              <div className="pt-4 border-t border-slate-100 text-center">
                <span className="text-[11px] text-slate-400 block mb-1">Testing Demo? Try Sample Farmer:</span>
                <button
                  type="button"
                  onClick={() => {
                    const sample = 'FQR_FRM-00001_sample';
                    setTokenInput(sample);
                    loadTokenPreview(sample);
                  }}
                  className="text-xs text-emerald-800 hover:underline font-semibold"
                >
                  Click to test with Gautam Patel / Rameshwar Meena
                </button>
              </div>
            </div>
          ) : !verifiedFarmer ? (
            /* STEP 2: Mobile Number Security Verification (Prevents private data exposure) */
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mandi Firm</span>
                <div className="text-sm font-bold text-slate-900">{firmName}</div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span>Farmer: <strong>{farmerPreview.name}</strong></span>
                  <span className="font-mono text-emerald-800 font-bold">{farmerPreview.farmerCode}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Village: {farmerPreview.village} · Registered Phone: {farmerPreview.mobile}
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Security Step:</strong> To safeguard your bank account details, please confirm your 10-digit
                  registered mobile number.
                </div>
              </div>

              {verifyError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-900 text-xs font-semibold rounded-xl">
                  {verifyError}
                </div>
              )}

              <form onSubmit={handleVerifyMobile} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Enter Your 10-Digit Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={mobileInput}
                    onChange={e => setMobileInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 9829112233"
                    className="mt-1 block w-full px-3 py-2.5 text-base font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700 text-center tracking-wider"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isVerifyingMobile || mobileInput.length < 10}
                  className="w-full py-2.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-xs transition"
                >
                  {isVerifyingMobile ? 'Verifying Identity...' : 'Confirm & Proceed'}
                </button>
              </form>
            </div>
          ) : submissionSuccess ? (
            /* STEP 4: Success Message */
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Passbook Submitted Successfully!</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                {submissionSuccess} Your document has been permanently linked to your Farmer profile [
                {verifiedFarmer.farmerCode}].
              </p>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs text-slate-700 max-w-sm mx-auto space-y-1">
                <div>• Mandi accountant will compare your passbook and verify bank details.</div>
                <div>• Your payments will be sent directly via RTGS / NEFT.</div>
                <div>• No need to send photos on WhatsApp anymore!</div>
              </div>
              <button
                onClick={onExitPortal}
                className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl transition"
              >
                Back to Mandi System
              </button>
            </div>
          ) : (
            /* STEP 3: Passbook Photo Upload & Bank Confirmation */
            <form onSubmit={handleSubmitPassbook} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Submit Your Bank Passbook</h3>
                  <p className="text-[11px] text-slate-500">
                    Welcome, <strong>{verifiedFarmer.name}</strong> ({verifiedFarmer.village})
                  </p>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  Identity Verified
                </span>
              </div>

              {/* Upload Passbook Box */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  1. Capture / Upload Passbook Photo *
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {passbookDataUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border border-emerald-500 bg-slate-900 p-2 text-center">
                    <img
                      src={passbookDataUrl}
                      alt="Passbook"
                      className="w-full h-48 object-contain bg-slate-950/70 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-2 text-xs text-emerald-400 hover:underline font-semibold"
                    >
                      Change Photo
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-emerald-300 hover:border-emerald-600 rounded-2xl p-6 text-center bg-emerald-50/40 cursor-pointer transition"
                  >
                    <Camera className="w-10 h-10 text-emerald-700 mx-auto mb-2" />
                    <div className="text-xs font-bold text-emerald-900">Take Photo or Choose from Phone</div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Ensure account number, IFSC code, and farmer name are clearly readable.
                    </div>
                  </div>
                )}
              </div>

              {/* Bank Details Inputs */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700">
                  2. Confirm Bank Account Details
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600">Bank Name</label>
                    <input
                      type="text"
                      required
                      value={bankName}
                      onChange={e => setBankName(e.target.value)}
                      placeholder="e.g. State Bank of India"
                      className="mt-1 block w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600">Account Number *</label>
                    <input
                      type="text"
                      required
                      value={accountNumber}
                      onChange={e => setAccountNumber(e.target.value.replace(/\s+/g, ''))}
                      placeholder="Enter full A/C number"
                      className="mt-1 block w-full px-3 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600">IFSC Code (11 Digits) *</label>
                  <input
                    type="text"
                    required
                    maxLength={11}
                    value={ifsc}
                    onChange={e => setIfsc(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                    placeholder="e.g. SBIN0031245"
                    className="mt-1 block w-full px-3 py-1.5 text-xs font-mono uppercase font-bold border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting || !passbookDataUrl || !accountNumber || !ifsc}
                  className="w-full py-3 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-xs disabled:opacity-50 transition"
                >
                  {isSubmitting ? 'Submitting to Mandi Shop...' : 'Submit Passbook for Verification'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
