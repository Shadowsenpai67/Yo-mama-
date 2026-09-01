'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart3, ChevronRight, Gamepad2, RefreshCw, Users, Zap, Heart, ThumbsUp } from 'lucide-react';
import SiteNav from '@/components/SiteNav';

type Island = {
  code: string;
  title?: string;
  creatorCode?: string;
  category?: string;
  createdIn?: string;
  tags?: string[];
  metrics?: {
    plays: number | null;
    uniquePlayers: number | null;
    peakCCU: number | null;
    minutesPlayed: number | null;
    averageMinutesPerPlayer: number | null;
    favorites: number | null;
    recommendations: number | null;
  } | null;
};

const fmt = (value: number | null | undefined) => value == null ? '—' : Intl.NumberFormat('en-US', { notation: value > 999999 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value);

export default function FortnitePage() {
  const [islands, setIslands] = useState<Island[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/fortnite?limit=12&orderBy=plays', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Unable to load Fortnite data.');
      setIslands(json.data || []); setUpdated(json.updatedAt || new Date().toISOString());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load Fortnite data.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return <main className="fortnitePage">
    <SiteNav />
    <section className="fortniteHero">
      <div>
        <span className="kicker"><Gamepad2 size={14}/> FORTNITE DATA</span>
        <h1>Fortnite islands,<br/><em>backed by real data.</em></h1>
        <p>Explore public and discoverable Fortnite islands using engagement metrics supplied directly by Epic Games' public Fortnite Data API.</p>
        <div className="fortniteActions"><Link className="primary" href="https://www.fortnite.com/" target="_blank">Open Fortnite <ChevronRight size={16}/></Link><span><i/> Epic API connected</span></div>
      </div>
      <div className="fortniteHeroCard"><span>DATA SOURCE</span><b>Epic Games</b><small>Public Fortnite Data API</small><small>{updated ? `Synced ${new Date(updated).toLocaleTimeString()}` : 'Syncing…'}</small></div>
    </section>

    <section className="fortniteCatalog">
      <div className="fortniteHeader"><div><span className="kicker">TOP ISLANDS</span><h2>Popular right now</h2><p>Ranked using the API's published play metrics.</p></div><button className="refresh" onClick={load} disabled={loading}><RefreshCw size={14} className={loading ? 'spin' : ''}/> Refresh</button></div>
      {error && <div className="error">{error}<button onClick={load}>Try again</button></div>}
      {loading ? <div className="fortniteGrid">{Array.from({length:8}).map((_,i)=><div className="fortniteSkeleton" key={i}/>)}</div> : <div className="fortniteGrid">
        {islands.map((island, index) => <article className="fortniteCard" key={island.code}>
          <div className="fortniteRank">#{index + 1}</div>
          <div className="fortniteCardTop"><div className="gameIcon"><Gamepad2 size={22}/></div><span>{island.category || 'Fortnite Island'}</span></div>
          <h3>{island.title || 'Untitled Island'}</h3>
          <code>{island.code}</code>
          <div className="fortniteTags">{(island.tags || []).slice(0,3).map(tag => <span key={tag}>{tag}</span>)}</div>
          <div className="metricGrid">
            <div><BarChart3 size={14}/><b>{fmt(island.metrics?.plays)}</b><small>plays</small></div>
            <div><Users size={14}/><b>{fmt(island.metrics?.uniquePlayers)}</b><small>unique players</small></div>
            <div><Zap size={14}/><b>{fmt(island.metrics?.peakCCU)}</b><small>peak CCU</small></div>
            <div><Heart size={14}/><b>{fmt(island.metrics?.favorites)}</b><small>favorites</small></div>
            <div><ThumbsUp size={14}/><b>{fmt(island.metrics?.recommendations)}</b><small>recommends</small></div>
            <div><BarChart3 size={14}/><b>{fmt(island.metrics?.minutesPlayed)}</b><small>minutes played</small></div>
          </div>
          <a className="fortnitePlay" href={`https://www.fortnite.com/@${island.creatorCode || 'epic'}/${island.code}`} target="_blank" rel="noreferrer">View on Fortnite <ChevronRight size={14}/></a>
        </article>)}
      </div>}
    </section>

    <section className="fortniteInfo"><div><span className="kicker">ABOUT THE API</span><h2>Official, aggregated statistics.</h2><p>Epic says the public Fortnite Data API provides metrics such as minutes played, plays, favorites, recommendations, peak concurrent players, unique players and retention. It covers public and discoverable islands and currently exposes recent intervals plus up to seven days of history.</p></div><div className="apiFacts"><b>PUBLIC</b><span>No API key required</span><b>7 DAYS</b><span>Historical window</span><b>AGGREGATED</b><span>No personal player data</span></div></section>
  </main>;
}

