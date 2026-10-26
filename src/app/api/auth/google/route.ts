import { NextRequest, NextResponse } from 'next/server'
import { CodeChallengeMethod } from 'google-auth-library'
import crypto from 'crypto'
import { getGoogleConfig, makeGoogleClient, OAUTH_COOKIE_OPTIONS } from '@/lib/google-oauth'

// Step 1 of real Google OAuth (authorization code + PKCE): send the browser to Google's account chooser.
// The old POST handler that trusted a client-supplied email has been removed on purpose.
export async function GET(req: NextRequest) {
  const cfg = getGoogleConfig(req)
  if (!cfg) {
    return NextResponse.redirect(new URL('/?auth_error=google_not_configured', req.nextUrl.origin))
  }
  const client = makeGoogleClient(cfg)
  const state = crypto.randomBytes(24).toString('base64url')
  const verifier = crypto.randomBytes(48).toString('base64url')
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url')

  const url = client.generateAuthUrl({
    scope: ['openid', 'email', 'profile'],
    state,
    prompt: 'select_account',
    code_challenge: challenge,
    code_challenge_method: CodeChallengeMethod.S256,
  })
  const res = NextResponse.redirect(url)
  res.cookies.set('g_state', state, OAUTH_COOKIE_OPTIONS)
  res.cookies.set('g_verifier', verifier, OAUTH_COOKIE_OPTIONS)
  return res
}

export async function POST() {
  return NextResponse.json({ error: 'Use the Google sign-in flow' }, { status: 405 })
}
