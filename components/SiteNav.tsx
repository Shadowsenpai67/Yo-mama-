'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import AnimeSearch from './AnimeSearch';
import AuthNav from './AuthNav';

export default function SiteNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="siteNav">
      <Link className="brand" href="/" onClick={closeMenu}>
        <span className="logo"><Sparkles size={18} /></span><b>AniPulse</b>
      </Link>
      <div className="navlinks">
        <Link href="/">Home</Link><Link href="/latest">Latest</Link><Link href="/upcoming">Upcoming</Link><Link href="/about">About</Link>
      </div>
      <div className="desktopSearch"><AnimeSearch /></div>
      <AuthNav />
      <button type="button" className={`mobileMenuButton${menuOpen ? ' isOpen' : ''}`} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="site-mobile-navigation" onClick={() => setMenuOpen(v => !v)}>
        <span className="swordIcon" aria-hidden="true"><span className="sword swordOne"><i className="blade"/><i className="guard"/><i className="grip"/><i className="pommel"/></span><span className="sword swordTwo"><i className="blade"/><i className="guard"/><i className="grip"/><i className="pommel"/></span></span>
      </button>
      {menuOpen && <div id="site-mobile-navigation" className="mobileNav">
        <div className="mobileSearch"><AnimeSearch compact /></div>
        <Link href="/" onClick={closeMenu}><span>Home</span><ChevronRight size={15}/></Link>
        <Link href="/latest" onClick={closeMenu}><span>Latest anime</span><ChevronRight size={15}/></Link>
        <Link href="/upcoming" onClick={closeMenu}><span>Upcoming releases</span><ChevronRight size={15}/></Link>
        <Link href="/about" onClick={closeMenu}><span>About</span><ChevronRight size={15}/></Link>
        <div className="mobileAuth"><AuthNav /></div>
      </div>}
    </nav>
  );
}
