'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, ChevronRight, Clock3, Flame, Play, Search, Sparkles, Star } from 'lucide-react';

type Anime = { mal_id:number; title:string; images:{jpg:{large_image_url:string}}; score:number|null; episodes:number|null; status:string; aired:{from:string|null;to:string|null}; genres:{name:string}[] };

const api = 'https://api.jikan.moe/v4';
const fallback: Anime[] = [
  {mal_id:1,title:'Loading your anime universe…',images:{jpg:{large_image_url:'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=900&q=80'}},score:8.8,episodes:24,status:'Currently Airing',aired:{from:null,to:null},genres:[{name:'Fantasy'}]}
];

function fmtDate(value:string|null){ if(!value)return 'TBA'; return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(new Date(value)); }
function Card({a}:{a:Anime}){ return <article className="card"><div className="poster"><img src={a.images?.jpg?.large_image_url} alt=""/><div className="score"><Star size={13} fill="currentColor"/> {a.score?.toFixed(1) ?? '—'}</div></div><div className="cardBody"><div className="tags">{a.genres?.slice(0,2).map(g=><span key={g.name}>{g.name}</span>)}</div><h3>{a.title}</h3><div className="meta"><span><CalendarDays size={14}/>{fmtDate(a.aired?.from)}</span><span>{a.episodes ? `${a.episodes} eps` : 'Ongoing'}</span></div></div></article> }

export default function Home(){
 const [latest,setLatest]=useState<Anime[]>(fallback),[upcoming,setUpcoming]=useState<Anime[]>([]),[q,setQ]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{ (async()=>{try{const [l,u]=await Promise.all([fetch(`${api}/anime?status=airing&order_by=popularity&sort=asc&limit=8`).then(r=>r.json()),fetch(`${api}/anime?status=upcoming&order_by=popularity&sort=asc&limit=8`).then(r=>r.json())]);setLatest(l.data||[]);setUpcoming(u.data||[]);}catch(e){console.error(e)}finally{setLoading(false)}})()},[]);
 const filtered=(items:Anime[])=>items.filter(a=>a.title.toLowerCase().includes(q.toLowerCase()));
 return <main>
  <nav><div className="brand"><span className="logo"><Sparkles size={18}/></span><b>AniPulse</b></div><div className="navlinks"><a href="#latest">Latest</a><a href="#upcoming">Upcoming</a><a href="#calendar">Calendar</a></div><div className="search"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search anime..."/></div></nav>
  <section className="hero"><div className="heroGlow"/><div className="heroCopy"><div className="eyebrow"><Flame size={14}/> YOUR ANIME RADAR</div><h1>Never miss the<br/><em>next episode.</em></h1><p>Track what’s airing now, discover what’s coming next, and keep your watchlist ahead of the curve.</p><div className="heroActions"><a className="primary" href="#latest">Explore latest <ChevronRight size={17}/></a><span><Clock3 size={16}/> Updated live from Jikan</span></div></div><div className="heroArt"><div className="artRing"/><img src="https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1100&q=85" alt="Anime-inspired artwork"/><div className="floatCard"><div className="pulse"><Play size={13} fill="currentColor"/></div><div><b>Live releases</b><small>Fresh data every visit</small></div></div></div></section>
  <section id="latest" className="section"><div className="sectionHead"><div><span className="kicker">ON AIR NOW</span><h2>Latest anime</h2></div><a href="#latest">View all <ChevronRight size={16}/></a></div><div className="grid">{filtered(latest).slice(0,8).map(a=><Card key={a.mal_id} a={a}/>)}</div>{loading&&<div className="loading">Syncing with the anime database…</div>}</section>
  <section id="upcoming" className="section upcoming"><div className="sectionHead"><div><span className="kicker">COMING SOON</span><h2>Upcoming releases</h2></div><a href="#upcoming">View all <ChevronRight size={16}/></a></div><div className="grid">{filtered(upcoming).slice(0,8).map(a=><Card key={a.mal_id} a={a}/>)}</div></section>
  <section id="calendar" className="calendar"><div><span className="kicker">RELEASE CALENDAR</span><h2>Know what’s next.</h2><p>Release dates are sourced from Jikan, the unofficial MyAnimeList API. Dates marked TBA have not been announced yet.</p></div><div className="calendarStat"><b>{latest.length + upcoming.length}</b><span>titles tracked<br/>right now</span></div></section>
  <footer><div className="brand"><span className="logo"><Sparkles size={16}/></span><b>AniPulse</b></div><span>Anime data via Jikan API · Images from MyAnimeList</span></footer>
 </main>
}
