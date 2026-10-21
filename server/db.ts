import fs from 'fs';
import path from 'path';
import { generateSeedData } from './seed.js';
import { generateSalt, hashPassword, maskAccountNumber, generateFarmerQRToken } from './security.js';
import type { User, Firm, Farmer, BankAccount, DocumentRecord, Purchase, Payment, AuditLog, VerificationStatus, PaymentMethod, PaymentStatus } from './types.js';

interface DatabaseSchema {
  firms: Firm[];
  users: User[];
  farmers: Farmer[];
  bankAccounts: BankAccount[];
  documents: DocumentRecord[];
  purchases: Purchase[];
  payments: Payment[];
  auditLogs: AuditLog[];
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

class DatabaseStore {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadOrInit();
  }

  private loadOrInit(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.farmers && parsed.firms && parsed.users) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not load database file, reinitializing with seed data:', e);
    }
    const seed = generateSeedData();
    this.save(seed);
    return seed;
  }

  private save(dataToSave?: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave || this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to persist database:', e);
    }
  }

  // AUDIT LOGGING
  public logAudit(entry: Omit<AuditLog, 'id' | 'createdAt'>) {
    const log: AuditLog = {
      ...entry,
      id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(log);
    if (this.data.auditLogs.length > 2000) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 2000);
    }
    this.save();
    return log;
  }

  public getAuditLogs(firmId: string | null, isDeveloper: boolean): AuditLog[] {
    if (isDeveloper) {
      return [...this.data.auditLogs];
    }
    return this.data.auditLogs.filter(log => log.firmId === firmId);
  }

  // USER / AUTH
  public getUserByUsername(username: string): User | undefined {
    return this.data.users.find(u => u.username.toLowerCase() === username.toLowerCase().trim() || u.email.toLowerCase() === username.toLowerCase().trim());
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public updateUser(id: string, updates: Partial<User>) {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      this.data.users[idx] = { ...this.data.users[idx], ...updates, updatedAt: new Date().toISOString() };
      this.save();
      return this.data.users[idx];
    }
    return null;
  }

  // FIRMS (Developer & Firm Admin)
  public getAllFirms(): Firm[] {
    return [...this.data.firms];
  }

  public getFirmById(firmId: string): Firm | undefined {
    return this.data.firms.find(f => f.id === firmId);
  }

  public createFirm(firmData: {
    firmName: string;
    ownerName: string;
    mobile: string;
    email?: string;
    address: string;
    gstNumber?: string;
    mandiLicenseNumber?: string;
    adminUsername: string;
    adminPassword: string;
    adminName: string;
  }, developerUserId: string, developerName: string): { firm: Firm; adminUser: User } {
    const firmId = `firm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
    const newFirm: Firm = {
      id: firmId,
      firmName: firmData.firmName.trim(),
      ownerName: firmData.ownerName.trim(),
      mobile: firmData.mobile.trim(),
      email: firmData.email?.trim(),
      address: firmData.address.trim(),
      gstNumber: firmData.gstNumber?.trim().toUpperCase(),
      mandiLicenseNumber: firmData.mandiLicenseNumber?.trim(),
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.firms.push(newFirm);

    const salt = generateSalt();
    const newUser: User = {
      id: `usr_adm_${Date.now().toString(36)}`,
      firmId: firmId,
      name: firmData.adminName.trim() || firmData.ownerName.trim(),
      username: firmData.adminUsername.trim(),
      email: firmData.email?.trim() || `${firmData.adminUsername}@mandi.internal`,
      passwordHash: hashPassword(firmData.adminPassword, salt),
      salt,
      role: 'firm_admin',
      status: 'active',
      failedAttempts: 0,
      lockedUntil: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.users.push(newUser);

    this.logAudit({
      firmId,
      userId: developerUserId,
      userName: developerName,
      action: `Developer created new Firm '${newFirm.firmName}' and admin account '${newUser.username}'`,
      entity: 'firm',
      entityId: firmId,
      newValue: JSON.stringify({ firmName: newFirm.firmName, owner: newFirm.ownerName }),
    });

    this.save();
    return { firm: newFirm, adminUser: newUser };
  }

  public updateFirm(firmId: string, updates: Partial<Firm>, developerUserId: string, developerName: string): Firm | null {
    const idx = this.data.firms.findIndex(f => f.id === firmId);
    if (idx === -1) return null;
    const old = this.data.firms[idx];
    this.data.firms[idx] = { ...old, ...updates, updatedAt: new Date().toISOString() };

    this.logAudit({
      firmId,
      userId: developerUserId,
      userName: developerName,
      action: `Developer updated firm details for '${this.data.firms[idx].firmName}'`,
      entity: 'firm',
      entityId: firmId,
      oldValue: JSON.stringify(old),
      newValue: JSON.stringify(this.data.firms[idx]),
    });

    this.save();
    return this.data.firms[idx];
  }

  public resetFirmAdminPassword(firmId: string, newPassword: string, developerUserId: string, developerName: string): boolean {
    const admin = this.data.users.find(u => u.firmId === firmId && u.role === 'firm_admin');
    if (!admin) return false;
    const salt = generateSalt();
    admin.passwordHash = hashPassword(newPassword, salt);
    admin.salt = salt;
    admin.failedAttempts = 0;
    admin.lockedUntil = null;
    admin.updatedAt = new Date().toISOString();

    this.logAudit({
      firmId,
      userId: developerUserId,
      userName: developerName,
      action: `Developer reset admin password for firm '${firmId}' (username: ${admin.username})`,
      entity: 'user',
      entityId: admin.id,
      newValue: 'Admin password reset and account unlocked',
    });

    this.save();
    return true;
  }

  // FARMERS (Enforce strict firm isolation)
  public getFarmers(firmId: string, options?: {
    search?: string;
    verificationStatus?: string;
    village?: string;
    page?: number;
    limit?: number;
  }): { farmers: Farmer[]; total: number; page: number; limit: number; totalPages: number } {
    let list = this.data.farmers.filter(f => f.firmId === firmId);

    const s = options?.search?.toLowerCase().trim();
    if (s) {
      list = list.filter(f => {
        const bank = this.data.bankAccounts.find(b => b.farmerId === f.id);
        const nameMatch = f.name.toLowerCase().includes(s);
        const codeMatch = f.farmerCode.toLowerCase().includes(s);
        const mobMatch = f.mobile.includes(s);
        const vilMatch = f.village.toLowerCase().includes(s);
        const bankMatch = bank?.bankName.toLowerCase().includes(s) || false;
        const ifscMatch = bank?.ifsc.toLowerCase().includes(s) || false;
        const accMatch = bank?.accountNumber.includes(s) || false;
        return nameMatch || codeMatch || mobMatch || vilMatch || bankMatch || ifscMatch || accMatch;
      });
    }

    if (options?.village) {
      list = list.filter(f => f.village.toLowerCase() === options.village!.toLowerCase());
    }

    if (options?.verificationStatus) {
      list = list.filter(f => {
        const bank = this.data.bankAccounts.find(b => b.farmerId === f.id);
        if (options.verificationStatus === 'missing') {
          return !bank || !bank.accountNumber;
        }
        return bank?.verificationStatus === options.verificationStatus;
      });
    }

    // Attach joined relations
    const enriched = list.map(f => this.attachRelations(f));

    const total = enriched.length;
    const page = Math.max(1, options?.page || 1);
    const limit = options?.limit ? Math.max(1, options.limit) : 20;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paged = enriched.slice(startIndex, startIndex + limit);

    return { farmers: paged, total, page, limit, totalPages };
  }

  public getFarmerById(farmerId: string, firmId: string): Farmer | null {
    const f = this.data.farmers.find(item => item.id === farmerId && item.firmId === firmId);
    if (!f) return null;
    return this.attachRelations(f);
  }

  public getFarmerByQRToken(qrToken: string): { farmer: Farmer; firmName: string } | null {
    const f = this.data.farmers.find(item => item.qrToken === qrToken);
    if (!f) return null;
    const firm = this.data.firms.find(fi => fi.id === f.firmId);
    return {
      farmer: {
        id: f.id,
        firmId: f.firmId,
        farmerCode: f.farmerCode,
        name: f.name,
        fatherName: f.fatherName,
        mobile: f.mobile.slice(0, 3) + 'XXXX' + f.mobile.slice(-3), // masked on public QR
        village: f.village,
        tehsil: f.tehsil,
        district: f.district,
        state: f.state,
        address: f.address,
        status: f.status,
        qrToken: f.qrToken,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      },
      firmName: firm?.firmName || 'Grain Trading Merchant',
    };
  }

  public checkDuplicates(firmId: string, mobile: string, name: string, fatherName?: string, village?: string): Farmer[] {
    const cleanMob = mobile.replace(/\D/g, '').slice(-10);
    const cleanName = name.toLowerCase().trim();
    const cleanFather = fatherName?.toLowerCase().trim();
    const cleanVillage = village?.toLowerCase().trim();

    return this.data.farmers.filter(f => {
      if (f.firmId !== firmId) return false;
      const fMob = f.mobile.replace(/\D/g, '').slice(-10);
      if (cleanMob && fMob === cleanMob) return true;
      if (cleanName && f.name.toLowerCase().trim() === cleanName) {
        if (cleanFather && f.fatherName.toLowerCase().trim() === cleanFather) return true;
        if (cleanVillage && f.village.toLowerCase().trim() === cleanVillage) return true;
      }
      return false;
    });
  }

  public createFarmer(firmId: string, data: {
    name: string;
    fatherName: string;
    mobile: string;
    alternateMobile?: string;
    village: string;
    tehsil?: string;
    district?: string;
    state?: string;
    address?: string;
    aadhaarLast4?: string;
    notes?: string;
    bankName?: string;
    branch?: string;
    accountHolderName?: string;
    accountNumber?: string;
    ifsc?: string;
    accountType?: 'Savings' | 'Current' | 'KCC';
    passbookImageDataUrl?: string;
  }, userId: string, userName: string): Farmer {
    // Generate next farmer code
    const firmFarmers = this.data.farmers.filter(f => f.firmId === firmId);
    const nextNum = firmFarmers.length + 1;
    const farmerCode = `FRM-${String(nextNum).padStart(5, '0')}`;
    const farmerId = `farmer_${firmId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
    const qrToken = generateFarmerQRToken(farmerCode);

    const newFarmer: Farmer = {
      id: farmerId,
      firmId,
      farmerCode,
      name: data.name.trim(),
      fatherName: data.fatherName.trim(),
      mobile: data.mobile.trim(),
      alternateMobile: data.alternateMobile?.trim(),
      village: data.village.trim(),
      tehsil: data.tehsil?.trim() || data.village.trim(),
      district: data.district?.trim() || 'Kota',
      state: data.state?.trim() || 'Rajasthan',
      address: data.address?.trim() || `Village ${data.village.trim()}`,
      aadhaarLast4: data.aadhaarLast4?.trim(),
      notes: data.notes?.trim(),
      status: 'active',
      qrToken,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.farmers.push(newFarmer);

    // Bank Account creation if provided
    if (data.bankName && data.accountNumber && data.ifsc) {
      const bankAcc: BankAccount = {
        id: `bank_${farmerId}`,
        farmerId,
        firmId,
        bankName: data.bankName.trim(),
        branch: data.branch?.trim() || `${data.village} Branch`,
        accountHolderName: data.accountHolderName?.trim() || data.name.trim(),
        accountNumber: data.accountNumber.trim(),
        accountNumberMasked: maskAccountNumber(data.accountNumber.trim()),
        ifsc: data.ifsc.trim().toUpperCase(),
        accountType: data.accountType || 'Savings',
        verificationStatus: 'pending',
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.data.bankAccounts.push(bankAcc);
    }

    // Passbook doc if provided
    if (data.passbookImageDataUrl) {
      const doc: DocumentRecord = {
        id: `doc_${farmerId}_${Date.now().toString(36)}`,
        farmerId,
        firmId,
        documentType: 'passbook',
        title: `Passbook - ${data.name.trim()}`,
        fileDataUrl: data.passbookImageDataUrl,
        mimeType: 'image/jpeg',
        verificationStatus: 'pending',
        uploadedBy: userName,
        uploadedAt: new Date().toISOString(),
      };
      this.data.documents.push(doc);
    }

    this.logAudit({
      firmId,
      userId,
      userName,
      action: `Created new farmer profile [${farmerCode}] ${newFarmer.name} (${newFarmer.village})`,
      entity: 'farmer',
      entityId: farmerId,
      newValue: JSON.stringify({ code: farmerCode, name: newFarmer.name, mobile: newFarmer.mobile }),
    });

    this.save();
    return this.attachRelations(newFarmer);
  }

  public updateFarmer(farmerId: string, firmId: string, updates: Partial<Farmer>, userId: string, userName: string): Farmer | null {
    const idx = this.data.farmers.findIndex(f => f.id === farmerId && f.firmId === firmId);
    if (idx === -1) return null;

    const old = this.data.farmers[idx];
    this.data.farmers[idx] = {
      ...old,
      ...updates,
      id: old.id,
      firmId: old.firmId,
      farmerCode: old.farmerCode,
      updatedAt: new Date().toISOString(),
    };

    this.logAudit({
      firmId,
      userId,
      userName,
      action: `Updated personal information for farmer ${old.farmerCode} (${old.name})`,
      entity: 'farmer',
      entityId: farmerId,
      oldValue: JSON.stringify({ name: old.name, mobile: old.mobile, village: old.village }),
      newValue: JSON.stringify({ name: this.data.farmers[idx].name, mobile: this.data.farmers[idx].mobile, village: this.data.farmers[idx].village }),
    });

    this.save();
    return this.attachRelations(this.data.farmers[idx]);
  }

  public regenerateFarmerQR(farmerId: string, firmId: string, userId: string, userName: string): string | null {
    const f = this.data.farmers.find(item => item.id === farmerId && item.firmId === firmId);
    if (!f) return null;
    f.qrToken = generateFarmerQRToken(f.farmerCode);
    f.updatedAt = new Date().toISOString();

    this.logAudit({
      firmId,
      userId,
      userName,
      action: `Regenerated secure QR code token for farmer ${f.farmerCode}`,
      entity: 'farmer',
      entityId: farmerId,
    });

    this.save();
    return f.qrToken;
  }

  // BANK ACCOUNT MANAGEMENT
  public saveOrUpdateBankDetails(farmerId: string, firmId: string, bankData: {
    bankName: string;
    branch?: string;
    accountHolderName: string;
    accountNumber: string;
    ifsc: string;
    accountType?: 'Savings' | 'Current' | 'KCC';
  }, userId: string, userName: string): BankAccount {
    let bank = this.data.bankAccounts.find(b => b.farmerId === farmerId && b.firmId === firmId);
    const masked = maskAccountNumber(bankData.accountNumber);

    if (bank) {
      const oldVal = `${bank.bankName} - ${bank.accountNumberMasked}`;
      bank.bankName = bankData.bankName.trim();
      bank.branch = bankData.branch?.trim() || bank.branch;
      bank.accountHolderName = bankData.accountHolderName.trim();
      bank.accountNumber = bankData.accountNumber.trim();
      bank.accountNumberMasked = masked;
      bank.ifsc = bankData.ifsc.trim().toUpperCase();
      if (bankData.accountType) bank.accountType = bankData.accountType;
      bank.verificationStatus = 'pending'; // Reset verification on update!
      bank.updatedAt = new Date().toISOString();

      this.logAudit({
        firmId,
        userId,
        userName,
        action: `Admin updated farmer bank details for farmer ID ${farmerId}`,
        entity: 'bank_account',
        entityId: bank.id,
        oldValue: oldVal,
        newValue: `${bank.bankName} - ${masked}`,
      });
    } else {
      bank = {
        id: `bank_${farmerId}`,
        farmerId,
        firmId,
        bankName: bankData.bankName.trim(),
        branch: bankData.branch?.trim() || 'Main Branch',
        accountHolderName: bankData.accountHolderName.trim(),
        accountNumber: bankData.accountNumber.trim(),
        accountNumberMasked: masked,
        ifsc: bankData.ifsc.trim().toUpperCase(),
        accountType: bankData.accountType || 'Savings',
        verificationStatus: 'pending',
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.data.bankAccounts.push(bank);

      this.logAudit({
        firmId,
        userId,
        userName,
        action: `Admin added new bank details for farmer ID ${farmerId}`,
        entity: 'bank_account',
        entityId: bank.id,
        newValue: `${bank.bankName} - ${masked}`,
      });
    }

    this.save();
    return bank;
  }

  public verifyBankDetails(farmerId: string, firmId: string, status: VerificationStatus, notes: string | undefined, userId: string, userName: string): BankAccount | null {
    const bank = this.data.bankAccounts.find(b => b.farmerId === farmerId && b.firmId === firmId);
    if (!bank) return null;

    const oldStatus = bank.verificationStatus;
    bank.verificationStatus = status;
    bank.verifiedBy = userName;
    bank.verifiedAt = new Date().toISOString();
    bank.verificationNotes = notes;
    bank.updatedAt = new Date().toISOString();

    // Also update any matching passbook document verification status
    const doc = this.data.documents.find(d => d.farmerId === farmerId && d.firmId === firmId && d.documentType === 'passbook');
    if (doc) {
      doc.verificationStatus = status;
    }

    this.logAudit({
      firmId,
      userId,
      userName,
      action: status === 'verified' ? 'Admin verified bank details.' : `Admin marked bank details as ${status}`,
      entity: 'bank_account',
      entityId: bank.id,
      oldValue: `Status: ${oldStatus}`,
      newValue: `Status: ${status} (Verified by ${userName})`,
    });

    this.save();
    return bank;
  }

  // DOCUMENT MANAGEMENT
  public uploadPassbookDocument(farmerId: string, firmId: string, docData: {
    fileDataUrl: string;
    mimeType: string;
    title?: string;
    ocrExtractedData?: DocumentRecord['ocrExtractedData'];
  }, userId: string, userName: string): DocumentRecord {
    // Delete or supersede older passbook if exists
    const existingIndex = this.data.documents.findIndex(d => d.farmerId === farmerId && d.firmId === firmId && d.documentType === 'passbook');

    const newDoc: DocumentRecord = {
      id: `doc_${farmerId}_${Date.now().toString(36)}`,
      farmerId,
      firmId,
      documentType: 'passbook',
      title: docData.title || 'Bank Passbook',
      fileDataUrl: docData.fileDataUrl,
      mimeType: docData.mimeType || 'image/jpeg',
      verificationStatus: 'pending',
      uploadedBy: userName,
      uploadedAt: new Date().toISOString(),
      ocrExtractedData: docData.ocrExtractedData,
    };

    if (existingIndex !== -1) {
      this.data.documents[existingIndex] = newDoc;
    } else {
      this.data.documents.push(newDoc);
    }

    this.logAudit({
      firmId,
      userId,
      userName,
      action: 'Admin uploaded passbook photo.',
      entity: 'document',
      entityId: newDoc.id,
      newValue: `Passbook document uploaded (${newDoc.mimeType})`,
    });

    this.save();
    return newDoc;
  }

  public deleteDocument(docId: string, firmId: string, userId: string, userName: string): boolean {
    const idx = this.data.documents.findIndex(d => d.id === docId && d.firmId === firmId);
    if (idx === -1) return false;
    const doc = this.data.documents[idx];
    this.data.documents.splice(idx, 1);

    this.logAudit({
      firmId,
      userId,
      userName,
      action: `Admin deleted document '${doc.title}'`,
      entity: 'document',
      entityId: docId,
    });

    this.save();
    return true;
  }

  // PURCHASES & BILLS
  public getPurchases(firmId: string, farmerId?: string): Purchase[] {
    return this.data.purchases.filter(p => p.firmId === firmId && (!farmerId || p.farmerId === farmerId));
  }

  public createPurchase(firmId: string, data: {
    farmerId: string;
    billNumber: string;
    purchaseNumber?: string;
    lotNumber?: string;
    date: string;
    cropName: string;
    quantityQuintals: number;
    ratePerQuintal: number;
    notes?: string;
  }, userId: string, userName: string): Purchase {
    const totalAmount = Math.round(data.quantityQuintals * data.ratePerQuintal);
    const purId = `pur_${firmId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;

    const newPur: Purchase = {
      id: purId,
      firmId,
      farmerId: data.farmerId,
      billNumber: data.billNumber.trim(),
      purchaseNumber: data.purchaseNumber?.trim() || `PUR-${Date.now().toString().slice(-6)}`,
      lotNumber: data.lotNumber?.trim() || `LOT-${Math.floor(100 + Math.random() * 900)}`,
      date: data.date,
      cropName: data.cropName.trim(),
      quantityQuintals: Number(data.quantityQuintals),
      ratePerQuintal: Number(data.ratePerQuintal),
      totalAmount,
      notes: data.notes?.trim(),
      createdBy: userName,
      createdAt: new Date().toISOString(),
    };
    this.data.purchases.unshift(newPur);

    this.logAudit({
      firmId,
      userId,
      userName,
      action: `Recorded purchase/bill #${newPur.billNumber} for ₹${totalAmount.toLocaleString('en-IN')}`,
      entity: 'purchase',
      entityId: purId,
      newValue: JSON.stringify({ bill: newPur.billNumber, crop: newPur.cropName, qty: newPur.quantityQuintals, amount: totalAmount }),
    });

    this.save();
    return newPur;
  }

  // PAYMENTS & RTGS
  public getPayments(firmId: string, options?: {
    search?: string;
    status?: string;
    method?: string;
    farmerId?: string;
    page?: number;
    limit?: number;
  }): { payments: Payment[]; total: number; page: number; limit: number; totalPages: number } {
    let list = this.data.payments.filter(p => p.firmId === firmId);

    if (options?.farmerId) {
      list = list.filter(p => p.farmerId === options.farmerId);
    }
    if (options?.status) {
      list = list.filter(p => p.paymentStatus.toLowerCase() === options.status!.toLowerCase());
    }
    if (options?.method) {
      list = list.filter(p => p.paymentMethod.toLowerCase() === options.method!.toLowerCase());
    }
    if (options?.search) {
      const q = options.search.toLowerCase();
      list = list.filter(p => {
        const farmer = this.data.farmers.find(f => f.id === p.farmerId);
        return p.paymentCode.toLowerCase().includes(q) ||
          p.transactionReference?.toLowerCase().includes(q) ||
          farmer?.name.toLowerCase().includes(q) ||
          farmer?.farmerCode.toLowerCase().includes(q) ||
          p.bankName.toLowerCase().includes(q);
      });
    }

    const total = list.length;
    const page = Math.max(1, options?.page || 1);
    const limit = options?.limit ? Math.max(1, options.limit) : 25;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paged = list.slice(startIndex, startIndex + limit);

    return { payments: paged, total, page, limit, totalPages };
  }

  public getPaymentById(paymentId: string, firmId: string): Payment | null {
    return this.data.payments.find(p => p.id === paymentId && p.firmId === firmId) || null;
  }

  public createPayment(firmId: string, data: {
    farmerId: string;
    purchaseId?: string;
    amount: number;
    paymentMethod: PaymentMethod;
    paymentDate: string;
    transactionReference?: string;
    notes?: string;
  }, userId: string, userName: string): Payment {
    const farmer = this.data.farmers.find(f => f.id === data.farmerId && f.firmId === firmId);
    if (!farmer) throw new Error('Farmer not found in this firm');

    const bank = this.data.bankAccounts.find(b => b.farmerId === data.farmerId && b.firmId === firmId);
    if (!bank) throw new Error('Farmer bank details are missing. Please add bank details first.');

    const paymentSeq = this.data.payments.filter(p => p.firmId === firmId).length + 1;
    const payCode = `PAY-2026-${String(paymentSeq).padStart(4, '0')}`;
    const payId = `pay_${firmId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;

    const isCompleted = Boolean(data.transactionReference && data.transactionReference.trim().length > 3);
    const status: PaymentStatus = isCompleted ? 'Completed' : 'Pending';

    const newPayment: Payment = {
      id: payId,
      paymentCode: payCode,
      firmId,
      farmerId: data.farmerId,
      purchaseId: data.purchaseId,
      amount: Number(data.amount),
      paymentMethod: data.paymentMethod,
      paymentStatus: status,
      transactionReference: data.transactionReference?.trim(),
      bankName: bank.bankName,
      accountNumberMasked: bank.accountNumberMasked,
      ifsc: bank.ifsc,
      paymentDate: data.paymentDate,
      notes: data.notes?.trim(),
      paidAt: isCompleted ? new Date().toISOString() : undefined,
      paidBy: isCompleted ? userName : undefined,
      createdBy: userName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.payments.unshift(newPayment);

    this.logAudit({
      firmId,
      userId,
      userName,
      action: `Admin created ${data.paymentMethod} payment [${payCode}] of ₹${Number(data.amount).toLocaleString('en-IN')} for ${farmer.name}`,
      entity: 'payment',
      entityId: payId,
      newValue: JSON.stringify({ code: payCode, amount: data.amount, method: data.paymentMethod, status }),
    });

    this.save();
    return newPayment;
  }

  public updatePaymentStatus(paymentId: string, firmId: string, status: PaymentStatus, transactionReference: string | undefined, userId: string, userName: string): Payment | null {
    const payment = this.data.payments.find(p => p.id === paymentId && p.firmId === firmId);
    if (!payment) return null;

    const oldStatus = payment.paymentStatus;
    payment.paymentStatus = status;
    if (transactionReference !== undefined) {
      payment.transactionReference = transactionReference.trim();
    }
    if (status === 'Completed') {
      payment.paidAt = new Date().toISOString();
      payment.paidBy = userName;
    }
    payment.updatedAt = new Date().toISOString();

    this.logAudit({
      firmId,
      userId,
      userName,
      action: `Admin changed payment status to ${status}${transactionReference ? ` (UTR: ${transactionReference})` : ''}`,
      entity: 'payment',
      entityId: paymentId,
      oldValue: `Status: ${oldStatus}`,
      newValue: `Status: ${status}, UTR: ${payment.transactionReference || 'N/A'}`,
    });

    this.save();
    return payment;
  }

  // DASHBOARD STATS
  public getDashboardStats(firmId: string) {
    const firmFarmers = this.data.farmers.filter(f => f.firmId === firmId);
    const firmBankAccounts = this.data.bankAccounts.filter(b => b.firmId === firmId);
    const firmPayments = this.data.payments.filter(p => p.firmId === firmId);
    const firmPurchases = this.data.purchases.filter(p => p.firmId === firmId);

    const totalFarmers = firmFarmers.length;
    let bankVerified = 0;
    let bankPending = 0;
    let bankMissing = 0;

    for (const f of firmFarmers) {
      const b = firmBankAccounts.find(acc => acc.farmerId === f.id);
      if (!b || !b.accountNumber) {
        bankMissing++;
      } else if (b.verificationStatus === 'verified') {
        bankVerified++;
      } else {
        bankPending++;
      }
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const todayPayments = firmPayments.filter(p => p.paymentDate === todayStr);
    const totalPaymentAmount = firmPayments.filter(p => p.paymentStatus === 'Completed').reduce((sum, p) => sum + p.amount, 0);
    const todayPaymentAmount = todayPayments.filter(p => p.paymentStatus === 'Completed').reduce((sum, p) => sum + p.amount, 0);
    const pendingPayments = firmPayments.filter(p => p.paymentStatus === 'Pending' || p.paymentStatus === 'Processing');
    const pendingPaymentAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

    const recentFarmers = firmFarmers
      .slice(-5)
      .reverse()
      .map(f => this.attachRelations(f));

    const recentPayments = firmPayments.slice(0, 5);

    const pendingVerificationFarmers = firmFarmers
      .filter(f => {
        const b = firmBankAccounts.find(acc => acc.farmerId === f.id);
        return b && b.verificationStatus === 'pending';
      })
      .slice(0, 5)
      .map(f => this.attachRelations(f));

    return {
      totalFarmers,
      bankVerified,
      bankPending,
      bankMissing,
      totalPaymentCount: firmPayments.length,
      totalPaymentAmount,
      todayPaymentCount: todayPayments.length,
      todayPaymentAmount,
      pendingPaymentCount: pendingPayments.length,
      pendingPaymentAmount,
      recentFarmers,
      recentPayments,
      pendingVerificationFarmers,
      totalPurchasesAmount: firmPurchases.reduce((sum, p) => sum + p.totalAmount, 0),
    };
  }

  // DEVELOPER DASHBOARD STATS
  public getDeveloperStats() {
    const firmsSummary = this.data.firms.map(firm => {
      const farmersCount = this.data.farmers.filter(f => f.firmId === firm.id).length;
      const paymentsCount = this.data.payments.filter(p => p.firmId === firm.id).length;
      const admin = this.data.users.find(u => u.firmId === firm.id && u.role === 'firm_admin');
      return {
        ...firm,
        farmersCount,
        paymentsCount,
        adminUsername: admin?.username || 'N/A',
        adminName: admin?.name || 'N/A',
        adminStatus: admin?.status || 'inactive',
      };
    });

    return {
      totalFirms: this.data.firms.length,
      activeFirms: this.data.firms.filter(f => f.status === 'active').length,
      totalFarmers: this.data.farmers.length,
      totalPayments: this.data.payments.length,
      firmsSummary,
      recentAuditLogs: this.data.auditLogs.slice(0, 15),
    };
  }

  // FARMER PORTAL SELF-SERVICE
  public verifyFarmerMobileForToken(token: string, mobile: string): { success: boolean; farmer?: Farmer; message?: string } {
    const f = this.data.farmers.find(item => item.qrToken === token);
    if (!f) return { success: false, message: 'Invalid or expired QR token' };

    const cleanInput = mobile.replace(/\D/g, '').slice(-10);
    const cleanStored = f.mobile.replace(/\D/g, '').slice(-10);
    if (cleanInput !== cleanStored) {
      return { success: false, message: 'Mobile number does not match registered farmer profile' };
    }

    return { success: true, farmer: this.attachRelations(f) };
  }

  public farmerSubmitPassbook(token: string, mobile: string, fileDataUrl: string, bankDetails?: {
    bankName: string;
    branch?: string;
    accountHolderName: string;
    accountNumber: string;
    ifsc: string;
  }): { success: boolean; message: string } {
    const check = this.verifyFarmerMobileForToken(token, mobile);
    if (!check.success || !check.farmer) {
      return { success: false, message: check.message || 'Verification failed' };
    }

    const farmer = check.farmer;
    const firmId = farmer.firmId;

    if (bankDetails) {
      this.saveOrUpdateBankDetails(farmer.id, firmId, bankDetails, farmer.id, `Farmer Self-Service (${farmer.name})`);
    }

    if (fileDataUrl) {
      this.uploadPassbookDocument(farmer.id, firmId, {
        fileDataUrl,
        mimeType: 'image/jpeg',
        title: `Self-uploaded Passbook - ${farmer.name}`,
      }, farmer.id, `Farmer Portal (${farmer.name})`);
    }

    this.logAudit({
      firmId,
      userId: farmer.id,
      userName: `Farmer ${farmer.name}`,
      action: `Farmer submitted passbook/bank details via QR self-service link [${farmer.farmerCode}]`,
      entity: 'document',
      entityId: farmer.id,
      newValue: 'Passbook submitted for verification',
    });

    return { success: true, message: `Passbook submitted successfully! Your Mandi merchant will verify it shortly.` };
  }

  // FIRM-SPECIFIC PUBLIC FARMER REGISTRATION VIA FIRM QR
  public submitFarmerRegistrationForFirm(firmId: string, data: {
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
  }): { success: boolean; message: string; farmer: Farmer; isExisting: boolean } {
    const firm = this.getFirmById(firmId);
    if (!firm) {
      throw new Error('Firm not found. Please scan a valid Firm QR code.');
    }
    if (firm.status !== 'active') {
      throw new Error('This Mandi shop account is currently inactive. Please contact the firm owner.');
    }

    const cleanMob = data.mobile.replace(/\D/g, '').slice(-10);
    if (cleanMob.length < 10) {
      throw new Error('Please enter a valid 10-digit mobile number.');
    }

    // Check if farmer already exists in this firm by mobile number
    let existingFarmer = this.data.farmers.find(
      f => f.firmId === firmId && f.mobile.replace(/\D/g, '').slice(-10) === cleanMob
    );

    let farmer: Farmer;
    let isExisting = false;

    if (existingFarmer) {
      isExisting = true;
      existingFarmer.name = data.name.trim() || existingFarmer.name;
      if (data.fatherName?.trim()) existingFarmer.fatherName = data.fatherName.trim();
      if (data.village?.trim()) existingFarmer.village = data.village.trim();
      if (data.tehsil?.trim()) existingFarmer.tehsil = data.tehsil.trim();
      existingFarmer.updatedAt = new Date().toISOString();
      farmer = existingFarmer;

      if (data.bankName && data.accountNumber && data.ifsc) {
        this.saveOrUpdateBankDetails(farmer.id, firmId, {
          bankName: data.bankName,
          branch: data.branch,
          accountHolderName: farmer.name,
          accountNumber: data.accountNumber,
          ifsc: data.ifsc,
        }, farmer.id, `Farmer Self-Registration (${farmer.name})`);
      }

      if (data.passbookImageDataUrl) {
        this.uploadPassbookDocument(farmer.id, firmId, {
          fileDataUrl: data.passbookImageDataUrl,
          mimeType: 'image/jpeg',
          title: `Passbook Photo (Firm QR) - ${farmer.name}`,
        }, farmer.id, `Farmer (${farmer.name})`);
      }

      this.logAudit({
        firmId,
        userId: farmer.id,
        userName: `Farmer ${farmer.name}`,
        action: `Farmer [${farmer.farmerCode}] updated bank details & passbook via Firm QR [${firm.firmName}]`,
        entity: 'farmer',
        entityId: farmer.id,
        newValue: `Updated via Firm QR: ${farmer.name} (${farmer.village})`,
      });
    } else {
      farmer = this.createFarmer(firmId, {
        name: data.name.trim(),
        fatherName: data.fatherName?.trim() || 'Not specified',
        mobile: cleanMob,
        alternateMobile: data.alternateMobile?.trim(),
        village: data.village.trim(),
        tehsil: data.tehsil?.trim() || data.village.trim(),
        bankName: data.bankName,
        branch: data.branch,
        accountHolderName: data.name.trim(),
        accountNumber: data.accountNumber,
        ifsc: data.ifsc,
        passbookImageDataUrl: data.passbookImageDataUrl,
      }, 'firm_qr_portal', `Firm QR Self-Registration (${firm.firmName})`);

      this.logAudit({
        firmId,
        userId: farmer.id,
        userName: `Farmer ${farmer.name}`,
        action: `New farmer registered via Firm QR: [${farmer.farmerCode}] ${farmer.name} (${farmer.village})`,
        entity: 'farmer',
        entityId: farmer.id,
        newValue: `Registered to ${firm.firmName}. Passbook pending admin verification.`,
      });
    }

    this.save();
    return {
      success: true,
      message: isExisting
        ? `Passbook and bank details updated successfully for [${farmer.farmerCode}] at ${firm.firmName}!`
        : `Registration complete! Your Farmer ID is [${farmer.farmerCode}]. ${firm.firmName} has received your passbook for verification.`,
      farmer: this.attachRelations(farmer),
      isExisting,
    };
  }

  // BULK IMPORT
  public importFarmersBulk(firmId: string, rows: Array<{
    name: string;
    fatherName: string;
    mobile: string;
    village: string;
    bankName?: string;
    accountNumber?: string;
    ifsc?: string;
  }>, userId: string, userName: string): { importedCount: number; duplicateCount: number; errors: string[] } {
    let importedCount = 0;
    let duplicateCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.name || !row.mobile || !row.village) {
        errors.push(`Row ${i + 1}: Name, Mobile, and Village are required`);
        continue;
      }

      const dupes = this.checkDuplicates(firmId, row.mobile, row.name, row.fatherName, row.village);
      if (dupes.length > 0) {
        duplicateCount++;
        continue;
      }

      this.createFarmer(firmId, {
        name: row.name,
        fatherName: row.fatherName || 'Not specified',
        mobile: row.mobile,
        village: row.village,
        bankName: row.bankName,
        accountNumber: row.accountNumber,
        ifsc: row.ifsc,
      }, userId, userName);
      importedCount++;
    }

    this.logAudit({
      firmId,
      userId,
      userName,
      action: `Admin executed bulk farmer import: ${importedCount} imported, ${duplicateCount} duplicates skipped`,
      entity: 'farmer',
      entityId: firmId,
      newValue: JSON.stringify({ importedCount, duplicateCount, totalProcessed: rows.length }),
    });

    return { importedCount, duplicateCount, errors };
  }

  // BACKUP EXPORT
  public getFirmBackupData(firmId: string): {
    firm: Firm | undefined;
    farmers: Farmer[];
    bankAccounts: BankAccount[];
    purchases: Purchase[];
    payments: Payment[];
    exportedAt: string;
  } {
    return {
      firm: this.data.firms.find(f => f.id === firmId),
      farmers: this.data.farmers.filter(f => f.firmId === firmId),
      bankAccounts: this.data.bankAccounts.filter(b => b.firmId === firmId),
      purchases: this.data.purchases.filter(p => p.firmId === firmId),
      payments: this.data.payments.filter(p => p.firmId === firmId),
      exportedAt: new Date().toISOString(),
    };
  }

  // HELPER: Attach bank account & passbook document
  private attachRelations(f: Farmer): Farmer {
    const bank = this.data.bankAccounts.find(b => b.farmerId === f.id);
    const doc = this.data.documents.find(d => d.farmerId === f.id && d.documentType === 'passbook');
    return {
      ...f,
      bankAccount: bank,
      passbookDoc: doc,
    };
  }
}

export const db = new DatabaseStore();
