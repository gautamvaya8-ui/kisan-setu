import crypto from 'crypto';

const LOCKOUT_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 60 * 1000; // 1 hour in ms
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  const computed = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
}

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateFarmerQRToken(farmerCode: string): string {
  const randomPart = crypto.randomBytes(16).toString('hex');
  return `FQR_${farmerCode}_${randomPart}`;
}

export function maskAccountNumber(acc: string): string {
  const clean = (acc || '').trim();
  if (clean.length <= 4) {
    return 'XXXX' + clean;
  }
  const last4 = clean.slice(-4);
  const maskedPrefix = 'X'.repeat(Math.max(4, clean.length - 4));
  return maskedPrefix + last4;
}

export function isAccountLocked(failedAttempts: number, lockedUntil: number | null): { locked: boolean; remainingMinutes: number } {
  if (!lockedUntil) return { locked: false, remainingMinutes: 0 };
  const now = Date.now();
  if (now < lockedUntil) {
    const remainingMs = lockedUntil - now;
    return { locked: true, remainingMinutes: Math.ceil(remainingMs / (60 * 1000)) };
  }
  return { locked: false, remainingMinutes: 0 };
}

export { LOCKOUT_ATTEMPTS, LOCKOUT_DURATION_MS, SESSION_DURATION_MS };
