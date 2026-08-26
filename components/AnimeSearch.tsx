'use client';

import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type Result = { id:number; routeId?:string; title:string; originalTitle:string; coverImage?:string; image?:string; type:string; score:number|null; synopsis:string };

export default function AnimeSearch({ compact=false }: { compact?: boolean }) {
  const [query,setQuery]=useState('');
  const [results,setResults]=useState<Result[]>([]);
  const [loading,setLoading]=useState(false);
  const [searched,setSearched]=useState(false);
  const [open,setOpen]=useState(false);
  const ref=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    const value=query.trim();
    if(value.length<2){setResults([]);setSearched(false);setLoading(false);return;}
    const controller=new AbortController();
    const timer=setTimeout(async()=>{
      setLoading(true);setOpen(true);
      try{const r=await fetch(`/api/anime?search=${encodeURIComponent(value)}&page=1&limit=12`,{signal:controller.signal,cache:'no-store'});const d=await r.json();setResults(r.ok?(d.data||[]):[]);setSearched(true);}
      catch(e){if((e as Error).name!=='AbortError')setResults([]);}
      finally{if(!controller.signal.aborted)setLoading(false);}
    },300);
    return()=>{clearTimeout(timer);controller.abort();};
  },[query]);

  useEffect(()=>{const close=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false)};document.addEventListener('mousedown',close);return()=>document.removeEventListener('mousedown',close)},[]);

  return <div ref={ref} style={{position:'relative',width:compact?'100%':230}}>
    <label className="search" style={{width:'100%'}}><Search size={17}/><input value={query} onFocus={()=>query.trim().length>=2&&setOpen(true)} onChange={e=>setQuery(e.target.value)} placeholder="Search anime..." aria-label="Search anime"/>{query&&<button aria-label="Clear search" onClick={()=>{setQuery('');setOpen(false)}} style={{border:0,background:'transparent',color:'#777',padding:0}}><X size={14}/></button>}</label>
    {open&&<div style={{position:'absolute',top:'calc(100% + 10px)',left:0,right:0,minWidth:compact?300:360,maxHeight:480,overflowY:'auto',zIndex:100,background:'#101117',border:'1px solid #ffffff15',borderRadius:14,boxShadow:'0 25px 70px #000b',padding:8}}>
      {loading&&<div style={{padding:18,color:'#858791',fontSize:12}}>Searching anime databases…</div>}
      {!loading&&searched&&!results.length&&<div style={{padding:18,color:'#858791',fontSize:12}}>No anime found for <b style={{color:'#fff'}}>{query.trim()}</b>.</div>}
      {!loading&&results.map(a=>{const image=a.coverImage||a.image;return <Link key={`${a.routeId||a.id}-${a.title}`} href={`/anime/${a.routeId||a.id}`} onClick={()=>setOpen(false)} style={{display:'flex',gap:10,padding:9,borderRadius:10,alignItems:'center'}}>
        {image?<img src={image} alt="" style={{width:42,height:58,objectFit:'cover',borderRadius:6,background:'#191a20'}}/>:<div style={{width:42,height:58,borderRadius:6,background:'#191a20'}}/>}
        <span style={{minWidth:0}}><b style={{display:'block',fontSize:12,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{a.title}</b><small style={{display:'block',color:'#777984',marginTop:4}}>{a.type} · {a.score?.toFixed(1)??'—'}</small><small style={{display:'block',color:'#656873',marginTop:3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{a.synopsis}</small></span>
      </Link>})}
      {!loading&&searched&&results.length>0&&<Link href={`/latest?search=${encodeURIComponent(query.trim())}`} onClick={()=>setOpen(false)} style={{display:'block',textAlign:'center',padding:10,color:'#b8ff64',fontSize:11,borderTop:'1px solid #ffffff08',marginTop:4}}>View all search results</Link>}
    </div>}
  </div>;
}
