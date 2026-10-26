import { NextRequest, NextResponse } from 'next/server'
import { createOtp, discardOtp, getClientIp, normalizeEmail } from '@/lib/otp'
import { isMailConfigured, sendOtpEmail } from '@/lib/mailer'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = normalizeEmail(body?.email)
    if (!email) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })

    if (!isMailConfigured()) {
      return NextResponse.json({ error: 'Email sign-in is not available: the email service is not configured.' }, { status: 503 })
    }

    const result = await createOtp(email, getClientIp(req))
    if (!result.ok) {
      const res = NextResponse.json({ error: result.error, retryAfterSec: result.retryAfterSec }, { status: result.status })
      if (result.retryAfterSec) res.headers.set('Retry-After', String(result.retryAfterSec))
      return res
    }

    try {
      await sendOtpEmail(email, result.code)
    } catch (e: any) {
      await discardOtp(result.id)
      console.error('OTP email failed:', e?.message || e)
      return NextResponse.json({ error: 'We could not send the email. Please try again.' }, { status: 502 })
    }
    // Same response whether or not the account exists (no account enumeration).
    return NextResponse.json({ ok: true, expiresInSec: 300, resendAfterSec: 60 })
  } catch (e: any) {
    console.error('OTP request error:', e?.message || e)
    return NextResponse.json({ error: 'Could not send code' }, { status: 500 })
  }
}
