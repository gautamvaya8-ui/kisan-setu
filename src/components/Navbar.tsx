import React, { useState } from 'react';
import {
  Wheat,
  Building2,
  Users,
  CreditCard,
  FileSpreadsheet,
  ShieldAlert,
  LogOut,
  Bell,
  QrCode,
  Layers,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type { User, Firm } from '../types';

interface NavbarProps {
  user: User;
  currentFirm: Firm | null;
  allFirms: Firm[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSelectFirm: (firmId: string) => void;
  onLogout: () => void;
  pendingVerificationCount: number;
  onOpenFarmerPortalPreview: () => void;
  onOpenFirmQRPoster: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  currentFirm,
  allFirms,
  activeTab,
  setActiveTab,
  onSelectFirm,
  onLogout,
  pendingVerificationCount,
  onOpenFarmerPortalPreview,
  onOpenFirmQRPoster,
}) => {
  const [showFirmMenu, setShowFirmMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const isDev = user.role === 'developer';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs no-print">
      {/* Top Brand Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Firm Context */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
              <div className="w-10 h-10 rounded-xl bg-emerald-800 text-amber-300 flex items-center justify-center shadow-sm">
                <Wheat className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-slate-900 tracking-tight">KisanSetu</span>
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-sm">
                    Mandi RTGS
                  </span>
                </div>
                <p className="text-xs text-slate-700 hidden sm:block">Grain Mandi Farmer Bank &amp; Payment System</p>
              </div>
            </div>

            {/* Firm Selector / Badge */}
            {currentFirm && (
              <div className="relative ml-2 sm:ml-4 pl-3 sm:pl-5 border-l border-slate-200">
                {isDev ? (
                  <div className="relative">
                    <button
                      onClick={() => setShowFirmMenu(!showFirmMenu)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 transition text-left"
                    >
                      <Building2 className="w-4 h-4 text-emerald-700" />
                      <div>
                        <div className="text-xs font-semibold text-slate-900 line-clamp-1">{currentFirm.firmName}</div>
                        <div className="text-[10px] text-slate-700">Developer Firm Switcher</div>
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-700 ml-1" />
                    </button>

                    {showFirmMenu && (
                      <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                        <div className="px-3 py-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                          Select Mandi Firm
                        </div>
                        {allFirms.map(f => (
                          <button
                            key={f.id}
                            onClick={() => {
                              onSelectFirm(f.id);
                              setShowFirmMenu(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 ${
                              f.id === currentFirm.id ? 'bg-emerald-50 text-emerald-900 font-medium' : 'text-slate-700'
                            }`}
                          >
                            <span className="line-clamp-1">{f.firmName}</span>
                            {f.id === currentFirm.id && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-900 line-clamp-1">{currentFirm.firmName}</div>
                      <div className="text-[10px] text-slate-700">
                        License: {currentFirm.mandiLicenseNumber || 'APMC-Registered'} · {currentFirm.ownerName}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Firm Public QR Poster Button */}
            {currentFirm && (
              <button
                onClick={onOpenFirmQRPoster}
                title="Print Mandi Shop QR Poster for Farmers"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-950 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-300 transition"
              >
                <QrCode className="w-3.5 h-3.5 text-amber-700" />
                <span className="hidden sm:inline">Firm QR Poster</span>
              </button>
            )}

            {/* Farmer Self-Service Portal Preview Button */}
            <button
              onClick={onOpenFarmerPortalPreview}
              title="Test the Farmer Self-Service QR Scan page"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Farmer Portal</span>
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {pendingVerificationCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-amber-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                    {pendingVerificationCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-900">Mandi Alerts</span>
                    <span className="text-[11px] text-slate-700">{pendingVerificationCount} pending</span>
                  </div>
                  <div className="mt-3 space-y-2 text-xs">
                    {pendingVerificationCount > 0 ? (
                      <div
                        onClick={() => {
                          setActiveTab('farmers');
                          setShowNotifications(false);
                        }}
                        className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 cursor-pointer hover:bg-amber-100 transition"
                      >
                        <div className="flex items-center gap-2 text-amber-900 font-medium">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span>Bank Verification Pending</span>
                        </div>
                        <p className="text-[11px] text-amber-800 mt-1">
                          {pendingVerificationCount} farmer(s) have unverified bank details or newly uploaded passbooks.
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 text-center text-slate-700">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                        All farmer bank accounts are verified and up to date.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Pill & Logout */}
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
              <div className="hidden md:block text-right">
                <div className="text-xs font-bold text-slate-900">{user.name}</div>
                <div className="text-[10px] text-slate-700 capitalize font-medium">
                  {user.role === 'developer' ? 'Super Admin / Developer' : 'Firm Admin'}
                </div>
              </div>
              <button
                onClick={onLogout}
                className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <nav className="flex space-x-1 sm:space-x-4 border-t border-slate-100 py-1.5 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-md transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'dashboard'
                ? 'bg-emerald-800 text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab('farmers')}
            className={`px-3 py-1.5 rounded-md transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'farmers'
                ? 'bg-emerald-800 text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Farmer Master
            {pendingVerificationCount > 0 && (
              <span className="ml-1 bg-amber-400 text-slate-950 font-bold px-1.5 py-0.2 rounded-full text-[10px]">
                {pendingVerificationCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`px-3 py-1.5 rounded-md transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'payments'
                ? 'bg-emerald-800 text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            RTGS &amp; Payments
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 rounded-md transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'reports'
                ? 'bg-emerald-800 text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Mandi Reports
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-md transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'bg-emerald-800 text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Audit Logs
          </button>

          {isDev && (
            <button
              onClick={() => setActiveTab('developer')}
              className={`px-3 py-1.5 rounded-md transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'developer'
                  ? 'bg-purple-800 text-white font-semibold'
                  : 'text-purple-700 hover:text-purple-900 hover:bg-purple-50'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Developer Panel
            </button>
          )}
        </nav>
      </div>
    </header>
  );
};
