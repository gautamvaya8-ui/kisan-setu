import React, { useState, useEffect } from 'react';
import { X, UserPlus, AlertTriangle, CheckCircle2, ShieldAlert, Upload, ExternalLink } from 'lucide-react';
import { api } from '../api';
import type { Farmer } from '../types';

interface AddFarmerModalProps {
  onClose: () => void;
  onSuccess: (farmer: Farmer) => void;
  onSelectExistingFarmer: (farmerId: string) => void;
}

export const AddFarmerModal: React.FC<AddFarmerModalProps> = ({
  onClose,
  onSuccess,
  onSelectExistingFarmer,
}) => {
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [mobile, setMobile] = useState('');
  const [alternateMobile, setAlternateMobile] = useState('');
  const [village, setVillage] = useState('');
  const [tehsil, setTehsil] = useState('');
  const [district, setDistrict] = useState('Kota');
  const [state, setState] = useState('Rajasthan');
  const [aadhaarLast4, setAadhaarLast4] = useState('');
  const [notes, setNotes] = useState('');

  // Bank fields
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [branch, setBranch] = useState('');

  // Passbook image upload
  const [passbookDataUrl, setPassbookDataUrl] = useState<string | null>(null);

  // Duplicate Check
  const [duplicateWarning, setDuplicateWarning] = useState<any[] | null>(null);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [ignoreDuplicateWarning, setIgnoreDuplicateWarning] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Duplicate check effect when mobile or name changes
  useEffect(() => {
    const cleanMob = mobile.replace(/\D/g, '');
    if (cleanMob.length >= 10 || (name.trim().length >= 3 && village.trim().length >= 3)) {
      const timer = setTimeout(async () => {
        setIsCheckingDuplicates(true);
        try {
          const res = await api.checkDuplicates({
            mobile: cleanMob,
            name,
            fatherName,
            village,
          });
          if (res.hasDuplicates) {
            setDuplicateWarning(res.duplicates);
          } else {
            setDuplicateWarning(null);
          }
        } catch {
          // Ignore duplicate check network error
        } finally {
          setIsCheckingDuplicates(false);
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setDuplicateWarning(null);
    }
  }, [mobile, name, fatherName, village]);

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPassbookDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (duplicateWarning && duplicateWarning.length > 0 && !ignoreDuplicateWarning) {
      setError('A possible duplicate farmer was found. Please inspect existing records or check "Create anyway".');
      return;
    }

    if (mobile.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (ifsc && ifsc.trim().length !== 11) {
      setError('IFSC code appears invalid. Must be an 11-digit alphanumeric code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newFarmer = await api.createFarmer({
        name,
        fatherName,
        mobile,
        alternateMobile,
        village,
        tehsil: tehsil || village,
        district,
        state,
        aadhaarLast4,
        notes,
        bankName,
        branch,
        accountHolderName: name,
        accountNumber,
        ifsc,
        passbookImageDataUrl: passbookDataUrl || undefined,
      });
      onSuccess(newFarmer);
    } catch (err: any) {
      setError(err.message || 'Failed to save farmer profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Add New Farmer Profile</h3>
              <p className="text-[11px] text-slate-500">Create permanent digital profile and attach verified bank account</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Duplicate Farmer Detection Warning Box */}
        {duplicateWarning && duplicateWarning.length > 0 && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-300">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-xs font-bold text-amber-900">Possible Existing Farmer Found!</h4>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  The system detected existing farmer records matching this mobile number or name in your Mandi shop.
                </p>

                <div className="mt-2 space-y-1.5">
                  {duplicateWarning.map(dupe => (
                    <div
                      key={dupe.id}
                      className="bg-white p-2 rounded-lg border border-amber-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-emerald-800 mr-2">{dupe.farmerCode}</span>
                        <strong>{dupe.name}</strong> (S/o {dupe.fatherName}) · {dupe.village} · Mob: {dupe.mobile}
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectExistingFarmer(dupe.id)}
                        className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded transition inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Use Existing</span>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="ignoreDupe"
                    checked={ignoreDuplicateWarning}
                    onChange={e => setIgnoreDuplicateWarning(e.target.checked)}
                    className="rounded text-emerald-800 focus:ring-emerald-700"
                  />
                  <label htmlFor="ignoreDupe" className="text-xs font-semibold text-amber-950">
                    Not the same person. Create a new profile anyway.
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
            <span>1. Personal Information</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Farmer Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Rameshwar Lal Meena"
                className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Father's Name *</label>
              <input
                type="text"
                required
                value={fatherName}
                onChange={e => setFatherName(e.target.value)}
                placeholder="e.g. Kishan Meena"
                className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Mobile Number (10 Digits) *</label>
              <input
                type="tel"
                required
                maxLength={10}
                value={mobile}
                onChange={e => setMobile(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 9829112233"
                className="mt-1 block w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Alternate Mobile (Optional)</label>
              <input
                type="tel"
                maxLength={10}
                value={alternateMobile}
                onChange={e => setAlternateMobile(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 9414022334"
                className="mt-1 block w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Village *</label>
              <input
                type="text"
                required
                value={village}
                onChange={e => setVillage(e.target.value)}
                placeholder="e.g. Sangod"
                className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Tehsil</label>
              <input
                type="text"
                value={tehsil}
                onChange={e => setTehsil(e.target.value)}
                placeholder="e.g. Sangod"
                className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">District / State</label>
              <input
                type="text"
                value={`${district}, ${state}`}
                onChange={e => setDistrict(e.target.value)}
                className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
              />
            </div>
          </div>

          {/* Bank Details Section */}
          <div className="pt-2 border-t border-slate-100">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-2">
              <span>2. Bank Account Details (for RTGS / NEFT)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  placeholder="e.g. State Bank of India"
                  className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Account Number</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value.replace(/\s+/g, ''))}
                  placeholder="Full account number"
                  className="mt-1 block w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">IFSC Code (11 Digits)</label>
                <input
                  type="text"
                  maxLength={11}
                  value={ifsc}
                  onChange={e => setIfsc(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                  placeholder="e.g. SBIN0031245"
                  className="mt-1 block w-full px-3 py-2 text-sm font-mono uppercase border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Branch Name</label>
                <input
                  type="text"
                  value={branch}
                  onChange={e => setBranch(e.target.value)}
                  placeholder="e.g. Mandi Branch"
                  className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
                />
              </div>
            </div>
          </div>

          {/* Passbook Photo Upload */}
          <div className="pt-2 border-t border-slate-100">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-2">
              <span>3. Passbook Photo / Document</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="file"
                id="modalPassbookFile"
                accept="image/*"
                onChange={handleImageFile}
                className="hidden"
              />
              <label
                htmlFor="modalPassbookFile"
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition inline-flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4" />
                <span>{passbookDataUrl ? 'Change Passbook Photo' : 'Select Passbook Image'}</span>
              </label>

              {passbookDataUrl && (
                <span className="text-xs text-emerald-800 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Photo Attached
                </span>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-xs transition"
            >
              {isSubmitting ? 'Creating Profile...' : 'Save Farmer Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
