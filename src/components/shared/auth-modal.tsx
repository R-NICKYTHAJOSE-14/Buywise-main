'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Sparkles, Loader2, Mail, ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { api, refreshCartCount } from '@/lib/api'
import { toast } from 'sonner'

function GoogleIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  )
}

export function AuthModal() {
  const { authOpen, authMode, setAuthOpen, setUser } = useStore()
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [otpStep, setOtpStep] = useState<null | 'email' | 'code'>(null)
  const [otpEmail, setOtpEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  function resetOtp() {
    setOtpStep(null)
    setOtpCode('')
    setCooldown(0)
  }
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' })

  function switchMode(mode: 'login' | 'register') {
    useStore.getState().setAuthOpen(true, mode)
    setForm({ firstName: '', lastName: '', email: '', phone: '', password: '' })
    resetOtp()
  }

  function handleGoogleLogin() {
    setGoogleLoading(true)
    api.auth.google() // full-page redirect to Google's real account chooser
  }

  async function sendOtp() {
    setLoading(true)
    try {
      await api.auth.otpRequest(otpEmail)
      setOtpStep('code')
      setOtpCode('')
      setCooldown(60)
      toast.success('We sent a 6-digit code to your email.')
    } catch (e: any) {
      toast.error(e.message || 'Could not send code')
    } finally {
      setLoading(false)
    }
  }

  async function verifyOtp(code: string) {
    setLoading(true)
    try {
      const res = await api.auth.otpVerify(otpEmail, code)
      setUser(res.user)
      setAuthOpen(false)
      resetOtp()
      toast.success(`Welcome, ${res.user.firstName}!`)
      refreshCartCount().catch(() => {})
    } catch (e: any) {
      setOtpCode('')
      toast.error(e.message || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      let user
      if (authMode === 'login') {
        const res = await api.auth.login(form.email, form.password)
        user = res.user
      } else {
        const res = await api.auth.register(form)
        user = res.user
      }
      // Close modal immediately and set user in store
      setUser(user)
      setAuthOpen(false)
      toast.success(authMode === 'login' ? `Welcome back, ${user.firstName}!` : `Welcome to Buywise, ${user.firstName}!`)
      // Refresh cart count in background
      refreshCartCount().catch(() => {})
    } catch (e: any) {
      toast.error(e.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  function fillDemo() {
    setForm({ firstName: '', lastName: '', email: 'demo@ai-shop.in', phone: '', password: 'demo1234' })
  }

  return (
    <Dialog open={authOpen} onOpenChange={(o) => { setAuthOpen(o); if (!o) resetOtp() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20">
            <Sparkles className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-xl font-bold">
            {authMode === 'login' ? 'Welcome back to Buywise' : 'Create your Buywise account'}
          </DialogTitle>
          <DialogDescription className="text-center text-xs sm:text-sm text-muted-foreground">
            {authMode === 'login'
              ? 'Sign in to access your cart, personalized recommendations & AI assistant'
              : 'Join to unlock smart shopping, price watches and your Buywise AI'}
          </DialogDescription>
        </DialogHeader>

        {/* Google Sign-In Main Action */}
        <div className="space-y-3 pt-1">
          <Button
            type="button"
            variant="outline"
            disabled={googleLoading || loading}
            onClick={handleGoogleLogin}
            className="relative flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border-border/80 bg-background font-medium shadow-xs hover:bg-muted/60 hover:text-foreground transition-all"
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <GoogleIcon className="h-4 w-4" />
            )}
            <span>Continue with Google</span>
          </Button>

          {/* Divider */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
              <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
            </div>
          </div>
        </div>

        {otpStep ? (
          <div className="space-y-3">
            <button type="button" onClick={resetOtp} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            {otpStep === 'email' ? (
              <form onSubmit={(e) => { e.preventDefault(); sendOtp() }} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="otp-email" className="text-xs">Email</Label>
                  <Input id="otp-email" type="email" value={otpEmail} onChange={(e) => setOtpEmail(e.target.value)} required autoFocus />
                </div>
                <Button type="submit" className="w-full h-10 rounded-xl" disabled={loading || !otpEmail.includes('@')}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send code
                </Button>
              </form>
            ) : (
              <div className="space-y-3">
                <p className="text-center text-xs text-muted-foreground">
                  Enter the 6-digit code sent to <span className="font-medium text-foreground">{otpEmail}</span>
                </p>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} onComplete={verifyOtp} disabled={loading} autoFocus>
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button type="button" className="w-full h-10 rounded-xl" disabled={loading || otpCode.length !== 6} onClick={() => verifyOtp(otpCode)}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify & sign in
                </Button>
                <button
                  type="button"
                  disabled={loading || cooldown > 0}
                  onClick={sendOtp}
                  className="w-full text-xs text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                >
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                </button>
              </div>
            )}
          </div>
        ) : (
        <>
        {/* Email & Password Form */}
        <form onSubmit={submit} className="space-y-3">
          {authMode === 'register' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-xs">First name</Label>
                <Input id="firstName" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-xs">Last name</Label>
                <Input id="lastName" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          {authMode === 'register' && (
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs">Phone (optional)</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs">Password</Label>
            <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>
          <Button type="submit" className="w-full h-10 rounded-xl" disabled={loading || googleLoading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {authMode === 'login' ? 'Sign in with Email' : 'Create account'}
          </Button>
        </form>

        {authMode === 'login' && (
          <Button
            type="button"
            variant="outline"
            onClick={() => { setOtpEmail(form.email); setOtpStep('email') }}
            className="w-full h-10 rounded-xl gap-2"
          >
            <Mail className="h-4 w-4" /> Sign in with email code
          </Button>
        )}

        {authMode === 'login' && (
          <button
            type="button"
            onClick={fillDemo}
            className="w-full rounded-lg border border-dashed border-border/80 bg-muted/40 px-3 py-2 text-xs text-muted-foreground hover:bg-muted transition-colors"
          >
            Use demo account → <span className="font-medium text-foreground">demo@ai-shop.in</span> / demo1234
          </button>
        )}
        </>
        )}

        <p className="text-center text-xs text-muted-foreground pt-1">
          {authMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => switchMode(authMode === 'login' ? 'register' : 'login')}
            className="font-semibold text-primary hover:underline"
          >
            {authMode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </DialogContent>
    </Dialog>
  )
}
