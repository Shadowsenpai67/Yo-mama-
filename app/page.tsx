'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronRight, Clock3, Flame, Search, Sparkles, Star, RefreshCw, AlertCircle } from 'lucide-react';

type Anime = { id:number; title:string; originalTitle:string; image:string; score:number|null; episodes:number|null; status:string; type:string; releaseDate:string|null; releaseDateText:string|null; synopsis:string; genres:string[]; broadcast:string|null };

function dateLabel(value:string|null, fallback:string|null){
  if (fallback) return fallback;
  if (!value) return 'Release date TBA';
  return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(new Date(value));
}

function Card({a}:{a:Anime}){
  return <article className="card">
    <div className="poster"><img src={a.image} alt={a.title} loading="lazy"/><div className="score"><Star size={13} fill="currentColor"/> {a.score?.toFixed(1) ?? '—'}</div><span className="type">{a.type}</span></div>
    <div className="cardBody"><div className="tags">{a.genres?.slice(0,2).map(g=><span key={g}>{g}</span>)}</div><h3 title={a.title}>{a.title}</h3><p className="synopsis">{a.synopsis}</p><div className="meta"><span><CalendarDays size={14}/>{dateLabel(a.releaseDate,a.releaseDateText)}</span><span>{a.episodes ? `${a.episodes} eps` : 'Ongoing'}</span></div>{a.broadcast&&<div className="broadcast"><Clock3 size={13}/>{a.broadcast}</div>}</div>
  </article>
}

export default function Home(){
 const [latest,setLatest]=useState<Anime[]>([]),[upcoming,setUpcoming]=useState<Anime[]>([]),[q,setQ]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState(''),[updated,setUpdated]=useState('');
 const load=async()=>{setLoading(true);setError('');try{const r=await fetch('/api/anime',{cache:'no-store'});const data=await r.json();if(!r.ok)throw new Error(data.error);setLatest(data.latest||[]);setUpcoming(data.upcoming||[]);setUpdated(data.updatedAt||'')}catch(e){setError(e instanceof Error?e.message:'Unable to load anime data.')}finally{setLoading(false)}};
 useEffect(()=>{load()},[]);
 const filter=(items:Anime[])=>items.filter(a=>`${a.title} ${a.originalTitle} ${a.genres.join(' ')}`.toLowerCase().includes(q.toLowerCase()));
 const total=useMemo(()=>latest.length+upcoming.length,[latest,upcoming]);
 return <main>
  <nav><a className="brand" href="#top"><span className="logo"><Sparkles size={18}/></span><b>AniPulse</b></a><div className="navlinks"><a href="#latest">Latest</a><a href="#upcoming">Upcoming</a><a href="#how">About</a></div><label className="search"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search anime..."/></label></nav>
  <section id="top" className="hero"><div className="heroGlow"/><div className="heroCopy"><div className="eyebrow"><Flame size={14}/> LIVE ANIME RADAR</div><h1>Your next<br/><em>favorite anime.</em></h1><p>Browse what is airing now and what is coming next, with real titles, artwork, release dates and synopses pulled from a public anime database.</p><div className="heroActions"><a className="primary" href="#latest">Explore latest <ChevronRight size={17}/></a><span><span className="liveDot"/> Jikan / MyAnimeList data</span></div></div><div className="heroPanel"><div className="panelTop"><span>DATABASE STATUS</span><span className="online"><i/> ONLINE</span></div><div className="bigNumber">{total || '—'}</div><p>anime currently surfaced across this season and the upcoming slate.</p><div className="miniStats"><div><b>{latest.length}</b><span>airing now</span></div><div><b>{upcoming.length}</b><span>coming soon</span></div></div></div></section>
  <section id="latest" className="section"><div className="sectionHead"><div><span className="kicker">ON AIR NOW</span><h2>Latest anime</h2><p>Shows in the current season, ranked by score.</p></div><button onClick={load} className="refresh" disabled={loading}><RefreshCw size={15} className={loading?'spin':''}/> Refresh</button></div>{error&&<div className="error"><AlertCircle size={18}/><span>{error}</span><button onClick={load}>Try again</button></div>}{loading&&!latest.length?<div className="skeletonGrid">{Array.from({length:8}).map((_,i)=><div className="skeleton" key={i}/>)}</div>:<div className="grid">{filter(latest).map(a=><Card key={a.id} a={a}/>)}</div>}{!loading&&!error&&!filter(latest).length&&<div className="empty">No anime matched “{q}”.</div>}</section>
  <section id="upcoming" className="section upcoming"><div className="sectionHead"><div><span className="kicker">COMING SOON</span><h2>Upcoming releases</h2><p>Known future releases, ordered by their earliest announced date.</p></div><a className="textLink" href="#upcoming">Browse all <ChevronRight size={16}/></a></div>{loading&&!upcoming.length?<div className="skeletonGrid">{Array.from({length:8}).map((_,i)=><div className="skeleton" key={i}/>)}</div>:<div className="grid">{filter(upcoming).map(a=><Card key={a.id} a={a}/>)}</div>}</section>
  <section id="how" className="info"><div><span className="kicker">ABOUT THE DATA</span><h2>Real anime data, not placeholders.</h2><p>AniPulse uses <strong>Jikan v4</strong>, an open-source REST API that exposes public MyAnimeList data. The app requests the current-season and upcoming-season endpoints from our Next.js server, then normalizes titles, artwork, dates, scores, genres and synopses for the UI.</p></div><div className="sourceBox"><span>DATA SOURCE</span><b>Jikan API v4</b><small>Public · No API key required</small><small>Images & metadata · MyAnimeList</small>{updated&&<small>Last synced · {new Date(updated).toLocaleTimeString()}</small>}</div></section>
  <footer><div className="brand"><span className="logo"><Sparkles size={16}/></span><b>AniPulse</b></div><span>Anime data via Jikan · MyAnimeList</span></footer>
 </main>
}
