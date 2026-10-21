import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Users,
  CreditCard,
  KeyRound,
  QrCode,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Edit,
  ExternalLink,
  X,
  Lock,
} from 'lucide-react';
import QRCode from 'qrcode';
import type { Firm, AuditLog } from '../types';
import { api } from '../api';
import { formatDate, formatDateTime } from '../utils';
import { FirmQRPosterModal } from './FirmQRPosterModal';

interface DeveloperPanelViewProps {
  onSwitchToFirm: (firmId: string) => void;
}

export const DeveloperPanelView: React.FC<DeveloperPanelViewProps> = ({ onSwitchToFirm }) => {
  const [stats, setStats] = useState<{
    totalFirms: number;
    activeFirms: number;
    totalFarmers: number;
    totalPayments: number;
    firmsSummary: Firm[];
    recentAuditLogs: AuditLog[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Add Firm Modal
  const [showAddFirmModal, setShowAddFirmModal] = useState(false);
  const [firmName, setFirmName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [mandiLicenseNumber, setMandiLicenseNumber] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [savingFirm, setSavingFirm] = useState(false);
  const [addFirmError, setAddFirmError] = useState<string | null>(null);

  // Reset Admin Password Modal
  const [resetModalFirm, setResetModalFirm] = useState<Firm | null>(null);
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Admin Access QR Code Modal
  const [qrModalFirm, setQrModalFirm] = useState<Firm | null>(null);
  const [adminQrDataUrl, setAdminQrDataUrl] = useState<string>('');

  // Firm Farmer Passbook Poster Modal
  const [farmerPosterFirm, setFarmerPosterFirm] = useState<Firm | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await api.getDeveloperStats();
      setStats(res);
    } catch (err) {
      console.error('Failed to load developer stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleCreateFirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddFirmError(null);
    setSavingFirm(true);

    try {
      await api.createFirm({
        firmName,
        ownerName,
        mobile,
        email,
        address,
        gstNumber,
        mandiLicenseNumber,
        adminUsername,
        adminPassword,
        adminName: ownerName,
      });

      setShowAddFirmModal(false);
      setFirmName('');
      setOwnerName('');
      setMobile('');
      setEmail('');
      setAddress('');
      setGstNumber('');
      setMandiLicenseNumber('');
      setAdminUsername('');
      setAdminPassword('');
      alert('New Mandi Firm & Admin account provisioned successfully!');
      fetchStats();
    } catch (err: any) {
      setAddFirmError(err.message || 'Failed to create firm');
    } finally {
      setSavingFirm(false);
    }
  };

  const handleToggleFirmStatus = async (firm: Firm) => {
    const newStatus = firm.status === 'active' ? 'inactive' : 'active';
    try {
      await api.updateFirm(firm.id, { status: newStatus });
      fetchStats();
    } catch (err: any) {
      alert(err.message || 'Failed to update firm status');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalFirm) return;
    setSavingPassword(true);

    try {
      await api.resetFirmAdminPassword(resetModalFirm.id, newAdminPassword);
      setResetModalFirm(null);
      setNewAdminPassword('');
      alert(`Admin password for ${resetModalFirm.firmName} has been reset successfully.`);
      fetchStats();
    } catch (err: any) {
      alert(err.message || 'Failed to reset admin password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleShowAdminQR = async (firm: Firm) => {
    setQrModalFirm(firm);
    // Link to firm direct login access (without passwords)
    const directLoginUrl = `${window.location.origin}/?firm=${encodeURIComponent(firm.id)}`;
    const qrUrl = await QRCode.toDataURL(directLoginUrl, {
      width: 280,
      margin: 2,
      color: { dark: '#1e1b4b', light: '#ffffff' },
    });
    setAdminQrDataUrl(qrUrl);
  };

  if (loading || !stats) {
    return (
      <div className="py-20 text-center">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-700 mx-auto mb-2" />
        <p className="text-xs text-slate-500">Loading Developer Multi-Tenant Management...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Developer Header Banner */}
      <div className="bg-gradient-to-r from-purple-950 to-indigo-950 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-purple-500 text-white font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Developer Super Admin Console
            </span>
            <span className="text-xs text-purple-200">Multi-Shop Multi-Tenant Architecture</span>
          </div>
          <h1 className="text-2xl font-black mt-1">Mandi Firm Fleet Management</h1>
          <p className="text-xs text-purple-200 mt-0.5">
            Manage grain trading firms, provision admin accounts, enforce data isolation, and review global audit logs.
          </p>
        </div>

        <button
          onClick={() => setShowAddFirmModal(true)}
          className="px-4 py-2.5 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-xs transition inline-flex items-center gap-1.5 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Provision New Firm / Shop</span>
        </button>
      </div>

      {/* Global Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Firms</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.totalFirms}</div>
          <div className="text-[10px] text-slate-500 mt-1">{stats.activeFirms} Active shops</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Mandi Farmers</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.totalFarmers}</div>
          <div className="text-[10px] text-slate-500 mt-1">Across all grain firms</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Payment Records</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.totalPayments}</div>
          <div className="text-[10px] text-slate-500 mt-1">RTGS / NEFT transfers</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Security Isolation</div>
          <div className="text-sm font-bold text-emerald-700 mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>Strict Tenant Isolation</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Firm A cannot access Firm B</div>
        </div>
      </div>

      {/* Firms List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-700" />
            <h3 className="text-sm font-bold text-slate-900">Registered Mandi Shops &amp; Firms</h3>
          </div>
          <button onClick={fetchStats} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Firm Name &amp; Owner</th>
                <th className="px-4 py-3">Mandi Location</th>
                <th className="px-4 py-3">Admin Account</th>
                <th className="px-4 py-3">Farmers</th>
                <th className="px-4 py-3">Payments</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {stats.firmsSummary.map(firm => (
                <tr key={firm.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900 text-sm">{firm.firmName}</div>
                    <div className="text-slate-500 text-[11px]">
                      Owner: {firm.ownerName} · Mob: {firm.mobile}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    <div>{firm.address}</div>
                    <div className="font-mono text-[10px] text-slate-400">
                      Lic: {firm.mandiLicenseNumber || 'APMC'} · GST: {firm.gstNumber || 'N/A'}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-mono font-bold text-slate-800">{firm.adminUsername}</div>
                    <div className="text-[10px] text-slate-500">Pass: [Hashed PBKDF2]</div>
                  </td>

                  <td className="px-4 py-3 font-bold text-slate-800">{firm.farmersCount}</td>
                  <td className="px-4 py-3 font-bold text-slate-800">{firm.paymentsCount}</td>

                  <td className="px-4 py-3">
                    {firm.status === 'active' ? (
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded-full">
                        Disabled
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => onSwitchToFirm(firm.id)}
                        className="px-2.5 py-1 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition"
                        title="Open this firm's workspace"
                      >
                        Enter Shop
                      </button>
                      <button
                        onClick={() => setFarmerPosterFirm(firm)}
                        className="px-2 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                        title="Farmer Passbook Upload QR Poster for this Firm"
                      >
                        Farmer QR
                      </button>
                      <button
                        onClick={() => handleShowAdminQR(firm)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                        title="Admin Access QR"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setResetModalFirm(firm);
                          setNewAdminPassword('');
                        }}
                        className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                        title="Reset Admin Password"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleFirmStatus(firm)}
                        className={`p-1.5 rounded-lg transition ${
                          firm.status === 'active'
                            ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                            : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={firm.status === 'active' ? 'Disable Firm' : 'Enable Firm'}
                      >
                        {firm.status === 'active' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision New Firm Modal */}
      {showAddFirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Provision New Grain Firm &amp; Admin</h3>
              <button onClick={() => setShowAddFirmModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {addFirmError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-900 text-xs font-semibold rounded-xl">
                {addFirmError}
              </div>
            )}

            <form onSubmit={handleCreateFirm} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Firm / Business Name *</label>
                <input
                  type="text"
                  required
                  value={firmName}
                  onChange={e => setFirmName(e.target.value)}
                  placeholder="e.g. Balaji Grain Traders"
                  className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Owner Name *</label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={e => setOwnerName(e.target.value)}
                    placeholder="e.g. Suresh Agrawal"
                    className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={mobile}
                    onChange={e => setMobile(e.target.value)}
                    placeholder="10-digit mobile"
                    className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Firm Address *</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="e.g. Shop 22, Mandi Yard, Kota (Raj.)"
                  className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Mandi License #</label>
                  <input
                    type="text"
                    value={mandiLicenseNumber}
                    onChange={e => setMandiLicenseNumber(e.target.value)}
                    placeholder="e.g. APMC-KT-9921"
                    className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">GST Number</label>
                  <input
                    type="text"
                    value={gstNumber}
                    onChange={e => setGstNumber(e.target.value)}
                    placeholder="e.g. 08AAACK1234F1Z5"
                    className="mt-1 block w-full px-3 py-2 text-sm uppercase border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-700"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                  Admin Login Credentials
                </span>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Admin Username *</label>
                    <input
                      type="text"
                      required
                      value={adminUsername}
                      onChange={e => setAdminUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                      placeholder="e.g. admin_balaji"
                      className="mt-1 block w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Admin Password *</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={adminPassword}
                      onChange={e => setAdminPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-700"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddFirmModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingFirm}
                  className="px-4 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-lg shadow-xs"
                >
                  {savingFirm ? 'Provisioning...' : 'Provision Firm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModalFirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Reset Firm Admin Password</h3>
              <button onClick={() => setResetModalFirm(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Reset login password for admin of <strong>{resetModalFirm.firmName}</strong>. This will also clear any
              failed login lockouts.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">New Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newAdminPassword}
                  onChange={e => setNewAdminPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-700"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetModalFirm(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-lg shadow-xs"
                >
                  {savingPassword ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin QR Code Access Modal */}
      {qrModalFirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Admin Login Access QR</h3>
              <button onClick={() => setQrModalFirm(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl inline-block">
              {adminQrDataUrl && <img src={adminQrDataUrl} alt="Admin QR" className="w-48 h-48 mx-auto" />}
            </div>

            <div>
              <div className="font-bold text-slate-900 text-sm">{qrModalFirm.firmName}</div>
              <p className="text-[11px] text-slate-500 mt-1">
                Scanning this QR directly opens the firm's login portal. Passwords are never placed inside the QR code.
              </p>
            </div>

            <button
              onClick={() => setQrModalFirm(null)}
              className="w-full py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Firm Farmer Passbook Submission QR Poster */}
      {farmerPosterFirm && (
        <FirmQRPosterModal
          firm={farmerPosterFirm}
          onClose={() => setFarmerPosterFirm(null)}
          onOpenSelfRegisterPreview={firmId => {
            setFarmerPosterFirm(null);
            onSwitchToFirm(firmId);
          }}
        />
      )}
    </div>
  );
};
