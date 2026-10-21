import type {
  User,
  Firm,
  Farmer,
  BankAccount,
  DocumentRecord,
  Purchase,
  Payment,
  AuditLog,
  DashboardStats,
  VerificationStatus,
  PaymentMethod,
  PaymentStatus,
} from './types';

const TOKEN_KEY = 'kisansetu_auth_token';

let currentAuthToken: string | null = null;
try {
  currentAuthToken = sessionStorage.getItem(TOKEN_KEY);
} catch {
  // Ignore in case sessionStorage is restricted
}

export function setAuthToken(token: string | null) {
  currentAuthToken = token;
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function getAuthToken(): string | null {
  return currentAuthToken;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (currentAuthToken) {
    headers.set('Authorization', `Bearer ${currentAuthToken}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg) as Error & { status?: number; data?: any };
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data as T;
}

export const api = {
  // Auth
  async login(username: string, password: string): Promise<{ token: string; user: User }> {
    const result = await request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setAuthToken(result.token);
    return result;
  },

  async logout(): Promise<void> {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } finally {
      setAuthToken(null);
    }
  },

  async getCurrentUser(): Promise<{ user: User }> {
    return request<{ user: User }>('/api/auth/me');
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return request('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  // Developer Endpoints
  async getDeveloperStats(): Promise<{
    totalFirms: number;
    activeFirms: number;
    totalFarmers: number;
    totalPayments: number;
    firmsSummary: Firm[];
    recentAuditLogs: AuditLog[];
  }> {
    return request('/api/developer/stats');
  },

  async createFirm(firmData: {
    firmName: string;
    ownerName: string;
    mobile: string;
    email?: string;
    address: string;
    gstNumber?: string;
    mandiLicenseNumber?: string;
    adminUsername: string;
    adminPassword: string;
    adminName?: string;
  }): Promise<{ firm: Firm; admin: { id: string; username: string; name: string } }> {
    return request('/api/developer/firms', {
      method: 'POST',
      body: JSON.stringify(firmData),
    });
  },

  async updateFirm(firmId: string, updates: Partial<Firm>): Promise<{ success: boolean; firm: Firm }> {
    return request(`/api/developer/firms/${firmId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async resetFirmAdminPassword(firmId: string, newPassword: string): Promise<{ message: string }> {
    return request(`/api/developer/firms/${firmId}/reset-admin-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  },

  // Firm Admin Endpoints
  async getCurrentFirm(firmId?: string): Promise<Firm> {
    const url = firmId ? `/api/firms/current?firmId=${firmId}` : '/api/firms/current';
    return request(url);
  },

  async getDashboardStats(firmId?: string): Promise<DashboardStats> {
    const url = firmId ? `/api/dashboard/stats?firmId=${firmId}` : '/api/dashboard/stats';
    return request(url);
  },

  async getFarmers(params?: {
    search?: string;
    verificationStatus?: string;
    village?: string;
    page?: number;
    limit?: number;
    firmId?: string;
  }): Promise<{ farmers: Farmer[]; total: number; page: number; limit: number; totalPages: number }> {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.verificationStatus) q.set('verificationStatus', params.verificationStatus);
    if (params?.village) q.set('village', params.village);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.firmId) q.set('firmId', params.firmId);

    return request(`/api/farmers?${q.toString()}`);
  },

  async getFarmerById(id: string, firmId?: string): Promise<Farmer> {
    const url = firmId ? `/api/farmers/${id}?firmId=${firmId}` : `/api/farmers/${id}`;
    return request(url);
  },

  async checkDuplicates(params: {
    mobile?: string;
    name?: string;
    fatherName?: string;
    village?: string;
    firmId?: string;
  }): Promise<{ hasDuplicates: boolean; count: number; duplicates: any[] }> {
    return request('/api/farmers/check-duplicates', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async createFarmer(farmerData: any, firmId?: string): Promise<Farmer> {
    const url = firmId ? `/api/farmers?firmId=${firmId}` : '/api/farmers';
    return request(url, {
      method: 'POST',
      body: JSON.stringify(farmerData),
    });
  },

  async updateFarmer(id: string, updates: Partial<Farmer>, firmId?: string): Promise<Farmer> {
    const url = firmId ? `/api/farmers/${id}?firmId=${firmId}` : `/api/farmers/${id}`;
    return request(url, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async saveBankDetails(farmerId: string, bankData: {
    bankName: string;
    branch?: string;
    accountHolderName: string;
    accountNumber: string;
    ifsc: string;
    accountType?: 'Savings' | 'Current' | 'KCC';
  }, firmId?: string): Promise<BankAccount> {
    const url = firmId ? `/api/farmers/${farmerId}/bank-details?firmId=${firmId}` : `/api/farmers/${farmerId}/bank-details`;
    return request(url, {
      method: 'POST',
      body: JSON.stringify(bankData),
    });
  },

  async verifyBankDetails(farmerId: string, status: VerificationStatus, notes?: string, firmId?: string): Promise<BankAccount> {
    const url = firmId ? `/api/farmers/${farmerId}/verify-bank?firmId=${firmId}` : `/api/farmers/${farmerId}/verify-bank`;
    return request(url, {
      method: 'POST',
      body: JSON.stringify({ status, notes }),
    });
  },

  async uploadPassbook(farmerId: string, passbookData: {
    fileDataUrl: string;
    mimeType?: string;
    title?: string;
    ocrExtractedData?: any;
  }, firmId?: string): Promise<DocumentRecord> {
    const url = firmId ? `/api/farmers/${farmerId}/passbook?firmId=${firmId}` : `/api/farmers/${farmerId}/passbook`;
    return request(url, {
      method: 'POST',
      body: JSON.stringify(passbookData),
    });
  },

  async deleteDocument(docId: string, firmId?: string): Promise<{ success: boolean }> {
    const url = firmId ? `/api/documents/${docId}?firmId=${firmId}` : `/api/documents/${docId}`;
    return request(url, { method: 'DELETE' });
  },

  async regenerateFarmerQR(farmerId: string, firmId?: string): Promise<{ success: boolean; qrToken: string }> {
    const url = firmId ? `/api/farmers/${farmerId}/regenerate-qr?firmId=${firmId}` : `/api/farmers/${farmerId}/regenerate-qr`;
    return request(url, { method: 'POST' });
  },

  // Purchases
  async getPurchases(farmerId?: string, firmId?: string): Promise<Purchase[]> {
    const q = new URLSearchParams();
    if (farmerId) q.set('farmerId', farmerId);
    if (firmId) q.set('firmId', firmId);
    return request(`/api/purchases?${q.toString()}`);
  },

  async createPurchase(purchaseData: {
    farmerId: string;
    billNumber: string;
    purchaseNumber?: string;
    lotNumber?: string;
    date: string;
    cropName: string;
    quantityQuintals: number;
    ratePerQuintal: number;
    notes?: string;
  }, firmId?: string): Promise<Purchase> {
    const url = firmId ? `/api/purchases?firmId=${firmId}` : '/api/purchases';
    return request(url, {
      method: 'POST',
      body: JSON.stringify(purchaseData),
    });
  },

  // Payments
  async getPayments(params?: {
    search?: string;
    status?: string;
    method?: string;
    farmerId?: string;
    page?: number;
    limit?: number;
    firmId?: string;
  }): Promise<{ payments: Payment[]; total: number; page: number; limit: number; totalPages: number }> {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.status) q.set('status', params.status);
    if (params?.method) q.set('method', params.method);
    if (params?.farmerId) q.set('farmerId', params.farmerId);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.firmId) q.set('firmId', params.firmId);

    return request(`/api/payments?${q.toString()}`);
  },

  async getPaymentById(id: string, firmId?: string): Promise<Payment> {
    const url = firmId ? `/api/payments/${id}?firmId=${firmId}` : `/api/payments/${id}`;
    return request(url);
  },

  async createPayment(paymentData: {
    farmerId: string;
    purchaseId?: string;
    amount: number;
    paymentMethod: PaymentMethod;
    paymentDate: string;
    transactionReference?: string;
    notes?: string;
  }, firmId?: string): Promise<Payment> {
    const url = firmId ? `/api/payments?firmId=${firmId}` : '/api/payments';
    return request(url, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  },

  async updatePaymentStatus(paymentId: string, status: PaymentStatus, transactionReference?: string, firmId?: string): Promise<Payment> {
    const url = firmId ? `/api/payments/${paymentId}/status?firmId=${firmId}` : `/api/payments/${paymentId}/status`;
    return request(url, {
      method: 'PUT',
      body: JSON.stringify({ status, transactionReference }),
    });
  },

  // OCR
  async analyzePassbookOCR(imageDataUrl: string): Promise<{
    accountHolderName?: string;
    accountNumber?: string;
    bankName?: string;
    ifscCode?: string;
    branch?: string;
    confidence?: string;
    rawText?: string;
  }> {
    return request('/api/ocr/analyze-passbook', {
      method: 'POST',
      body: JSON.stringify({ imageDataUrl }),
    });
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditLog[]> {
    return request('/api/audit-logs');
  },

  // Backup & Import
  async downloadBackup(firmId?: string): Promise<void> {
    const url = firmId ? `/api/backup/export?firmId=${firmId}` : '/api/backup/export';
    const res = await fetch(url, {
      headers: currentAuthToken ? { Authorization: `Bearer ${currentAuthToken}` } : {},
    });
    if (!res.ok) throw new Error('Backup download failed');
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `mandi_backup_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },

  async importBulkFarmers(rows: any[], firmId?: string): Promise<{ importedCount: number; duplicateCount: number; errors: string[] }> {
    const url = firmId ? `/api/farmers/bulk-import?firmId=${firmId}` : '/api/farmers/bulk-import';
    return request(url, {
      method: 'POST',
      body: JSON.stringify({ rows }),
    });
  },

  // Public Farmer Portal
  async getFarmerByQRToken(token: string): Promise<{ farmer: Farmer; firmName: string }> {
    return request(`/api/farmer-portal/profile/${token}`);
  },

  async verifyFarmerMobile(qrToken: string, mobile: string): Promise<{ success: boolean; farmer: any }> {
    return request('/api/farmer-portal/verify-mobile', {
      method: 'POST',
      body: JSON.stringify({ qrToken, mobile }),
    });
  },

  async submitFarmerPassbook(qrToken: string, mobile: string, passbookDataUrl: string, bankDetails?: any): Promise<{ success: boolean; message: string }> {
    return request('/api/farmer-portal/submit-passbook', {
      method: 'POST',
      body: JSON.stringify({ qrToken, mobile, passbookDataUrl, bankDetails }),
    });
  },

  // Firm-Specific QR Onboarding / Registration
  async getPublicFirmDetails(firmId: string): Promise<Firm> {
    return request(`/api/public/firm/${firmId}/details`);
  },

  async submitFarmerRegistration(firmId: string, data: {
    name: string;
    fatherName?: string;
    mobile: string;
    alternateMobile?: string;
    village: string;
    tehsil?: string;
    passbookImageDataUrl: string;
    bankName?: string;
    branch?: string;
    accountNumber?: string;
    ifsc?: string;
  }): Promise<{ success: boolean; message: string; farmer: Farmer; isExisting: boolean }> {
    return request(`/api/public/firm/${firmId}/submit-farmer`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

