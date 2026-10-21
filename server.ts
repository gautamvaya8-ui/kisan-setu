import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { db } from './server/db.js';
import {
  generateSalt,
  hashPassword,
  verifyPassword,
  generateSecureToken,
  isAccountLocked,
  LOCKOUT_ATTEMPTS,
  LOCKOUT_DURATION_MS,
  SESSION_DURATION_MS,
} from './server/security.js';
import { extractPassbookDetails } from './server/ocr.js';
import type { SessionData, UserRole } from './server/types.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Active in-memory token sessions
const activeSessions = new Map<string, SessionData>();

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: SessionData;
    }
  }
}

// Authentication Middleware
function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const session = activeSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }

  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }

  req.user = session;
  next();
}

// Require Developer Role
function requireDeveloper(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'developer') {
    return res.status(403).json({ error: 'Developer / Super Admin privileges required' });
  }
  next();
}

// Require Firm Admin Role
function requireFirmAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || (req.user.role !== 'firm_admin' && req.user.role !== 'developer')) {
    return res.status(403).json({ error: 'Firm Admin privileges required' });
  }
  next();
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // JSON Body Parser with high limit for passbook image uploads
  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ extended: true, limit: '30mb' }));

  // Request logger
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} (${clientIp})`);
    }
    next();
  });

  // ==========================================
  // AUTHENTICATION ROUTES
  // ==========================================

  // POST /api/auth/login
  app.post('/api/auth/login', (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const user = db.getUserByUsername(username);
      if (!user) {
        db.logAudit({
          firmId: 'system',
          userId: 'anonymous',
          userName: username,
          action: `Failed login attempt: Username '${username}' not found`,
          entity: 'auth',
          entityId: 'login_fail',
          ipAddress: clientIp,
        });
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      // Check account lockout
      const lockStatus = isAccountLocked(user.failedAttempts, user.lockedUntil);
      if (lockStatus.locked) {
        db.logAudit({
          firmId: user.firmId || 'system',
          userId: user.id,
          userName: user.name,
          action: `Blocked login: Account locked (${lockStatus.remainingMinutes}m remaining)`,
          entity: 'auth',
          entityId: user.id,
          ipAddress: clientIp,
        });
        return res.status(429).json({
          error: 'Too many failed attempts. Please try again after 1 hour.',
          locked: true,
          remainingMinutes: lockStatus.remainingMinutes,
        });
      }

      // Verify Password
      const isValid = verifyPassword(password, user.salt, user.passwordHash);
      if (!isValid) {
        const newAttempts = (user.failedAttempts || 0) + 1;
        let lockedUntil = user.lockedUntil;

        if (newAttempts >= LOCKOUT_ATTEMPTS) {
          lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
          db.updateUser(user.id, { failedAttempts: newAttempts, lockedUntil });
          db.logAudit({
            firmId: user.firmId || 'system',
            userId: user.id,
            userName: user.name,
            action: `Account locked for 1 hour after ${LOCKOUT_ATTEMPTS} consecutive failed attempts`,
            entity: 'auth',
            entityId: user.id,
            ipAddress: clientIp,
          });
          return res.status(429).json({
            error: 'Too many failed attempts. Please try again after 1 hour.',
            locked: true,
            remainingMinutes: 60,
          });
        }

        db.updateUser(user.id, { failedAttempts: newAttempts });
        db.logAudit({
          firmId: user.firmId || 'system',
          userId: user.id,
          userName: user.name,
          action: `Failed login attempt (${newAttempts}/${LOCKOUT_ATTEMPTS})`,
          entity: 'auth',
          entityId: user.id,
          ipAddress: clientIp,
        });

        const remaining = LOCKOUT_ATTEMPTS - newAttempts;
        return res.status(401).json({
          error: `Invalid credentials. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before 1-hour account lockout.`,
        });
      }

      // Successful login -> Reset lockout counter
      db.updateUser(user.id, { failedAttempts: 0, lockedUntil: null });

      const token = generateSecureToken();
      const sessionData: SessionData = {
        token,
        userId: user.id,
        firmId: user.firmId,
        role: user.role,
        name: user.name,
        username: user.username,
        expiresAt: Date.now() + SESSION_DURATION_MS,
      };
      activeSessions.set(token, sessionData);

      const firm = user.firmId ? db.getFirmById(user.firmId) : null;

      db.logAudit({
        firmId: user.firmId || 'system',
        userId: user.id,
        userName: user.name,
        action: `User logged in successfully (${user.role})`,
        entity: 'auth',
        entityId: user.id,
        ipAddress: clientIp,
      });

      return res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
          firmId: user.firmId,
          firmName: firm?.firmName,
        },
      });
    } catch (err: any) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Internal server error during authentication' });
    }
  });

  // POST /api/auth/logout
  app.post('/api/auth/logout', authenticateToken, (req: Request, res: Response) => {
    if (req.user) {
      activeSessions.delete(req.user.token);
      db.logAudit({
        firmId: req.user.firmId || 'system',
        userId: req.user.userId,
        userName: req.user.name,
        action: 'User logged out',
        entity: 'auth',
        entityId: req.user.userId,
      });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });

  // GET /api/auth/me
  app.get('/api/auth/me', authenticateToken, (req: Request, res: Response) => {
    const user = db.getUserById(req.user!.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const firm = user.firmId ? db.getFirmById(user.firmId) : null;
    res.json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        firmId: user.firmId,
        firmName: firm?.firmName,
        firm: firm,
      },
    });
  });

  // POST /api/auth/change-password
  app.post('/api/auth/change-password', authenticateToken, (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    const user = db.getUserById(req.user!.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!verifyPassword(currentPassword, user.salt, user.passwordHash)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newSalt = generateSalt();
    db.updateUser(user.id, {
      salt: newSalt,
      passwordHash: hashPassword(newPassword, newSalt),
    });

    db.logAudit({
      firmId: user.firmId || 'system',
      userId: user.id,
      userName: user.name,
      action: 'User changed their account password',
      entity: 'auth',
      entityId: user.id,
    });

    res.json({ success: true, message: 'Password updated successfully' });
  });

  // ==========================================
  // DEVELOPER / SUPER ADMIN ENDPOINTS
  // ==========================================

  // GET /api/developer/stats
  app.get('/api/developer/stats', authenticateToken, requireDeveloper, (req: Request, res: Response) => {
    const stats = db.getDeveloperStats();
    res.json(stats);
  });

  // GET /api/developer/firms
  app.get('/api/developer/firms', authenticateToken, requireDeveloper, (req: Request, res: Response) => {
    const stats = db.getDeveloperStats();
    res.json(stats.firmsSummary);
  });

  // POST /api/developer/firms
  app.post('/api/developer/firms', authenticateToken, requireDeveloper, (req: Request, res: Response) => {
    try {
      const { firmName, ownerName, mobile, email, address, gstNumber, mandiLicenseNumber, adminUsername, adminPassword, adminName } = req.body;

      if (!firmName || !ownerName || !mobile || !address || !adminUsername || !adminPassword) {
        return res.status(400).json({ error: 'Missing required firm details or admin credentials' });
      }

      if (db.getUserByUsername(adminUsername)) {
        return res.status(400).json({ error: `Username '${adminUsername}' already exists. Please choose another username.` });
      }

      const result = db.createFirm({
        firmName,
        ownerName,
        mobile,
        email,
        address,
        gstNumber,
        mandiLicenseNumber,
        adminUsername,
        adminPassword,
        adminName: adminName || ownerName,
      }, req.user!.userId, req.user!.name);

      res.status(201).json({
        success: true,
        firm: result.firm,
        admin: {
          id: result.adminUser.id,
          username: result.adminUser.username,
          name: result.adminUser.name,
        },
      });
    } catch (err: any) {
      console.error('Error creating firm:', err);
      res.status(500).json({ error: err.message || 'Failed to create firm' });
    }
  });

  // PUT /api/developer/firms/:firmId
  app.put('/api/developer/firms/:firmId', authenticateToken, requireDeveloper, (req: Request, res: Response) => {
    const { firmId } = req.params;
    const { firmName, ownerName, mobile, email, address, gstNumber, mandiLicenseNumber, status } = req.body;

    const updated = db.updateFirm(firmId, {
      firmName,
      ownerName,
      mobile,
      email,
      address,
      gstNumber,
      mandiLicenseNumber,
      status,
    }, req.user!.userId, req.user!.name);

    if (!updated) {
      return res.status(404).json({ error: 'Firm not found' });
    }
    res.json({ success: true, firm: updated });
  });

  // POST /api/developer/firms/:firmId/reset-admin-password
  app.post('/api/developer/firms/:firmId/reset-admin-password', authenticateToken, requireDeveloper, (req: Request, res: Response) => {
    const { firmId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const success = db.resetFirmAdminPassword(firmId, newPassword, req.user!.userId, req.user!.name);
    if (!success) {
      return res.status(404).json({ error: 'Admin account not found for this firm' });
    }

    res.json({ success: true, message: 'Firm admin password reset successfully' });
  });

  // ==========================================
  // FIRM ADMIN DASHBOARD & FARMER MANAGEMENT
  // ==========================================

  // Helper to resolve firm ID
  function getEffectiveFirmId(req: Request): string {
    if (req.user?.role === 'developer') {
      const queryFirm = req.query.firmId as string;
      if (queryFirm) return queryFirm;
      const all = db.getAllFirms();
      return all[0]?.id || '';
    }
    return req.user?.firmId || '';
  }

  // GET /api/firms/current
  app.get('/api/firms/current', authenticateToken, (req: Request, res: Response) => {
    const firmId = getEffectiveFirmId(req);
    const firm = db.getFirmById(firmId);
    if (!firm) return res.status(404).json({ error: 'Firm not found' });
    res.json(firm);
  });

  // GET /api/dashboard/stats
  app.get('/api/dashboard/stats', authenticateToken, requireFirmAdmin, (req: Request, res: Response) => {
    const firmId = getEffectiveFirmId(req);
    const stats = db.getDashboardStats(firmId);
    res.json(stats);
  });

  // GET /api/farmers
  app.get('/api/farmers', authenticateToken, requireFirmAdmin, (req: Request, res: Response) => {
    const firmId = getEffectiveFirmId(req);
    const search = req.query.search as string;
    const verificationStatus = req.query.verificationStatus as string;
    const village = req.query.village as string;
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);

    const result = db.getFarmers(firmId, { search, verificationStatus, village, page, limit });
    res.json(result);
  });

  // POST /api/farmers/check-duplicates
  app.post('/api/farmers/check-duplicates', authenticateToken, requireFirmAdmin, (req: Request, res: Response) => {
    const firmId = getEffectiveFirmId(req);
    const { mobile, name, fatherName, village } = req.body;
    const duplicates = db.checkDuplicates(firmId, mobile || '', name || '', fatherName, village);
    res.json({
      hasDuplicates: duplicates.length > 0,
      count: duplicates.length,
      duplicates: duplicates.map(d => ({
        id: d.id,
        farmerCode: d.farmerCode,
        name: d.name,
        fatherName: d.fatherName,
        mobile: d.mobile,
        village: d.village,
      })),
    });
  });

  // GET /api/farmers/:id
  app.get('/api/farmers/:id', authenticateToken, requireFirmAdmin, (req: Request, res: Response) => {
    const firmId = getEffectiveFirmId(req);
    const farmer = db.getFarmerById(req.params.id, firmId);
    if (!farmer) {
      return res.status(404).json({ error: 'Farmer profile not found in your firm' });
    }
    res.json(farmer);
  });

  // POST /api/farmers
  app.post('/api/farmers', authenticateToken, requireFirmAdmin, (req: Request, res: Response) => {
    try {
      const firmId = getEffectiveFirmId(req);
      const {
        name,
        fatherName,
        mobile,
        alternateMobile,
        village,
        tehsil,
        district,
        state,
        address,
        aadhaarLast4,
        notes,
        bankName,
        branch,
        accountHolderName,
        accountNumber,
        ifsc,
        accountType,
        passbookImageDataUrl,
      } = req.body;

      if (!name || !fatherName || !mobile || !village) {
        return res.status(400).json({ error: 'Farmer Name, Father Name, Mobile, and Village are required' });
      }

      if (mobile.replace(/\D/g, '').length < 10) {
        return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number' });
      }

      if (ifsc && ifsc.trim().length !== 11) {
        return res.status(400).json({ error: 'IFSC code appears invalid. Must be an 11-character code.' });
      }

      const farmer = db.createFarmer(firmId, {
        name,
        fatherName,
        mobile,
        alternateMobile,
        village,
        tehsil,
        district,
        state,
        address,
        aadhaarLast4,
        notes,
        bankName,
        branch,
        accountHolderName,
        accountNumber,
        ifsc,
        accountType,
        passbookImageDataUrl,
      }, req.user!.userId, req.user!.name);

      res.status(201).json(farmer);
    } catch (err: any) {
      console.error('Error creating farmer:', err);
      res.status(500).json({ error: err.message || 'Failed to save farmer' });
    }
  });

  // PUT /api/farmers/:id
  app.put('/api/farmers/:id', authenticateToken, requireFirmAdmin, (req: Request, res: Response) => {
    const firmId = getEffectiveFirmId(req);
    const updated = db.updateFarmer(req.params.id, firmId, req.body, req.user!.userId, req.user!.name);
    if (!updated) {
      return res.status(404).json({ error: 'Farmer not found in your firm' });
    }
    res.json(updated);
  });

  // POST /api/farmers/:id/bank-details
  app.post('/api/farmers/:id/bank-details', authenticateToken, requireFirmAdmin, (req: Request, res: Response) => {
    const firmId = getEffectiveFirmId(req);
    const { bankName, branch, accountHolderName, accountNumber, ifsc, accountType } = req.body;

    if (!bankName || !accountNumber || !ifsc) {
      return res.status(400).json({ error: 'Bank Name, Account Number, and IFSC are required' });
    }

    if (ifsc.trim().length !== 11) {
      return res.status(400).json({ error: 'IFSC code appears invalid. Must be 11 characters (e.g. SBIN0031245).' });
    }

    const bank = db.saveOrUpdateBankDetails(req.params.id, firmId, {
      bankName,
      branch,
      accountHolderName: accountHolderName || '',
      accountNumber,
      ifsc,
      accountType,
    }, req.user!.userId, req.user!.name);

    res.json(bank);
  });

  // POST /api/farmers/:id/verify-bank
  app.post('/api/farmers/:id/verify-bank', authenticateToken, requireFirmAdmin, (req: Request, res: Response) => {
    const firmId = getEffectiveFirmId(req);
    const { status, notes } = req.body; // 'verified' | 'rejected' | 'pending'

    if (!status || !['verified', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Valid status (verified, rejected, pending) is required' });
    }

    const bank = db.verifyBankDetails(req.params.id, firmId, status, notes, req.user!.userId, req.user!.name);
    if (!bank) {
      return res.status(404).json({ error: 'Bank account not found for this farmer' });
    }

    res.json(bank);
  });

  // POST /api/farmers/:id/passbook
  app.post('/api/farmers/:id/passbook', authenticateToken, requireFirmAdmin, (req: Request, res: Response) => {
    const firmId = getEffectiveFirmId(req);
    const { fileDataUrl, mimeType, title, ocrExtractedData } = req.body;

    if (!fileDataUrl) {
      return res.status(400).json({ error: 'Passbook image file data is required' });
    }

    const doc = db.uploadPassbookDocument(req.params.id, firmId, {
      fileDataUrl,
      mimeType: mimeType || 'image/jpeg',
      title: title || 'Passbook Photo',
      ocrExtractedData,
    }, req.user!.userId, req.user!.name);

    res.json(doc);
  });

  // DELETE /api/documents/:id
  app.delete('/api/documents/:id', authenticateToken, requireFirmAdmin, (req: Request, res: Response) => {
    const firmId = getEffectiveFirmId(req);
    const success = db.deleteDocument(req.params.id, firmId, req.user!.userId, req.user!.name);
    if (!success) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json({ success: true, message: 'Document deleted successfully' });
  });

  // POST /api/farmers/:id/regenerate-qr
  app.post('/api/farmers/:id/regenerate-qr', authenticateToken, requireFirmAdmin, (req: Request, res: Response) => {
    const firmId = getEffectiveFirmId(req);
    const token = db.regenerateFarmerQR(req.params.id, firmId, req.user!.userId, req.user!.name);
    if (!token) {
      return res.status(404).json({ error: 'Farmer not found' });
    }
    res.json({ success: true, qrToken: token });
  });

  // ==========================================
  // PURCHASES & BILLS
  // ==========================================

  // GET /api/purchases
  app.get('/api/purchases', authenticateToken, requireFirmAdmin, (req: Request, res: Response) => {
    const firmId = getEffectiveFirmId(req);
    const farmerId = req.query.farmerId as string;
    const purchases = db.getPurchases(firmId, farmerId);
    res.json(purchases);
  });

  // POST /api/purchases
  app.post('/api/purchases', authenticateToken, requireFirmAdmin, (req: Request, res: Response) => {
    try {
      const firmId = getEffectiveFirmId(req);
      const { farmerId, billNumber, purchaseNumber, lotNumber, date, cropName, quantityQuintals, ratePerQuintal, notes } = req.body;

      if (!farmerId || !billNumber || !cropName || !quantityQuintals || !ratePerQuintal) {
        return res.status(400).json({ error: 'Farmer, Bill Number, Crop Name, Quantity, and Rate are required' });
      }

      const purchase = db.createPurchase(firmId, {
        farmerId,
        billNumber,
        purchaseNumber,
        lotNumber,
        date: date || new Date().toISOString().split('T')[0],
        cropName,
        quantityQuintals: parseFloat(quantityQuintals),
        ratePerQuintal: parseFloat(ratePerQuintal),
        notes,
      }, req.user!.userId, req.user!.name);

      res.status(201).json(purchase);
    } catch (err: any) {
      console.error('Error recording purchase:', err);
      res.status(500).json({ error: err.message || 'Failed to record purchase' });
    }
  });

  // ==========================================
  // PAYMENTS & RTGS
  // ==========================================

  // GET /api/payments
  app.get('/api/payments', authenticateToken, requireFirmAdmin, (req: Request, res: Response) => {
    const firmId = getEffectiveFirmId(req);
    const search = req.query.search as string;
    const status = req.query.status as string;
    const method = req.query.method as string;
    const farmerId = req.query.farmerId as string;
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '25', 10);

    const result = db.getPayments(firmId, { search, status, method, farmerId, page, limit });
    res.json(result);
  });

  // GET /api/payments/:id
  app.get('/api/payments/:id', authenticateToken, requireFirmAdmin, (req: Request, res: Response) => {
    const firmId = getEffectiveFirmId(req);
    const payment = db.getPaymentById(req.params.id, firmId);
    if (!payment) return res.status(404).json({ error: 'Payment record not found' });
    res.json(payment);
  });

  // POST /api/payments
  app.post('/api/payments', authenticateToken, requireFirmAdmin, (req: Request, res: Response) => {
    try {
      const firmId = getEffectiveFirmId(req);
      const { farmerId, purchaseId, amount, paymentMethod, paymentDate, transactionReference, notes } = req.body;

      if (!farmerId || !amount || !paymentMethod) {
        return res.status(400).json({ error: 'Farmer, Amount, and Payment Method are required' });
      }

      const payment = db.createPayment(firmId, {
        farmerId,
        purchaseId,
        amount: parseFloat(amount),
        paymentMethod,
        paymentDate: paymentDate || new Date().toISOString().split('T')[0],
        transactionReference,
        notes,
      }, req.user!.userId, req.user!.name);

      res.status(201).json(payment);
    } catch (err: any) {
      console.error('Payment creation error:', err);
      res.status(400).json({ error: err.message || 'Failed to create payment' });
    }
  });

  // PUT /api/payments/:id/status
  app.put('/api/payments/:id/status', authenticateToken, requireFirmAdmin, (req: Request, res: Response) => {
    const firmId = getEffectiveFirmId(req);
    const { status, transactionReference } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const updated = db.updatePaymentStatus(req.params.id, firmId, status, transactionReference, req.user!.userId, req.user!.name);
    if (!updated) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(updated);
  });

  // ==========================================
  // OCR ENDPOINT (Passbook analysis via Gemini 3.8 Flash)
  // ==========================================
  app.post('/api/ocr/analyze-passbook', authenticateToken, requireFirmAdmin, async (req: Request, res: Response) => {
    try {
      const { imageDataUrl } = req.body;
      if (!imageDataUrl) {
        return res.status(400).json({ error: 'Image data URL is required for OCR analysis' });
      }

      const detected = await extractPassbookDetails(imageDataUrl);
      res.json(detected);
    } catch (err: any) {
      console.error('OCR analysis failed:', err);
      res.status(500).json({ error: 'Failed to extract text from passbook. Please enter details manually.' });
    }
  });

  // ==========================================
  // AUDIT LOGS & REPORTS
  // ==========================================

  // GET /api/audit-logs
  app.get('/api/audit-logs', authenticateToken, (req: Request, res: Response) => {
    const isDev = req.user!.role === 'developer';
    const firmId = req.user!.firmId;
    const logs = db.getAuditLogs(firmId, isDev);
    res.json(logs);
  });

  // GET /api/backup/export
  app.get('/api/backup/export', authenticateToken, requireFirmAdmin, (req: Request, res: Response) => {
    const firmId = getEffectiveFirmId(req);
    const backup = db.getFirmBackupData(firmId);

    db.logAudit({
      firmId,
      userId: req.user!.userId,
      userName: req.user!.name,
      action: 'Admin downloaded complete firm data backup',
      entity: 'firm',
      entityId: firmId,
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="kisan_backup_${firmId}_${Date.now()}.json"`);
    res.json(backup);
  });

  // POST /api/farmers/bulk-import
  app.post('/api/farmers/bulk-import', authenticateToken, requireFirmAdmin, (req: Request, res: Response) => {
    const firmId = getEffectiveFirmId(req);
    const { rows } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'No valid rows provided for import' });
    }

    const result = db.importFarmersBulk(firmId, rows, req.user!.userId, req.user!.name);
    res.json(result);
  });

  // ==========================================
  // FARMER SELF-SERVICE PORTAL (Public with 2-step verification)
  // ==========================================

  // GET /api/farmer-portal/profile/:qrToken
  app.get('/api/farmer-portal/profile/:qrToken', (req: Request, res: Response) => {
    const result = db.getFarmerByQRToken(req.params.qrToken);
    if (!result) {
      return res.status(404).json({ error: 'Farmer QR code is invalid or has expired' });
    }
    // Return safe data only (no private bank account details)
    res.json(result);
  });

  // POST /api/farmer-portal/verify-mobile
  app.post('/api/farmer-portal/verify-mobile', (req: Request, res: Response) => {
    const { qrToken, mobile } = req.body;
    if (!qrToken || !mobile) {
      return res.status(400).json({ error: 'QR token and registered mobile number are required' });
    }

    const check = db.verifyFarmerMobileForToken(qrToken, mobile);
    if (!check.success || !check.farmer) {
      return res.status(403).json({ error: check.message || 'Mobile verification failed' });
    }

    res.json({
      success: true,
      farmer: {
        id: check.farmer.id,
        farmerCode: check.farmer.farmerCode,
        name: check.farmer.name,
        fatherName: check.farmer.fatherName,
        village: check.farmer.village,
        hasPassbook: Boolean(check.farmer.passbookDoc),
        bankStatus: check.farmer.bankAccount?.verificationStatus || 'not_provided',
        bankName: check.farmer.bankAccount?.bankName,
        accountMasked: check.farmer.bankAccount?.accountNumberMasked,
        ifsc: check.farmer.bankAccount?.ifsc,
      },
    });
  });

  // POST /api/farmer-portal/submit-passbook
  app.post('/api/farmer-portal/submit-passbook', (req: Request, res: Response) => {
    const { qrToken, mobile, passbookDataUrl, bankDetails } = req.body;
    if (!qrToken || !mobile || !passbookDataUrl) {
      return res.status(400).json({ error: 'QR Token, Mobile, and Passbook photo are required' });
    }

    const result = db.farmerSubmitPassbook(qrToken, mobile, passbookDataUrl, bankDetails);
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({ success: true, message: result.message });
  });

  // ==========================================
  // FIRM-SPECIFIC PUBLIC FARMER REGISTRATION VIA FIRM QR
  // ==========================================

  // GET /api/public/firm/:firmId/details
  app.get('/api/public/firm/:firmId/details', (req: Request, res: Response) => {
    const firm = db.getFirmById(req.params.firmId);
    if (!firm) {
      return res.status(404).json({ error: 'Firm not found. Please scan a valid Mandi Firm QR code.' });
    }
    // Return safe public details for farmer's verification
    res.json({
      id: firm.id,
      firmName: firm.firmName,
      ownerName: firm.ownerName,
      mobile: firm.mobile,
      address: firm.address,
      mandiLicenseNumber: firm.mandiLicenseNumber,
      status: firm.status,
    });
  });

  // POST /api/public/firm/:firmId/submit-farmer
  app.post('/api/public/firm/:firmId/submit-farmer', (req: Request, res: Response) => {
    try {
      const { firmId } = req.params;
      const {
        name,
        fatherName,
        mobile,
        alternateMobile,
        village,
        tehsil,
        passbookImageDataUrl,
        bankName,
        branch,
        accountNumber,
        ifsc,
      } = req.body;

      if (!name || !mobile || !village) {
        return res.status(400).json({ error: 'Farmer Name, Mobile Number, and Village are required.' });
      }

      if (!passbookImageDataUrl) {
        return res.status(400).json({ error: 'Please upload or capture a clear photo of your bank passbook.' });
      }

      const result = db.submitFarmerRegistrationForFirm(firmId, {
        name,
        fatherName,
        mobile,
        alternateMobile,
        village,
        tehsil,
        passbookImageDataUrl,
        bankName,
        branch,
        accountNumber,
        ifsc,
      });

      res.status(201).json(result);
    } catch (err: any) {
      console.error('Firm QR submission error:', err);
      res.status(400).json({ error: err.message || 'Submission failed' });
    }
  });

  // ==========================================
  // FRONTEND VITE INTEGRATION
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌾 KisanSetu Grain Mandi System running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
