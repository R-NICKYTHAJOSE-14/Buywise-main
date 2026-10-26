import { OAuth2Client } from 'google-auth-library'
import type { NextRequest } from 'next/server'

export function getGoogleConfig(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return null
  const base = (process.env.APP_URL || req.nextUrl.origin).replace(/\/$/, '')
  return { clientId, clientSecret, redirectUri: `${base}/api/auth/google/callback`, base }
}

export function makeGoogleClient(cfg: NonNullable<ReturnType<typeof getGoogleConfig>>) {
  return new OAuth2Client(cfg.clientId, cfg.clientSecret, cfg.redirectUri)
}

// Short-lived cookies that tie the callback to the browser that started the flow (CSRF + PKCE).
export const OAUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 10,
  path: '/api/auth/google',
}
