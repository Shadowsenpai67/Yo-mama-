'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, Clock3, Film, Globe2, Play, Star, Tv, Users } from 'lucide-react';

type Detail = { id:number; title:string; originalTitle:string; image:string; bannerImage:string; score:number|null; popularity:number|null; episodes:number|null; duration:string|null; status:string; format:string; country:string; releaseDate:string|null; endDate:string|null; season:string|null; seasonYear:number|null; synopsis:string; genres:string[]; studios:string[]; tags:string[]; broadcast:string|null; trailer:string|null; source:string };

function prettyDate(value:string|null){ if(!value) return 'TBA'; return new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric'}).format(new Date(value)); }
function titleCase(value:string|null){ return value ? value.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()) : '—'; }

export default function AnimeOverview({ params }: { params: Promise<{ id:string }> }) {
 const [anime,setAnime]=useState<Detail|null>(null); const [error,setError]=useState(''); const [loading,setLoading]=useState(true);
 useEffect(()=>{ params.then(({id})=>fetch(`/api/anime/${id}`,{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);setAnime(d)}).catch(e=>setError(e.message||'Unable to load anime.')).finally(()=>setLoading(false))) },[params]);
 if(loading) return <main className="detailPage"><div className="detailSkeleton"/></main>;
 if(error||!anime) return <main className="detailPage"><Link href="/" className="backLink"><ArrowLeft size={15}/> Back home</Link><div className="error detailError">{error||'Anime not found.'}<Link href="/latest">Browse latest anime</Link></div></main>;
 return <main className="detailPage">
   <div className="detailBanner" style={{backgroundImage:`linear-gradient(90deg,#08090d 5%,#08090ddd 48%,#08090d88),url(${anime.bannerImage||anime.image})`}}/>
   <div className="detailShell">
    <div className="detailNav"><Link href="/" className="backLink"><ArrowLeft size={15}/> Home</Link><Link href="/latest" className="backLink">Latest</Link><Link href="/upcoming" className="backLink">Upcoming</Link></div>
    <section className="detailHero">
      <div className="detailPoster"><img src={anime.image} alt={anime.title}/></div>
      <div className="detailIntro">
       <div className="eyebrow">{anime.status.replaceAll('_',' ')} · {anime.format}</div>
       <h1>{anime.title}</h1><p className="nativeTitle">{anime.originalTitle}</p>
       <div className="detailStats"><span className="rating"><Star size={15} fill="currentColor"/>{anime.score?.toFixed(1) ?? '—'}</span><span><Tv size={15}/>{anime.episodes ? `${anime.episodes} episodes` : 'Episodes TBA'}</span><span><Clock3 size={15}/>{anime.duration||'Runtime TBA'}</span></div>
       <div className="detailTags">{anime.genres.map(g=><span key={g}>{g}</span>)}</div>
       {anime.trailer&&<a className="primary trailerBtn" href={anime.trailer} target="_blank" rel="noreferrer"><Play size={15} fill="currentColor"/> Watch trailer</a>}
      </div>
    </section>
    <section className="detailGrid">
      <article className="detailContent"><span className="kicker">OVERVIEW</span><h2>About {anime.title}</h2><p className="longSynopsis">{anime.synopsis}</p>{anime.tags.length>0&&<><h3>More like this</h3><div className="detailTags mutedTags">{anime.tags.map(t=><span key={t}>{t}</span>)}</div></>}</article>
      <aside className="facts"><span className="kicker">DETAILS</span><div className="fact"><CalendarDays/><div><small>Release date</small><b>{prettyDate(anime.releaseDate)}</b></div></div><div className="fact"><CalendarDays/><div><small>End date</small><b>{prettyDate(anime.endDate)}</b></div></div><div className="fact"><Film/><div><small>Season</small><b>{titleCase(anime.season)} {anime.seasonYear||''}</b></div></div><div className="fact"><Globe2/><div><small>Origin</small><b>{anime.country}</b></div></div><div className="fact"><Users/><div><small>Studio</small><b>{anime.studios.length?anime.studios.join(', '):'Not listed'}</b></div></div>{anime.broadcast&&<div className="broadcast bigBroadcast"><Clock3 size={15}/>{anime.broadcast}</div>}<small className="dataSource">Data via {anime.source}</small></aside>
    </section>
   </div>
 </main>
}
