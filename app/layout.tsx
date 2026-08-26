import type { Metadata } from 'next';
import './globals.css';
import './overflow-fixes.css';
import './auth.css';

export const metadata: Metadata = {
  title: 'AniPulse — Anime Release Tracker',
  description: 'Discover the latest anime and upcoming releases.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
