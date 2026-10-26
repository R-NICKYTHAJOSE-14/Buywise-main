import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { createSessionToken, hashPassword } from '@/lib/auth'
import { getCookieOptions } from '@/lib/cookie-options'
import { normalizeEmail, verifyOtp } from '@/lib/otp'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = normalizeEmail(body?.email)
    const code = typeof body?.code === 'string' ? body.code.trim() : ''
    if (!email || !code) return NextResponse.json({ error: 'Email and code are required.' }, { status: 400 })

    const result = await verifyOtp(email, code)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

    // Code proven: the person controls this inbox. Find the existing account or create one (no duplicates; email is unique).
    let user = await db.user.findUnique({ where: { email } })
    if (!user) {
      try {
        user = await db.user.create({
          data: {
            email,
            passwordHash: hashPassword(crypto.randomBytes(32).toString('hex')),
            firstName: email.split('@')[0].slice(0, 40) || 'Buywise',
            lastName: '-',
            role: 'CUSTOMER',
            preferences: { create: {} },
            cart: { create: {} },
            wishlist: { create: {} },
          },
        })
      } catch {
        user = await db.user.findUnique({ where: { email } }) // concurrent create
      }
    }
    if (!user) return NextResponse.json({ error: 'Login failed' }, { status: 500 })

    await db.cart.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } })
    await db.wishlist.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } })

    const token = createSessionToken(user.id)
    const cookieStore = await cookies()
    cookieStore.set('session', token, getCookieOptions(req))
    return NextResponse.json({
      user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, phone: user.phone },
      token,
    })
  } catch (e: any) {
    console.error('OTP verify error:', e?.message || e)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
