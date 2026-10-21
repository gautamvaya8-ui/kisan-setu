import React, { useState, useEffect, useRef } from 'react';
import {
  Wheat,
  Building2,
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Phone,
  User,
  ShieldCheck,
  MapPin,
  ArrowLeft,
  FileCheck,
  RefreshCw,
} from 'lucide-react';
import { api } from '../api';
import type { Firm, Farmer } from '../types';

interface FirmFarmerRegisterViewProps {
  firmId: string;
  onExit: () => void;
}

export const FirmFarmerRegisterView: React.FC<FirmFarmerRegisterViewProps> = ({ firmId, onExit }) => {
  const [firm, setFirm] = useState<Firm | null>(null);
  const [loadingFirm, setLoadingFirm] = useState(true);
  const [errorFirm, setErrorFirm] = useState<string | null>(null);

  // Farmer form state
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [mobile, setMobile] = useState('');
  const [village, setVillage] = useState('');
  const [tehsil, setTehsil] = useState('');

  // Passbook image state
  const [passbookDataUrl, setPassbookDataUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bank fields
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [branch, setBranch] = useState('');

  // OCR state
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrDetected, setOcrDetected] = useState<{
    accountHolderName?: string;
    accountNumber?: string;
    bankName?: string;
    ifscCode?: string;
    branch?: string;
  } | null>(null);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [registeredFarmer, setRegisteredFarmer] = useState<{
    farmer: Farmer;
    message: string;
    isExisting: boolean;
  } | null>(null);

  useEffect(() => {
    const fetchFirm = async () => {
      setLoadingFirm(true);
      setErrorFirm(null);
      try {
        const data = await api.getPublicFirmDetails(firmId);
        setFirm(data);
      } catch (err: any) {
        setErrorFirm(err.message || 'Mandi Firm not found. Please scan a valid Firm QR code.');
      } finally {
        setLoadingFirm(false);
      }
    };

    fetchFirm();
  }, [firmId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPassbookDataUrl(dataUrl);
      setOcrDetected(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRunOcr = async () => {
    if (!passbookDataUrl) return;
    setOcrLoading(true);
    try {
      const result = await api.analyzePassbookOCR(passbookDataUrl);
      setOcrDetected(result);

      // Auto-fill fields if currently empty
      if (result.bankName && !bankName) setBankName(result.bankName);
      if (result.accountNumber && !accountNumber) setAccountNumber(result.accountNumber);
      if (result.ifscCode && !ifsc) setIfsc(result.ifscCode);
      if (result.branch && !branch) setBranch(result.branch);
      if (result.accountHolderName && !name) setName(result.accountHolderName);
    } catch {
      // Ignore OCR errors
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (mobile.replace(/\D/g, '').length < 10) {
      setFormError('कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें (Please enter a valid 10-digit mobile number).');
      return;
    }

    if (!passbookDataUrl) {
      setFormError('कृपया बैंक पासबुक का स्पष्ट फोटो अपलोड करें (Please upload or take a photo of your bank passbook).');
      return;
    }

    if (ifsc && ifsc.trim().length !== 11) {
      setFormError('IFSC कोड 11 अक्षरों का होना चाहिए (e.g. SBIN0031245).');
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.submitFarmerRegistration(firmId, {
        name,
        fatherName,
        mobile,
        village,
        tehsil,
        passbookImageDataUrl: passbookDataUrl,
        bankName,
        branch,
        accountNumber,
        ifsc,
      });

      setRegisteredFarmer(result);
    } catch (err: any) {
      setFormError(err.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingFirm) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white px-4">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mb-2" />
        <h3 className="text-sm font-bold">लोड हो रहा है (Connecting to Mandi Shop)...</h3>
      </div>
    );
  }

  if (errorFirm || !firm) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4 text-center">
        <div className="bg-white p-6 rounded-2xl max-w-md w-full shadow-xl">
          <AlertTriangle className="w-10 h-10 text-amber-600 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-900">QR कोड अमान्य है (Invalid Firm QR)</h3>
          <p className="text-xs text-slate-600 mt-2">{errorFirm}</p>
          <button
            onClick={onExit}
            className="mt-5 w-full py-2.5 text-xs font-bold text-white bg-slate-900 rounded-xl"
          >
            वापस जाएं (Go Back)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-3 sm:px-6 flex flex-col justify-center">
      <div className="max-w-xl w-full mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
        {/* Mandi Firm Header Branding */}
        <div className="bg-emerald-950 text-white p-5 sm:p-6 relative">
          <button
            onClick={onExit}
            className="absolute top-4 right-4 text-xs font-semibold bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 px-3 py-1.5 rounded-lg transition flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Mandi Login</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-800 text-amber-300 flex items-center justify-center font-bold shrink-0">
              <Wheat className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Direct Firm Portal
              </span>
              <h2 className="text-lg sm:text-xl font-black mt-1 leading-tight">{firm.firmName}</h2>
              <p className="text-xs text-emerald-200 mt-0.5">
                संचालक (Owner): <strong>{firm.ownerName}</strong> · Mandi License: {firm.mandiLicenseNumber || 'APMC Registered'}
              </p>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-emerald-800/80 text-[11px] text-emerald-100 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>
              यह सुरक्षित पोर्टल केवल <strong>{firm.firmName}</strong> से जुड़ा है। आपके द्वारा अपलोड की गई जानकारी सीधे इसी दुकान में RTGS भुगतान के लिए दर्ज होगी।
            </span>
          </div>
        </div>

        <div className="p-5 sm:p-7">
          {/* SUCCESS SCREEN */}
          {registeredFarmer ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-slate-900">
                पासबुक सफलतापूर्वक दर्ज हो गई!
              </h3>
              <div className="font-mono text-sm font-bold text-emerald-800 bg-emerald-50 py-2 px-4 rounded-xl border border-emerald-200 inline-block">
                आपका किसान कोड: {registeredFarmer.farmer.farmerCode}
              </div>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                {registeredFarmer.message}
              </p>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left text-xs text-slate-700 space-y-1.5">
                <div className="font-bold text-slate-900 text-xs mb-1">अब आगे क्या होगा? (Next Steps):</div>
                <div>✓ मंडी मुनीम / एकाउंटेंट आपकी पासबुक से बैंक खाता नंबर व IFSC का मिलान करके इसे वेरीफाई करेंगे।</div>
                <div>✓ आपकी फसल की तुलाई के बाद भुगतान सीधे इसी बैंक खाते में RTGS / NEFT द्वारा भेज दिया जाएगा।</div>
                <div>✓ व्हाट्सएप पर फोटो ढूंढने या बार-बार पासबुक लाने की जरूरत नहीं है।</div>
              </div>

              <div className="pt-2">
                <button
                  onClick={onExit}
                  className="w-full py-3 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-xs transition"
                >
                  Mandi सॉफ्टवेयर पर वापस जाएं (Back to Mandi System)
                </button>
              </div>
            </div>
          ) : (
            /* SUBMISSION FORM */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-900">
                  किसान पंजीकरण व पासबुक अपलोड फॉर्म (Farmer Registration)
                </h3>
                <p className="text-[11px] text-slate-500">
                  RTGS बैंक ट्रांसफर के लिए अपनी जानकारी भरें और पासबुक का फोटो अपलोड करें।
                </p>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-900 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. Passbook Photo Upload (Prominent & Easy for Farmers) */}
              <div className="bg-emerald-50/50 p-4 rounded-2xl border-2 border-emerald-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-700" />
                    <span>1. पासबुक का स्पष्ट फोटो लें या अपलोड करें (Passbook Photo) *</span>
                  </label>
                  {passbookDataUrl && (
                    <button
                      type="button"
                      onClick={handleRunOcr}
                      disabled={ocrLoading}
                      className="text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded border border-purple-200 flex items-center gap-1 transition"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{ocrLoading ? 'जांच जारी...' : 'AI से विवरण निकालें'}</span>
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {passbookDataUrl ? (
                  <div className="space-y-2">
                    <div className="relative rounded-xl overflow-hidden border border-emerald-400 bg-slate-950">
                      <img
                        src={passbookDataUrl}
                        alt="Passbook Preview"
                        className="w-full h-44 object-contain bg-slate-950/70"
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-emerald-800 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> फोटो जुड़ गया (Photo Attached)
                      </span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-bold text-emerald-800 underline hover:text-emerald-950"
                      >
                        फोटो बदलें (Change Photo)
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-emerald-300 hover:border-emerald-600 rounded-xl p-5 text-center bg-white cursor-pointer transition"
                  >
                    <Camera className="w-8 h-8 text-emerald-700 mx-auto mb-1.5" />
                    <div className="text-xs font-bold text-emerald-900">
                      यहाँ क्लिक करके कैमरे से फोटो खींचें (Take Photo with Camera)
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      पासबुक के प्रथम पृष्ठ की साफ फोटो खींचें जिसमें नाम, खाता संख्या और IFSC दिखता हो।
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Personal Information */}
              <div className="space-y-3 pt-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  2. व्यक्तिगत जानकारी (Farmer Details)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">किसान का पूरा नाम (Full Name) *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. रामेश्वर लाल मीणा"
                      className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">पिता का नाम (Father's Name)</label>
                    <input
                      type="text"
                      value={fatherName}
                      onChange={e => setFatherName(e.target.value)}
                      placeholder="e.g. किशन मीणा"
                      className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      मोबाइल नंबर (10-Digit Mobile) *
                    </label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={mobile}
                      onChange={e => setMobile(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 9829112233"
                      className="mt-1 block w-full px-3 py-2 text-sm font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">गाँव / ग्राम (Village) *</label>
                    <input
                      type="text"
                      required
                      value={village}
                      onChange={e => setVillage(e.target.value)}
                      placeholder="e.g. सांगोद"
                      className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Bank Account Details */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  3. बैंक खाता विवरण (Bank Details for RTGS)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">बैंक का नाम (Bank Name)</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={e => setBankName(e.target.value)}
                      placeholder="e.g. State Bank of India, PNB, BOB"
                      className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">खाता संख्या (Account Number)</label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={e => setAccountNumber(e.target.value.replace(/\s+/g, ''))}
                      placeholder="पासबुक से देखकर लिखें"
                      className="mt-1 block w-full px-3 py-2 text-sm font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">IFSC कोड (11 Digits)</label>
                    <input
                      type="text"
                      maxLength={11}
                      value={ifsc}
                      onChange={e => setIfsc(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                      placeholder="e.g. SBIN0031245"
                      className="mt-1 block w-full px-3 py-2 text-sm font-mono uppercase font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">शाखा (Branch Name)</label>
                    <input
                      type="text"
                      value={branch}
                      onChange={e => setBranch(e.target.value)}
                      placeholder="e.g. Sangod Mandi Branch"
                      className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={submitting || !name || !mobile || !village || !passbookDataUrl}
                  className="w-full py-3.5 text-sm font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-2xl shadow-md disabled:opacity-50 transition"
                >
                  {submitting ? 'जमा हो रहा है (Submitting)...' : `दुकान '${firm.firmName}' को पासबुक भेजें`}
                </button>
                <p className="text-[11px] text-center text-slate-400 mt-2">
                  🔒 आपकी जानकारी केवल <strong>{firm.firmName}</strong> के अधिकृत खाते में सुरक्षित जमा होगी।
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
