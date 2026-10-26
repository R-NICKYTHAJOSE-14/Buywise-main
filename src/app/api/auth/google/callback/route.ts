import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { createSessionToken, hashPassword } from '@/lib/auth'
import { getCookieOptions } from '@/lib/cookie-options'
import { getGoogleConfig, makeGoogleClient, OAUTH_COOKIE_OPTIONS } from '@/lib/google-oauth'

function fail(req: NextRequest, code: string) {
  const res = NextResponse.redirect(new URL(`/?auth_error=${code}`, req.nextUrl.origin))
  res.cookies.set('g_state', '', { ...OAUTH_COOKIE_OPTIONS, maxAge: 0 })
  res.cookies.set('g_verifier', '', { ...OAUTH_COOKIE_OPTIONS, maxAge: 0 })
  return res
}

// Step 2: Google redirects here with ?code. Identity is established ONLY by verifying Google's signed ID token server-side.
export async function GET(req: NextRequest) {
  try {
    const cfg = getGoogleConfig(req)
    if (!cfg) return fail(req, 'google_not_configured')

    const params = req.nextUrl.searchParams
    const googleError = params.get('error')
    if (googleError) return fail(req, googleError === 'access_denied' ? 'google_cancelled' : 'google_failed')

    const code = params.get('code')
    const state = params.get('state')
    const savedState = req.cookies.get('g_state')?.value
    const verifier = req.cookies.get('g_verifier')?.value
    if (!code || !state || !savedState || !verifier) return fail(req, 'google_failed')
    const a = Buffer.from(state)
    const b = Buffer.from(savedState)
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return fail(req, 'google_state')

    const client = makeGoogleClient(cfg)
    const { tokens } = await client.getToken({ code, codeVerifier: verifier })
    if (!tokens.id_token) return fail(req, 'google_failed')

    // Verifies signature (Google JWKS), issuer, expiry and audience === our client id.
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: cfg.clientId })
    const payload = ticket.getPayload()
    if (!payload?.email || payload.email_verified !== true || !payload.sub) return fail(req, 'google_unverified')

    const email = payload.email.trim().toLowerCase()
    const firstName = (payload.given_name || payload.name?.split(' ')[0] || email.split('@')[0]).trim()
    const lastName = (payload.family_name || payload.name?.split(' ').slice(1).join(' ') || '').trim() || '-'

    let user = await db.user.findUnique({ where: { email } })
    if (!user) {
      user = await db.user.create({
        data: {
          email,
          passwordHash: hashPassword(crypto.randomBytes(32).toString('hex')),
          firstName,
          lastName,
          role: 'CUSTOMER',
          preferences: { create: {} },
          cart: { create: {} },
          wishlist: { create: {} },
        },
      })
    } else {
      await db.cart.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } })
      await db.wishlist.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } })
    }

    const res = NextResponse.redirect(new URL('/?auth=google', req.nextUrl.origin))
    res.cookies.set('session', createSessionToken(user.id), getCookieOptions(req))
    res.cookies.set('g_state', '', { ...OAUTH_COOKIE_OPTIONS, maxAge: 0 })
    res.cookies.set('g_verifier', '', { ...OAUTH_COOKIE_OPTIONS, maxAge: 0 })
    return res
  } catch (e: any) {
    console.error('Google callback error:', e?.message || e)
    return fail(req, 'google_failed')
  }
}
