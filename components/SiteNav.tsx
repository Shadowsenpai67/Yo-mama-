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
        <Link href="/">Home</Link>
        <Link href="/latest">Latest</Link>
        <Link href="/upcoming">Upcoming</Link>
        <Link href="/about">About</Link>
      </div>
      <div className="desktopSearch"><AnimeSearch /></div>
      <AuthNav />
      <button
        type="button"
        className={`mobileMenuButton${menuOpen ? ' isOpen' : ''}`}
        aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={menuOpen}
        aria-controls="site-mobile-navigation"
        onClick={() => setMenuOpen(v => !v)}
      >
        <span className="swordIcon" aria-hidden="true">
          <span className="sword swordOne"><i className="blade"/><i className="guard"/><i className="grip"/><i className="pommel"/></span>
          <span className="sword swordTwo"><i className="blade"/><i className="guard"/><i className="grip"/><i className="pommel"/></span>
        </span>
      </button>
      {menuOpen && (
        <div id="site-mobile-navigation" className="mobileNav">
          <div className="mobileSearch"><AnimeSearch compact /></div>
          <Link href="/" onClick={closeMenu}><span>Home</span><ChevronRight size={15}/></Link>
          <Link href="/latest" onClick={closeMenu}><span>Latest anime</span><ChevronRight size={15}/></Link>
          <Link href="/upcoming" onClick={closeMenu}><span>Upcoming releases</span><ChevronRight size={15}/></Link>
          <Link href="/about" onClick={closeMenu}><span>About</span><ChevronRight size={15}/></Link>
          <div className="mobileAuth"><AuthNav /></div>
        </div>
      )}
      <style jsx global>{`
        .siteNav .mobileMenuButton { position:relative; z-index:220; }
        @media (max-width:800px) {
          .siteNav { position:sticky; top:0; z-index:2000; }
          .siteNav .mobileMenuButton { display:grid !important; place-items:center; width:42px; height:42px; flex:0 0 42px; padding:0; overflow:visible; }
          .siteNav .swordIcon { position:relative; display:block; width:34px; height:34px; flex:0 0 34px; overflow:visible; }
          .siteNav .sword { position:absolute; left:0; top:0; width:34px; height:34px; display:block; transform-origin:17px 17px; transition:transform .62s cubic-bezier(.22,1,.36,1),filter .35s ease; }
          .siteNav .swordOne { transform:translateY(-7px); }
          .siteNav .swordTwo { transform:translateY(7px) rotate(180deg); }
          .siteNav .sword .blade { position:absolute; left:3px; top:15px; width:22px; height:4px; border-radius:1px 5px 5px 1px; background:linear-gradient(180deg,#fff,#dce2df 35%,#737d78 60%,#f3f5f4); box-shadow:0 1px 2px #000,0 0 4px rgba(255,255,255,.16); }
          .siteNav .sword .blade:before { content:""; position:absolute; left:-2px; top:-4px; width:22px; height:12px; background:linear-gradient(135deg,#fff,#c8cfcb 48%,#68716c); clip-path:polygon(0 50%,76% 0,100% 50%,76% 100%); filter:drop-shadow(0 1px 1px #000); }
          .siteNav .sword .guard { position:absolute; left:23px; top:10px; width:3px; height:14px; border-radius:2px; background:linear-gradient(90deg,#d8ffac,#719a42,#cfff9c); box-shadow:0 0 5px rgba(184,255,100,.3); }
          .siteNav .sword .grip { position:absolute; left:26px; top:15px; width:7px; height:4px; border-radius:2px; background:repeating-linear-gradient(135deg,#303631 0 2px,#89928c 2px 3px); box-shadow:0 1px 2px #000; }
          .siteNav .sword .pommel { position:absolute; left:31px; top:14px; width:4px; height:6px; border-radius:50%; background:linear-gradient(135deg,#d9ffad,#6d913e); box-shadow:0 0 4px rgba(184,255,100,.25); }
          .siteNav .mobileMenuButton[aria-expanded="true"] .swordOne { transform:translate(-3px,2px) rotate(45deg); }
          .siteNav .mobileMenuButton[aria-expanded="true"] .swordTwo { transform:translate(3px,2px) rotate(135deg); }
          .siteNav .mobileMenuButton[aria-expanded="true"] .sword { filter:drop-shadow(0 0 5px rgba(184,255,100,.35)); }
          .siteNav .mobileNav { z-index:2100; }
        }
      `}</style>
    </nav>
  );
}
