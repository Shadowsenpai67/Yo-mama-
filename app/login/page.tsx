import { Suspense } from 'react'
import AuthForm from '@/components/AuthForm'

export default function LoginPage() {
  return <main className="authPage"><Suspense fallback={<div className="authCard">Loading…</div>}><AuthForm /></Suspense></main>
}
