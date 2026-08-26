'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthNav() {
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setEmail(session?.user?.email ?? null))
    return () => listener.subscription.unsubscribe()
  }, [])

  return email ? <Link className="authNavButton" href="/account">Account</Link> : <Link className="authNavButton" href="/login">Sign in</Link>
}
