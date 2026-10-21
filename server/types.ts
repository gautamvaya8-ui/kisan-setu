export type UserRole = 'developer' | 'firm_admin';

export interface User {
  id: string;
  firmId: string | null; // null for developer
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
  status: 'active' | 'inactive';
  failedAttempts: number;
  lockedUntil: number | null; // timestamp in ms
  createdAt: string;
  updatedAt: string;
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
}

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export interface BankAccount {
  id: string;
  farmerId: string;
  firmId: string;
  bankName: string;
  branch: string;
  accountHolderName: string;
  accountNumber: string; // Full stored securely
  accountNumberMasked: string; // XXXXXX1234
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
  fileDataUrl: string; // base64 or stored URL
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
  farmerCode: string; // FRM-00001
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
  // Denormalized/joined helpers
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
  cropName: string; // Wheat, Soybean, Mustard, Gram/Chana, Paddy, Maize
  quantityQuintals: number;
  ratePerQuintal: number;
  totalAmount: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  paymentCode: string; // PAY-2026-0001
  firmId: string;
  farmerId: string;
  purchaseId?: string; // Associated bill
  amount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  transactionReference?: string; // UTR Number for RTGS/NEFT
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
  entity: 'farmer' | 'bank_account' | 'payment' | 'purchase' | 'firm' | 'user' | 'document' | 'auth';
  entityId: string;
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface SessionData {
  token: string;
  userId: string;
  firmId: string | null;
  role: UserRole;
  name: string;
  username: string;
  expiresAt: number;
}
