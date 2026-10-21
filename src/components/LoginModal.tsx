import React, { useState } from 'react';
import { Wheat, Lock, User, AlertCircle, ShieldCheck, KeyRound, Building2, QrCode } from 'lucide-react';
import { api } from '../api';
import type { User as UserType } from '../types';

interface LoginModalProps {
  onLoginSuccess: (user: UserType) => void;
  onOpenFarmerPortal: () => void;
  onOpenFirmRegister: (firmId: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess, onOpenFarmerPortal, onOpenFirmRegister }) => {
  const [username, setUsername] = useState('admin_kota');
  const [password, setPassword] = useState('kisan@123');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [remainingMinutes, setRemainingMinutes] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await api.login(username, password);
      onLoginSuccess(res.user);
    } catch (err: any) {
      if (err.status === 429) {
        setIsLocked(true);
        setRemainingMinutes(err.data?.remainingMinutes || 60);
        setErrorMessage('Too many failed attempts. Please try again after 1 hour.');
      } else {
        setErrorMessage(err.message || 'Login failed. Please check credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Mandi Logo */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-800 text-amber-300 flex items-center justify-center shadow-lg border border-emerald-700">
          <Wheat className="w-10 h-10" />
        </div>
        <h2 className="mt-4 text-center text-2xl font-extrabold text-white tracking-tight">
          KisanSetu Mandi System
        </h2>
        <p className="mt-1 text-center text-xs text-slate-300">
          Grain Trading RTGS &amp; Verified Farmer Bank Transfer Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-200">
          {/* Lockout Warning */}
          {isLocked && (
            <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-300 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-red-900">Security Lockdown Active</h4>
                <p className="text-xs text-red-700 mt-1">
                  Too many failed attempts. Please try again after 1 hour ({remainingMinutes} mins remaining).
                </p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && !isLocked && (
            <div className="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-300 flex items-center gap-2.5 text-xs text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Username or Mandi Email</label>
              <div className="mt-1 relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  disabled={isLocked || isLoading}
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. admin_kota or developer"
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Password</label>
              <div className="mt-1 relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  disabled={isLocked || isLoading}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLocked || isLoading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-xs text-sm font-semibold text-white bg-emerald-800 hover:bg-emerald-900 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-emerald-700 disabled:opacity-50 transition"
              >
                {isLoading ? 'Verifying Credentials...' : 'Sign In to Mandi Dashboard'}
              </button>
            </div>
          </form>

          {/* Quick-Fill Demo Logins for Testing */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5" />
                1-Click Demo Accounts
              </span>
            </div>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => fillCredentials('admin_kota', 'kisan@123')}
                className="w-full text-left p-2 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition text-xs flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-slate-800">Firm A: Kisan Krishi Traders (Kota)</div>
                  <div className="text-[10px] text-slate-500 font-mono">admin_kota / kisan@123</div>
                </div>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">Select</span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('admin_indore', 'annadata@123')}
                className="w-full text-left p-2 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition text-xs flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-slate-800">Firm B: Annadata Grain Merchants (Indore)</div>
                  <div className="text-[10px] text-slate-500 font-mono">admin_indore / annadata@123</div>
                </div>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">Select</span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('developer', 'dev@admin2026')}
                className="w-full text-left p-2 rounded-lg border border-purple-200 bg-purple-50/50 hover:bg-purple-100 transition text-xs flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-purple-900">Developer / Super Admin</div>
                  <div className="text-[10px] text-purple-700 font-mono">developer / dev@admin2026</div>
                </div>
                <span className="text-[10px] bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded font-mono">Super</span>
              </button>
            </div>
          </div>

          {/* Farmer Self-Service QR Access Links */}
          <div className="mt-5 pt-4 border-t border-slate-200 space-y-2 text-center">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Farmer Direct QR Scan Test
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => onOpenFirmRegister('firm_kota_01')}
                className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition"
                title="Scan Firm A's Counter QR Code"
              >
                <QrCode className="w-3.5 h-3.5 text-emerald-700" />
                <span>Firm A (Kota) QR</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenFirmRegister('firm_indore_02')}
                className="flex-1 py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition"
                title="Scan Firm B's Counter QR Code"
              >
                <QrCode className="w-3.5 h-3.5 text-amber-700" />
                <span>Firm B (Indore) QR</span>
              </button>
            </div>
            <div>
              <button
                type="button"
                onClick={onOpenFarmerPortal}
                className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 font-medium mt-1"
              >
                <span>Or Enter Individual Farmer QR Token</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
