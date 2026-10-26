import crypto from 'crypto'
import type { NextRequest } from 'next/server'
import { db } from './db'
import { getAuthSecret } from './auth'

export const OTP_TTL_MS = 5 * 60 * 1000
export const OTP_MAX_ATTEMPTS = 5
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000
export const OTP_MAX_PER_EMAIL_PER_HOUR = 5
export const OTP_MAX_PER_IP_PER_HOUR = 20

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const email = raw.trim().toLowerCase()
  if (email.length > 254 || !EMAIL_RE.test(email)) return null
  return email
}

export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  return (fwd ? fwd.split(',')[0].trim() : req.headers.get('x-real-ip')) || 'unknown'
}

// Keyed hash bound to the record id + email, so a leaked DB cannot be brute-forced offline without the secret.
export function hashOtp(id: string, email: string, code: string): string {
  return crypto.createHmac('sha256', getAuthSecret()).update(`otp:${id}:${email}:${code}`).digest('hex')
}

export function generateOtp(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0')
}

export type RequestResult =
  | { ok: true; code: string; id: string }
  | { ok: false; status: number; error: string; retryAfterSec?: number }

/** Applies rate limits, then creates a new OTP record (invalidating older ones). Caller must email `code`. */
export async function createOtp(email: string, ip: string): Promise<RequestResult> {
  const now = Date.now()
  const hourAgo = new Date(now - 60 * 60 * 1000)

  const last = await db.otpCode.findFirst({ where: { email }, orderBy: { createdAt: 'desc' } })
  if (last) {
    const wait = last.createdAt.getTime() + OTP_RESEND_COOLDOWN_MS - now
    if (wait > 0) {
      return { ok: false, status: 429, error: 'Please wait before requesting another code.', retryAfterSec: Math.ceil(wait / 1000) }
    }
  }
  const [emailCount, ipCount] = await Promise.all([
    db.otpCode.count({ where: { email, createdAt: { gte: hourAgo } } }),
    db.otpCode.count({ where: { ip, createdAt: { gte: hourAgo } } }),
  ])
  if (emailCount >= OTP_MAX_PER_EMAIL_PER_HOUR || ipCount >= OTP_MAX_PER_IP_PER_HOUR) {
    return { ok: false, status: 429, error: 'Too many code requests. Please try again later.', retryAfterSec: 3600 }
  }

  const code = generateOtp()
  const id = crypto.randomBytes(12).toString('hex')
  await db.$transaction([
    // Only the newest code is ever valid.
    db.otpCode.updateMany({ where: { email, consumedAt: null }, data: { consumedAt: new Date() } }),
    db.otpCode.create({
      data: { id, email, ip, codeHash: hashOtp(id, email, code), expiresAt: new Date(now + OTP_TTL_MS) },
    }),
  ])
  // Opportunistic cleanup of old rows.
  db.otpCode.deleteMany({ where: { createdAt: { lt: new Date(now - 24 * 60 * 60 * 1000) } } }).catch(() => {})
  return { ok: true, code, id }
}

/** Removes a code that could not be emailed so a failed send does not burn the user's rate limit. */
export async function discardOtp(id: string) {
  await db.otpCode.delete({ where: { id } }).catch(() => {})
}

export type VerifyResult = { ok: true } | { ok: false; status: number; error: string }

export async function verifyOtp(email: string, code: string): Promise<VerifyResult> {
  const invalid: VerifyResult = { ok: false, status: 401, error: 'Invalid or expired code.' }
  if (!/^\d{6}$/.test(code)) return invalid

  const rec = await db.otpCode.findFirst({
    where: { email, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  })
  if (!rec) return invalid

  // Atomically count the attempt first; refuses once the limit is reached (race-safe).
  const bumped = await db.otpCode.updateMany({
    where: { id: rec.id, consumedAt: null, attempts: { lt: OTP_MAX_ATTEMPTS } },
    data: { attempts: { increment: 1 } },
  })
  if (bumped.count === 0) {
    return { ok: false, status: 429, error: 'Too many incorrect attempts. Please request a new code.' }
  }

  const expected = Buffer.from(rec.codeHash, 'hex')
  const actual = Buffer.from(hashOtp(rec.id, email, code), 'hex')
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return invalid

  // Single use: only one concurrent request can flip consumedAt from null.
  const consumed = await db.otpCode.updateMany({
    where: { id: rec.id, consumedAt: null, expiresAt: { gt: new Date() } },
    data: { consumedAt: new Date() },
  })
  return consumed.count === 1 ? { ok: true } : invalid
}
