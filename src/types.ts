export type UserRole = 'developer' | 'firm_admin';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  firmId: string | null;
  firmName?: string;
  firm?: Firm;
}

export interface Firm {
  id: string;
  firmName: string;
  ownerName: string;
  mobile: string;
  email?: string;
  address: string;
  gstNumber?: string;
  mandiLicenseNumber?: string;
  logo?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  farmersCount?: number;
  paymentsCount?: number;
  adminUsername?: string;
  adminName?: string;
  adminStatus?: string;
}

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export interface BankAccount {
  id: string;
  farmerId: string;
  firmId: string;
  bankName: string;
  branch: string;
  accountHolderName: string;
  accountNumber: string;
  accountNumberMasked: string;
  ifsc: string;
  accountType: 'Savings' | 'Current' | 'KCC';
  verificationStatus: VerificationStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  verificationNotes?: string;
  addedAt: string;
  updatedAt: string;
}

export interface DocumentRecord {
  id: string;
  farmerId: string;
  firmId: string;
  documentType: 'passbook' | 'farmer_photo' | 'kcc_document' | 'other';
  title: string;
  fileDataUrl: string;
  mimeType: string;
  verificationStatus: VerificationStatus;
  uploadedBy: string;
  uploadedAt: string;
  ocrExtractedData?: {
    accountHolderName?: string;
    accountNumber?: string;
    bankName?: string;
    ifscCode?: string;
    branch?: string;
    rawText?: string;
  };
}

export interface Farmer {
  id: string;
  firmId: string;
  farmerCode: string;
  name: string;
  fatherName: string;
  mobile: string;
  alternateMobile?: string;
  village: string;
  tehsil: string;
  district: string;
  state: string;
  address: string;
  photoUrl?: string;
  aadhaarLast4?: string;
  notes?: string;
  status: 'active' | 'inactive';
  qrToken: string;
  createdAt: string;
  updatedAt: string;
  bankAccount?: BankAccount;
  passbookDoc?: DocumentRecord;
}

export type PaymentMethod = 'RTGS' | 'NEFT' | 'IMPS' | 'Cash' | 'Other';
export type PaymentStatus = 'Pending' | 'Processing' | 'Completed' | 'Failed' | 'Cancelled';

export interface Purchase {
  id: string;
  firmId: string;
  farmerId: string;
  billNumber: string;
  purchaseNumber: string;
  lotNumber: string;
  date: string;
  cropName: string;
  quantityQuintals: number;
  ratePerQuintal: number;
  totalAmount: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  paymentCode: string;
  firmId: string;
  farmerId: string;
  purchaseId?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  transactionReference?: string;
  bankName: string;
  accountNumberMasked: string;
  ifsc: string;
  paymentDate: string;
  notes?: string;
  paidAt?: string;
  paidBy?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  firmId: string | 'system';
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalFarmers: number;
  bankVerified: number;
  bankPending: number;
  bankMissing: number;
  totalPaymentCount: number;
  totalPaymentAmount: number;
  todayPaymentCount: number;
  todayPaymentAmount: number;
  pendingPaymentCount: number;
  pendingPaymentAmount: number;
  recentFarmers: Farmer[];
  recentPayments: Payment[];
  pendingVerificationFarmers: Farmer[];
  totalPurchasesAmount: number;
}
