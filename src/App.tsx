import React, { useState, useEffect } from 'react';
import { api, getAuthToken } from './api';
import type { User, Firm, Farmer, Payment, DashboardStats } from './types';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { DashboardView } from './components/DashboardView';
import { FarmerMasterView } from './components/FarmerMasterView';
import { FarmerProfileView } from './components/FarmerProfileView';
import { PaymentModuleView } from './components/PaymentModuleView';
import { PaymentSlipModal } from './components/PaymentSlipModal';
import { DeveloperPanelView } from './components/DeveloperPanelView';
import { ReportsView } from './components/ReportsView';
import { AuditLogsView } from './components/AuditLogsView';
import { AddFarmerModal } from './components/AddFarmerModal';
import { BulkImportModal } from './components/BulkImportModal';
import { FarmerPortalView } from './components/FarmerPortalView';
import { FirmFarmerRegisterView } from './components/FirmFarmerRegisterView';
import { FirmQRPosterModal } from './components/FirmQRPosterModal';
import { RefreshCw, Wheat } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentFirm, setCurrentFirm] = useState<Firm | null>(null);
  const [allFirms, setAllFirms] = useState<Firm[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Deep Link & Sub-views
  const [selectedFarmerId, setSelectedFarmerId] = useState<string | null>(null);
  const [showAddFarmerModal, setShowAddFarmerModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [showFirmQRPosterModal, setShowFirmQRPosterModal] = useState(false);
  const [activePaymentSlip, setActivePaymentSlip] = useState<{ payment: Payment; farmer?: Farmer } | null>(null);
  const [paymentPreselectedFarmer, setPaymentPreselectedFarmer] = useState<Farmer | null>(null);

  // Farmer Portal View (e.g. from farmer-specific QR scan)
  const [isFarmerPortalOpen, setIsFarmerPortalOpen] = useState(false);
  const [farmerPortalToken, setFarmerPortalToken] = useState<string>('');

  // Firm-Specific Registration View (e.g. from scanning Firm QR)
  const [firmRegisterId, setFirmRegisterId] = useState<string | null>(null);

  // Check URL query parameters on initial load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('farmerToken');
    const firmQr = urlParams.get('firmRegister') || urlParams.get('firmQr');
    if (token) {
      setFarmerPortalToken(token);
      setIsFarmerPortalOpen(true);
    } else if (firmQr) {
      setFirmRegisterId(firmQr);
    }
  }, []);

  // Initialize session
  useEffect(() => {
    const checkSession = async () => {
      const token = getAuthToken();
      if (!token) {
        setLoadingInitial(false);
        return;
      }

      try {
        const res = await api.getCurrentUser();
        setCurrentUser(res.user);
        await loadFirmAndStats(res.user.firmId);
      } catch (err) {
        console.warn('Session expired or invalid:', err);
        setCurrentUser(null);
      } finally {
        setLoadingInitial(false);
      }
    };

    checkSession();
  }, []);

  const loadFirmAndStats = async (firmId?: string | null) => {
    try {
      const firm = await api.getCurrentFirm(firmId || undefined);
      setCurrentFirm(firm);

      const [dashStats, devStats] = await Promise.all([
        api.getDashboardStats(firm.id),
        api.getDeveloperStats().catch(() => null),
      ]);
      setStats(dashStats);
      if (devStats?.firmsSummary) {
        setAllFirms(devStats.firmsSummary);
      } else {
        setAllFirms([firm]);
      }
    } catch (err) {
      console.error('Failed to load firm context:', err);
    }
  };

  const handleLoginSuccess = async (user: User) => {
    setCurrentUser(user);
    setLoadingInitial(true);
    try {
      await loadFirmAndStats(user.firmId);
      setActiveTab(user.role === 'developer' ? 'developer' : 'dashboard');
    } finally {
      setLoadingInitial(false);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setCurrentFirm(null);
    setStats(null);
    setSelectedFarmerId(null);
    setActiveTab('dashboard');
  };

  const handleSelectFirm = async (newFirmId: string) => {
    setLoadingInitial(true);
    try {
      await loadFirmAndStats(newFirmId);
      setSelectedFarmerId(null);
    } finally {
      setLoadingInitial(false);
    }
  };

  const refreshDashboardStats = async () => {
    if (!currentFirm) return;
    try {
      const s = await api.getDashboardStats(currentFirm.id);
      setStats(s);
    } catch (err) {
      console.error('Failed to refresh dashboard stats:', err);
    }
  };

  const handleDownloadBackup = async () => {
    if (!currentFirm) return;
    try {
      await api.downloadBackup(currentFirm.id);
    } catch (err: any) {
      alert(err.message || 'Backup failed');
    }
  };

  // If Farmer is registering directly via Firm QR code
  if (firmRegisterId) {
    return (
      <FirmFarmerRegisterView
        firmId={firmRegisterId}
        onExit={() => {
          setFirmRegisterId(null);
          if (window.location.search.includes('firmRegister') || window.location.search.includes('firmQr')) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }}
      />
    );
  }

  // If Farmer Portal is directly triggered by QR scan or preview button
  if (isFarmerPortalOpen) {
    return (
      <FarmerPortalView
        initialToken={farmerPortalToken}
        onExitPortal={() => {
          setIsFarmerPortalOpen(false);
          // Clean up URL if farmerToken was in query
          if (window.location.search.includes('farmerToken')) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }}
      />
    );
  }

  // Initial loader
  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-14 h-14 rounded-2xl bg-emerald-800 text-amber-300 flex items-center justify-center mb-4 border border-emerald-700 animate-pulse">
          <Wheat className="w-8 h-8" />
        </div>
        <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mb-2" />
        <h3 className="text-sm font-bold tracking-tight">KisanSetu Mandi RTGS System</h3>
        <p className="text-xs text-slate-400 mt-1">Authenticating secure mandi connection...</p>
      </div>
    );
  }

  // Not logged in -> Show secure Login Screen
  if (!currentUser) {
    return (
      <LoginModal
        onLoginSuccess={handleLoginSuccess}
        onOpenFarmerPortal={() => {
          setFarmerPortalToken('FQR_FRM-00001_sample');
          setIsFarmerPortalOpen(true);
        }}
        onOpenFirmRegister={(firmId) => {
          setFirmRegisterId(firmId);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Navigation Bar */}
      <Navbar
        user={currentUser}
        currentFirm={currentFirm}
        allFirms={allFirms}
        activeTab={activeTab}
        setActiveTab={tab => {
          setActiveTab(tab);
          setSelectedFarmerId(null);
        }}
        onSelectFirm={handleSelectFirm}
        onLogout={handleLogout}
        pendingVerificationCount={(stats?.bankPending || 0) + (stats?.bankMissing || 0)}
        onOpenFarmerPortalPreview={() => {
          setFarmerPortalToken('FQR_FRM-00001_sample');
          setIsFarmerPortalOpen(true);
        }}
        onOpenFirmQRPoster={() => setShowFirmQRPosterModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* If viewing a specific farmer profile */}
        {selectedFarmerId ? (
          <FarmerProfileView
            farmerId={selectedFarmerId}
            onBack={() => {
              setSelectedFarmerId(null);
              refreshDashboardStats();
            }}
            onOpenMakePayment={f => {
              setPaymentPreselectedFarmer(f);
              setActiveTab('payments');
            }}
            onPrintPaymentSlip={(pay, f) => {
              setActivePaymentSlip({ payment: pay, farmer: f });
            }}
            onOpenFarmerPortalWithToken={token => {
              setFarmerPortalToken(token);
              setIsFarmerPortalOpen(true);
            }}
          />
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardView
                stats={stats}
                firm={currentFirm}
                onNavigate={setActiveTab}
                onSelectFarmer={id => setSelectedFarmerId(id)}
                onOpenAddFarmer={() => setShowAddFarmerModal(true)}
                onOpenMakePayment={farmer => {
                  setPaymentPreselectedFarmer(farmer || null);
                  setActiveTab('payments');
                }}
                onOpenBulkImport={() => setShowBulkImportModal(true)}
                onDownloadBackup={handleDownloadBackup}
                onOpenFirmQRPoster={() => setShowFirmQRPosterModal(true)}
              />
            )}

            {activeTab === 'farmers' && (
              <FarmerMasterView
                onSelectFarmer={id => setSelectedFarmerId(id)}
                onOpenAddFarmer={() => setShowAddFarmerModal(true)}
                onOpenMakePayment={farmer => {
                  setPaymentPreselectedFarmer(farmer);
                  setActiveTab('payments');
                }}
                onOpenBulkImport={() => setShowBulkImportModal(true)}
                onOpenQRModal={farmer => {
                  setSelectedFarmerId(farmer.id);
                }}
              />
            )}

            {activeTab === 'payments' && (
              <PaymentModuleView
                firm={currentFirm}
                preSelectedFarmer={paymentPreselectedFarmer}
                onOpenPaymentSlip={(payment, farmer) => {
                  setActivePaymentSlip({ payment, farmer });
                }}
              />
            )}

            {activeTab === 'reports' && <ReportsView firm={currentFirm} />}

            {activeTab === 'audit' && <AuditLogsView currentUser={currentUser} />}

            {activeTab === 'developer' && currentUser.role === 'developer' && (
              <DeveloperPanelView
                onSwitchToFirm={firmId => {
                  handleSelectFirm(firmId);
                  setActiveTab('dashboard');
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Add Farmer Modal */}
      {showAddFarmerModal && (
        <AddFarmerModal
          onClose={() => setShowAddFarmerModal(false)}
          onSuccess={newFarmer => {
            setShowAddFarmerModal(false);
            setSelectedFarmerId(newFarmer.id);
            refreshDashboardStats();
          }}
          onSelectExistingFarmer={existingId => {
            setShowAddFarmerModal(false);
            setSelectedFarmerId(existingId);
          }}
        />
      )}

      {/* Bulk CSV Import Modal */}
      {showBulkImportModal && (
        <BulkImportModal
          onClose={() => setShowBulkImportModal(false)}
          onImportSuccess={count => {
            refreshDashboardStats();
            setActiveTab('farmers');
          }}
        />
      )}

      {/* Printable Payment Slip Modal */}
      {activePaymentSlip && (
        <PaymentSlipModal
          payment={activePaymentSlip.payment}
          farmer={activePaymentSlip.farmer}
          firm={currentFirm}
          onClose={() => setActivePaymentSlip(null)}
        />
      )}

      {/* Firm Counter QR Poster Modal */}
      {showFirmQRPosterModal && currentFirm && (
        <FirmQRPosterModal
          firm={currentFirm}
          onClose={() => setShowFirmQRPosterModal(false)}
          onOpenSelfRegisterPreview={fId => {
            setShowFirmQRPosterModal(false);
            setFirmRegisterId(fId);
          }}
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <Wheat className="w-4 h-4 text-emerald-800" />
            <span>KisanSetu Mandi Management Suite</span>
          </div>
          <div>Bank &amp; RTGS Compliance Engine · Zero WhatsApp Disorganization</div>
        </div>
      </footer>
    </div>
  );
}
