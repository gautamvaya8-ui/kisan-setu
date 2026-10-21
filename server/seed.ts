import { generateSalt, hashPassword, maskAccountNumber, generateFarmerQRToken } from './security.js';
import type { User, Firm, Farmer, BankAccount, DocumentRecord, Purchase, Payment, AuditLog } from './types.js';

// Helper to create sample SVG passbook image data URL
function createSamplePassbookDataUrl(bankName: string, name: string, accNumber: string, ifsc: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380" style="background:#fefefe; font-family:sans-serif; border: 2px solid #047857;">
    <rect width="600" height="60" fill="#065f46"/>
    <text x="30" y="38" fill="#ffffff" font-size="20" font-weight="bold">${bankName}</text>
    <text x="500" y="38" fill="#d1fae5" font-size="13">SAVINGS PASSBOOK</text>
    
    <rect x="25" y="75" width="550" height="280" fill="#f8fafc" stroke="#e2e8f0" rx="6"/>
    <line x1="25" y1="120" x2="575" y2="120" stroke="#cbd5e1" stroke-dasharray="4"/>
    
    <text x="45" y="105" fill="#334155" font-size="14" font-weight="bold">CUSTOMER ACCOUNT STATEMENT &amp; PASSBOOK</text>
    <text x="440" y="105" fill="#64748b" font-size="12">CIF: 874019284</text>
    
    <text x="45" y="150" fill="#64748b" font-size="12">Account Holder Name:</text>
    <text x="210" y="150" fill="#0f172a" font-size="14" font-weight="bold">${name.toUpperCase()}</text>
    
    <text x="45" y="185" fill="#64748b" font-size="12">Account Number:</text>
    <text x="210" y="185" fill="#0f172a" font-size="15" font-weight="bold" letter-spacing="1.5">${accNumber}</text>
    
    <text x="45" y="220" fill="#64748b" font-size="12">IFSC Code:</text>
    <text x="210" y="220" fill="#0f172a" font-size="14" font-weight="bold">${ifsc}</text>
    
    <text x="45" y="255" fill="#64748b" font-size="12">Branch:</text>
    <text x="210" y="255" fill="#0f172a" font-size="13">Grain Mandi Agricultural Branch</text>

    <text x="45" y="290" fill="#64748b" font-size="12">MICR Code:</text>
    <text x="210" y="290" fill="#0f172a" font-size="13">324002018</text>

    <rect x="400" y="220" width="150" height="100" fill="#e0f2fe" stroke="#38bdf8" stroke-dasharray="3" rx="4"/>
    <text x="430" y="260" fill="#0284c7" font-size="12" font-weight="bold">BANK STAMP</text>
    <text x="425" y="280" fill="#0369a1" font-size="11">OFFICIALLY VERIFIED</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

export function generateSeedData(): {
  firms: Firm[];
  users: User[];
  farmers: Farmer[];
  bankAccounts: BankAccount[];
  documents: DocumentRecord[];
  purchases: Purchase[];
  payments: Payment[];
  auditLogs: AuditLog[];
} {
  const firm1Id = 'firm_kota_01';
  const firm2Id = 'firm_indore_02';

  const firms: Firm[] = [
    {
      id: firm1Id,
      firmName: 'Kisan Krishi Mandi Traders',
      ownerName: 'Rajesh Agrawal',
      mobile: '9829012345',
      email: 'rajesh@kisankrishi.in',
      address: 'Shop No. 14-16, Grain Mandi Yard, Kota, Rajasthan - 324005',
      gstNumber: '08AAACK1234F1Z5',
      mandiLicenseNumber: 'MANDI-KT-8841',
      status: 'active',
      createdAt: '2026-01-10T08:00:00.000Z',
      updatedAt: '2026-01-10T08:00:00.000Z',
    },
    {
      id: firm2Id,
      firmName: 'Annadata Grain Merchants',
      ownerName: 'Dilip Sharma',
      mobile: '9826054321',
      email: 'dilip@annadatagrains.com',
      address: 'Block C, Laxmibai Mandi Parisar, Indore, MP - 452006',
      gstNumber: '23AAACA5678B1Z2',
      mandiLicenseNumber: 'MANDI-IND-3392',
      status: 'active',
      createdAt: '2026-01-15T09:30:00.000Z',
      updatedAt: '2026-01-15T09:30:00.000Z',
    },
  ];

  const devSalt = generateSalt();
  const firm1Salt = generateSalt();
  const firm2Salt = generateSalt();

  const users: User[] = [
    {
      id: 'usr_dev_001',
      firmId: null,
      name: 'Super System Developer',
      username: 'developer',
      email: 'dev@system.internal',
      passwordHash: hashPassword('dev@admin2026', devSalt),
      salt: devSalt,
      role: 'developer',
      status: 'active',
      failedAttempts: 0,
      lockedUntil: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'usr_admin_kota',
      firmId: firm1Id,
      name: 'Rajesh Agrawal (Owner)',
      username: 'admin_kota',
      email: 'rajesh@kisankrishi.in',
      passwordHash: hashPassword('kisan@123', firm1Salt),
      salt: firm1Salt,
      role: 'firm_admin',
      status: 'active',
      failedAttempts: 0,
      lockedUntil: null,
      createdAt: '2026-01-10T08:00:00.000Z',
      updatedAt: '2026-01-10T08:00:00.000Z',
    },
    {
      id: 'usr_admin_indore',
      firmId: firm2Id,
      name: 'Dilip Sharma',
      username: 'admin_indore',
      email: 'dilip@annadatagrains.com',
      passwordHash: hashPassword('annadata@123', firm2Salt),
      salt: firm2Salt,
      role: 'firm_admin',
      status: 'active',
      failedAttempts: 0,
      lockedUntil: null,
      createdAt: '2026-01-15T09:30:00.000Z',
      updatedAt: '2026-01-15T09:30:00.000Z',
    },
  ];

  // 22 realistic farmers for Firm 1
  const rawFarmersFirm1 = [
    { name: 'Rameshwar Lal Meena', father: 'Kishan Meena', mob: '9829112233', vil: 'Sangod', bank: 'State Bank of India', ifsc: 'SBIN0031245', acc: '38192048123', ver: 'verified' as const, crops: 'Wheat & Mustard' },
    { name: 'Sukhram Patidar', father: 'Devram Patidar', mob: '9414022334', vil: 'Kanwas', bank: 'Bank of Baroda', ifsc: 'BARB0KOTAXX', acc: '492801000213', ver: 'verified' as const, crops: 'Soybean & Gram' },
    { name: 'Balwinder Singh Dhillon', father: 'Gurmeet Singh', mob: '9828033445', vil: 'Ramganj Mandi', bank: 'Punjab National Bank', ifsc: 'PUNB0182700', acc: '1827000100234567', ver: 'verified' as const, crops: 'Paddy & Wheat' },
    { name: 'Gautam Patel', father: 'Mohan Patel', mob: '9784044556', vil: 'Digod', bank: 'HDFC Bank', ifsc: 'HDFC0001234', acc: '50100492817234', ver: 'verified' as const, crops: 'Mustard' },
    { name: 'Kalu Ram Gurjar', father: 'Bhanwar Singh Gurjar', mob: '9829055667', vil: 'Ladpura', bank: 'Canara Bank', ifsc: 'CNRB0002819', acc: '2819101089201', ver: 'pending' as const, crops: 'Wheat' },
    { name: 'Babulal Dhakar', father: 'Shivlal Dhakar', mob: '9460066778', vil: 'Sultanpur', bank: 'State Bank of India', ifsc: 'SBIN0031890', acc: '40192837465', ver: 'verified' as const, crops: 'Soybean' },
    { name: 'Om Prakash Choudhary', father: 'Hariram Choudhary', mob: '9829077889', vil: 'Itawa', bank: 'ICICI Bank', ifsc: 'ICIC0000842', acc: '084201509823', ver: 'verified' as const, crops: 'Wheat & Mustard' },
    { name: 'Ramkaran Saini', father: 'Narayan Saini', mob: '9784088990', vil: 'Kaithun', bank: 'Bank of India', ifsc: 'BKID0006621', acc: '662110110003412', ver: 'pending' as const, crops: 'Vegetables & Wheat' },
    { name: 'Jagdish Chandra Sharma', father: 'Moolchand Sharma', mob: '9414099001', vil: 'Khatoli', bank: 'State Bank of India', ifsc: 'SBIN0031112', acc: '31289401928', ver: 'verified' as const, crops: 'Paddy' },
    { name: 'Mukesh Kumar Meena', father: 'Ramgopal Meena', mob: '9828011224', vil: 'Sangod', bank: 'Central Bank of India', ifsc: 'CBIN0283456', acc: '3819283746', ver: 'pending' as const, crops: 'Mustard' },
    { name: 'Devkaran Nagar', father: 'Brijlal Nagar', mob: '9460022335', vil: 'Kanwas', bank: 'Bank of Baroda', ifsc: 'BARB0KANWAS', acc: '618201000391', ver: 'verified' as const, crops: 'Soybean' },
    { name: 'Shyamlal Verma', father: 'Kishanlal Verma', mob: '9829033446', vil: 'Mandana', bank: 'Union Bank of India', ifsc: 'UBIN0543210', acc: '543210100987654', ver: 'verified' as const, crops: 'Wheat' },
    { name: 'Nandkishore Mali', father: 'Raghunath Mali', mob: '9784044557', vil: 'Kaithun', bank: 'Punjab National Bank', ifsc: 'PUNB0243100', acc: '2431000100492817', ver: 'pending' as const, crops: 'Coriander & Wheat' },
    { name: 'Pappu Lal Meena', father: 'Bhairon Lal Meena', mob: '9414055668', vil: 'Digod', bank: 'State Bank of India', ifsc: 'SBIN0031245', acc: '38910293847', ver: 'verified' as const, crops: 'Soybean' },
    { name: 'Mohan Lal Dhakar', father: 'Gopal Dhakar', mob: '9828066779', vil: 'Sultanpur', bank: 'UCO Bank', ifsc: 'UCBA0001428', acc: '14280110092837', ver: 'pending' as const, crops: 'Gram' },
    { name: 'Bhagwan Das Bairwa', father: 'Surajmal Bairwa', mob: '9460077880', vil: 'Chechat', bank: 'State Bank of India', ifsc: 'SBIN0031445', acc: '41092837461', ver: 'verified' as const, crops: 'Mustard' },
    { name: 'Chhitar Lal Gujjar', father: 'Hira Lal Gujjar', mob: '9829088991', vil: 'Morak', bank: 'Bank of Baroda', ifsc: 'BARB0MORAKX', acc: '729101000182', ver: 'verified' as const, crops: 'Soybean & Wheat' },
    { name: 'Bhanwar Singh Solanki', father: 'Pratap Singh', mob: '9784099002', vil: 'Suket', bank: 'Axis Bank', ifsc: 'UTIB0002190', acc: '921010048192837', ver: 'pending' as const, crops: 'Paddy' },
    { name: 'Gordhan Lal Meena', father: 'Laxminarayan Meena', mob: '9414011225', vil: 'Kundi', bank: 'State Bank of India', ifsc: 'SBIN0031245', acc: '39281726354', ver: 'verified' as const, crops: 'Wheat' },
    { name: 'Satyanarayan Patidar', father: 'Ghasilal Patidar', mob: '9828022336', vil: 'Ramganj Mandi', bank: 'Bank of Baroda', ifsc: 'BARB0KOTAXX', acc: '492801000889', ver: 'verified' as const, crops: 'Coriander & Soybean' },
    { name: 'Premchand Meena', father: 'Kalu Ram Meena', mob: '9460033447', vil: 'Sangod', bank: 'Punjab National Bank', ifsc: 'PUNB0182700', acc: '1827000100776655', ver: 'pending' as const, crops: 'Mustard' },
    { name: 'Radheshyam Dhakar', father: 'Kishan Dhakar', mob: '9829044558', vil: 'Sultanpur', bank: 'State Bank of India', ifsc: 'SBIN0031890', acc: '37281920394', ver: 'verified' as const, crops: 'Soybean' },
  ];

  // 4 farmers for Firm 2 to show data separation
  const rawFarmersFirm2 = [
    { name: 'Dinesh Patel (Indore)', father: 'Govind Patel', mob: '9826111222', vil: 'Depalpur', bank: 'State Bank of India', ifsc: 'SBIN0030114', acc: '31928301928', ver: 'verified' as const, crops: 'Soybean' },
    { name: 'Anil Mukati', father: 'Ramesh Mukati', mob: '9826222333', vil: 'Sanwer', bank: 'Bank of India', ifsc: 'BKID0008821', acc: '882110110048192', ver: 'verified' as const, crops: 'Wheat' },
    { name: 'Kishore Parmar', father: 'Bhairav Parmar', mob: '9826333444', vil: 'Mhow', bank: 'HDFC Bank', ifsc: 'HDFC0000281', acc: '50100293817263', ver: 'pending' as const, crops: 'Gram' },
    { name: 'Manish Verma', father: 'Banshilal Verma', mob: '9826444555', vil: 'Hatod', bank: 'Punjab National Bank', ifsc: 'PUNB0391200', acc: '3912000100819201', ver: 'verified' as const, crops: 'Soybean' },
  ];

  const farmers: Farmer[] = [];
  const bankAccounts: BankAccount[] = [];
  const documents: DocumentRecord[] = [];
  const purchases: Purchase[] = [];
  const payments: Payment[] = [];
  const auditLogs: AuditLog[] = [];

  let frmCounter = 1;
  let payCounter = 1;
  let purCounter = 1;

  // Process Firm 1
  for (const raw of rawFarmersFirm1) {
    const codeNum = String(frmCounter).padStart(5, '0');
    const farmerCode = `FRM-${codeNum}`;
    const farmerId = `farmer_${firm1Id}_${codeNum}`;
    const bankAccId = `bank_${farmerId}`;
    const docId = `doc_passbook_${farmerId}`;
    const qrToken = generateFarmerQRToken(farmerCode);

    const farmer: Farmer = {
      id: farmerId,
      firmId: firm1Id,
      farmerCode,
      name: raw.name,
      fatherName: raw.father,
      mobile: raw.mob,
      alternateMobile: '94' + raw.mob.slice(2),
      village: raw.vil,
      tehsil: raw.vil,
      district: 'Kota',
      state: 'Rajasthan',
      address: `VPO ${raw.vil}, Tehsil ${raw.vil}, Dist. Kota (Raj.)`,
      notes: `Specializes in ${raw.crops}. Regular seller at Kota mandi.`,
      status: 'active',
      qrToken,
      createdAt: new Date(Date.now() - (30 - frmCounter) * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - (10) * 86400000).toISOString(),
    };
    farmers.push(farmer);

    const bankAcc: BankAccount = {
      id: bankAccId,
      farmerId,
      firmId: firm1Id,
      bankName: raw.bank,
      branch: `${raw.vil} Branch`,
      accountHolderName: raw.name,
      accountNumber: raw.acc,
      accountNumberMasked: maskAccountNumber(raw.acc),
      ifsc: raw.ifsc,
      accountType: 'Savings',
      verificationStatus: raw.ver,
      verifiedBy: raw.ver === 'verified' ? 'Rajesh Agrawal' : undefined,
      verifiedAt: raw.ver === 'verified' ? new Date(Date.now() - 5 * 86400000).toISOString() : undefined,
      addedAt: farmer.createdAt,
      updatedAt: farmer.createdAt,
    };
    bankAccounts.push(bankAcc);

    const passbookUrl = createSamplePassbookDataUrl(raw.bank, raw.name, raw.acc, raw.ifsc);
    const passbookDoc: DocumentRecord = {
      id: docId,
      farmerId,
      firmId: firm1Id,
      documentType: 'passbook',
      title: `Passbook - ${raw.name}`,
      fileDataUrl: passbookUrl,
      mimeType: 'image/svg+xml',
      verificationStatus: raw.ver,
      uploadedBy: 'Rajesh Agrawal',
      uploadedAt: farmer.createdAt,
      ocrExtractedData: {
        accountHolderName: raw.name,
        accountNumber: raw.acc,
        bankName: raw.bank,
        ifscCode: raw.ifsc,
        branch: `${raw.vil} Branch`,
      },
    };
    documents.push(passbookDoc);

    // Realistic purchases and payments for first 15 farmers
    if (frmCounter <= 15) {
      const purId = `pur_${firm1Id}_${String(purCounter).padStart(4, '0')}`;
      const billNum = `BILL-26-${1000 + purCounter}`;
      const qty = [45.5, 62.0, 80.25, 34.0, 95.0, 110.5, 52.8][frmCounter % 7];
      const rate = [2425, 4850, 5650, 5800, 2275][frmCounter % 5];
      const totalAmt = Math.round(qty * rate);

      const purchase: Purchase = {
        id: purId,
        firmId: firm1Id,
        farmerId,
        billNumber: billNum,
        purchaseNumber: `PUR-${202600 + purCounter}`,
        lotNumber: `LOT-KTA-${200 + purCounter}`,
        date: new Date(Date.now() - (15 - (frmCounter % 10)) * 86400000).toISOString().split('T')[0],
        cropName: ['Wheat (Sharbati)', 'Soybean (Yellow)', 'Mustard (Bold)', 'Gram / Chana', 'Paddy (1121)'][frmCounter % 5],
        quantityQuintals: qty,
        ratePerQuintal: rate,
        totalAmount: totalAmt,
        notes: `Quality Grade A. Weighing done at Mandi Dharma Kanta.`,
        createdBy: 'Rajesh Agrawal',
        createdAt: new Date(Date.now() - (15 - (frmCounter % 10)) * 86400000).toISOString(),
      };
      purchases.push(purchase);
      purCounter++;

      // Create Payment
      const payId = `pay_${firm1Id}_${String(payCounter).padStart(4, '0')}`;
      const payCode = `PAY-2026-${String(payCounter).padStart(4, '0')}`;
      const isPaid = raw.ver === 'verified' && (frmCounter % 3 !== 0);
      const isProcessing = raw.ver === 'verified' && (frmCounter % 3 === 0);
      const status = isPaid ? 'Completed' : (isProcessing ? 'Processing' : 'Pending');
      const utr = isPaid ? `SBIN${Date.now().toString().slice(-6)}${1000 + payCounter}` : (isProcessing ? `UTR_IN_PROCESS_${100 + payCounter}` : undefined);

      const payment: Payment = {
        id: payId,
        paymentCode: payCode,
        firmId: firm1Id,
        farmerId,
        purchaseId: purchase.id,
        amount: totalAmt,
        paymentMethod: frmCounter % 4 === 0 ? 'NEFT' : 'RTGS',
        paymentStatus: status,
        transactionReference: utr,
        bankName: raw.bank,
        accountNumberMasked: maskAccountNumber(raw.acc),
        ifsc: raw.ifsc,
        paymentDate: purchase.date,
        notes: `Payment for Bill ${billNum}. Mandi trade settlement.`,
        paidAt: isPaid ? new Date(Date.now() - (2) * 86400000).toISOString() : undefined,
        paidBy: isPaid ? 'Rajesh Agrawal' : undefined,
        createdBy: 'Rajesh Agrawal',
        createdAt: purchase.createdAt,
        updatedAt: new Date().toISOString(),
      };
      payments.push(payment);
      payCounter++;
    }

    frmCounter++;
  }

  // Process Firm 2 (Demonstrating Multi-tenant Isolation)
  for (const raw of rawFarmersFirm2) {
    const codeNum = String(frmCounter).padStart(5, '0');
    const farmerCode = `FRM-${codeNum}`;
    const farmerId = `farmer_${firm2Id}_${codeNum}`;
    const bankAccId = `bank_${farmerId}`;
    const docId = `doc_passbook_${farmerId}`;
    const qrToken = generateFarmerQRToken(farmerCode);

    const farmer: Farmer = {
      id: farmerId,
      firmId: firm2Id,
      farmerCode,
      name: raw.name,
      fatherName: raw.father,
      mobile: raw.mob,
      village: raw.vil,
      tehsil: raw.vil,
      district: 'Indore',
      state: 'Madhya Pradesh',
      address: `Village ${raw.vil}, Indore (M.P.)`,
      notes: `Firm 2 client farmer.`,
      status: 'active',
      qrToken,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    farmers.push(farmer);

    const bankAcc: BankAccount = {
      id: bankAccId,
      farmerId,
      firmId: firm2Id,
      bankName: raw.bank,
      branch: `${raw.vil} Indore`,
      accountHolderName: raw.name,
      accountNumber: raw.acc,
      accountNumberMasked: maskAccountNumber(raw.acc),
      ifsc: raw.ifsc,
      accountType: 'Savings',
      verificationStatus: raw.ver,
      verifiedBy: raw.ver === 'verified' ? 'Dilip Sharma' : undefined,
      verifiedAt: raw.ver === 'verified' ? new Date().toISOString() : undefined,
      addedAt: farmer.createdAt,
      updatedAt: farmer.createdAt,
    };
    bankAccounts.push(bankAcc);

    const passbookUrl = createSamplePassbookDataUrl(raw.bank, raw.name, raw.acc, raw.ifsc);
    documents.push({
      id: docId,
      farmerId,
      firmId: firm2Id,
      documentType: 'passbook',
      title: `Passbook - ${raw.name}`,
      fileDataUrl: passbookUrl,
      mimeType: 'image/svg+xml',
      verificationStatus: raw.ver,
      uploadedBy: 'Dilip Sharma',
      uploadedAt: farmer.createdAt,
    });

    frmCounter++;
  }

  // Initial Seed Audit Logs
  auditLogs.push(
    {
      id: 'aud_001',
      firmId: 'system',
      userId: 'usr_dev_001',
      userName: 'Super System Developer',
      action: 'System Initialized & Multi-tenant Schema Configured',
      entity: 'firm',
      entityId: firm1Id,
      newValue: 'Firms and Super Admin provisioned',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'aud_002',
      firmId: firm1Id,
      userId: 'usr_admin_kota',
      userName: 'Rajesh Agrawal',
      action: 'Admin verified farmer bank details',
      entity: 'bank_account',
      entityId: 'bank_farmer_firm_kota_01_00001',
      newValue: 'Status changed to VERIFIED',
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
    {
      id: 'aud_003',
      firmId: firm1Id,
      userId: 'usr_admin_kota',
      userName: 'Rajesh Agrawal',
      action: 'RTGS Payment executed with bank UTR',
      entity: 'payment',
      entityId: 'pay_firm_kota_01_0001',
      newValue: 'Payment Marked Completed with UTR SBIN049281',
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    }
  );

  return { firms, users, farmers, bankAccounts, documents, purchases, payments, auditLogs };
}
