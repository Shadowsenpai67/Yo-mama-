import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AccountPage() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) redirect('/login')

  const name = data.user.user_metadata?.full_name || data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Anime fan'
  const avatar = data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture

  return (
    <main className="accountPage">
      <div className="accountShell">
        <Link href="/" className="accountBack">← AniPulse</Link>
        <section className="accountCard">
          <div className="accountAvatar">{avatar ? <img src={avatar} alt={name} /> : <span>{name.charAt(0).toUpperCase()}</span>}</div>
          <span className="kicker">YOUR ACCOUNT</span>
          <h1>Welcome, {name}</h1>
          <p>{data.user.email}</p>
          <div className="accountActions">
            <form action="/auth/signout" method="post"><button type="submit">Sign out</button></form>
            <Link href="/">Discover anime</Link>
          </div>
        </section>
      </div>
    </main>
  )
}
