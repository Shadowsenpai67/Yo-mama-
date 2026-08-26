'use client'

import { FormEvent, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(params.get('error') ? 'Authentication could not be completed. Please try again.' : '')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    const supabase = createClient()

    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })

    if (result.error) {
      setError(result.error.message)
    } else if (mode === 'signup' && !result.data.session) {
      setMessage('Account created. Check your email to confirm your address, then sign in.')
    } else {
      router.push('/account')
      router.refresh()
    }
    setLoading(false)
  }

  async function googleSignIn() {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/account` },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div className="authCard">
      <div className="authBrand"><span className="authLogo">✦</span><strong>AniPulse</strong></div>
      <h1>{mode === 'login' ? 'Welcome back' : 'Join AniPulse'}</h1>
      <p className="authIntro">{mode === 'login' ? 'Sign in to keep your anime discovery experience synced.' : 'Create an account to personalize your AniPulse experience.'}</p>

      {error && <div className="authMessage authError">{error}</div>}
      {message && <div className="authMessage authSuccess">{message}</div>}

      <button type="button" className="googleButton" onClick={googleSignIn} disabled={loading}>
        <span className="googleG">G</span> Continue with Google
      </button>
      <div className="authDivider"><span>or</span></div>

      <form onSubmit={submit} className="authForm">
        <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label>
        <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
        <button className="authSubmit" disabled={loading}>{loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
      </form>

      <button type="button" className="authSwitch" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage('') }}>
        {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
      </button>
      <a className="backHome" href="/">← Back to AniPulse</a>
    </div>
  )
}
