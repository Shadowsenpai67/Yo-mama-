'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Filter, RotateCcw, Search } from 'lucide-react';
import AnimeCard, { Anime } from './AnimeCard';

const GENRES = ['Action','Adventure','Comedy','Drama','Fantasy','Horror','Mystery','Romance','Sci-Fi','Slice of Life','Sports','Supernatural','Thriller'];
const TYPES = ['TV','Movie','ONA','OVA','Special','Music'];

export default function AnimeListingPage({ mode }: { mode: 'latest' | 'upcoming' }) {
  const [items, setItems] = useState<Anime[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [genre, setGenre] = useState('All genres'); const [type, setType] = useState('All types'); const [query, setQuery] = useState(''); const [page, setPage] = useState(1); const [total, setTotal] = useState(0); const [hasNext, setHasNext] = useState(false); const pageSize = 24;

  useEffect(() => setPage(1), [mode, genre, type, query]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true); setError('');
      try {
        const params = new URLSearchParams({ section: mode, page: String(page), limit: String(pageSize) });
        if (genre !== 'All genres') params.set('genre', genre); if (type !== 'All types') params.set('type', type); if (query.trim()) params.set('search', query.trim());
        const response = await fetch(`/api/anime?${params}`, { signal: controller.signal, cache: 'no-store' }); const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load anime.');
        setItems(data.data || data.items || []); setTotal(data.pagination?.total || 0); setHasNext(Boolean(data.pagination?.hasNextPage));
      } catch (e) { if ((e as Error).name !== 'AbortError') setError(e instanceof Error ? e.message : 'Unable to load anime.'); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, query ? 300 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [mode, genre, type, query, page]);

  return <main className="listingPage">
    <div className="listingHero"><div className="listingTop"><Link href="/" className="backLink"><ArrowLeft size={15}/> Home</Link></div><span className="kicker">{mode === 'latest' ? 'ON AIR NOW' : 'COMING SOON'}</span><h1>{mode === 'latest' ? 'Latest anime' : 'Upcoming releases'}</h1><p>{mode === 'latest' ? 'Explore the current lineup with live ratings, formats, genres and broadcast details.' : 'Discover announced anime releases, ordered by their expected release date.'}</p></div>
    <section className="catalog">
      <div className="filterBar"><div className="filterTitle"><Filter size={16}/> Filters</div><label className="filterSearch"><Search size={15}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search anime..."/></label><select value={genre} onChange={(e) => setGenre(e.target.value)}><option>All genres</option>{GENRES.map((g) => <option key={g}>{g}</option>)}</select><select value={type} onChange={(e) => setType(e.target.value)}><option>All types</option>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>{(genre !== 'All genres' || type !== 'All types' || query) && <button className="resetFilters" onClick={() => { setGenre('All genres'); setType('All types'); setQuery(''); }}><RotateCcw size={14}/> Reset</button>}</div>
      <div className="catalogSummary"><span>{total} anime found</span><span>Page {page}{hasNext ? '+' : ''}</span></div>
      {error && <div className="error"><span>{error}</span><button onClick={() => setPage((p) => p)}>Try again</button></div>}
      {loading ? <div className="skeletonGrid">{Array.from({ length: 12 }).map((_, i) => <div className="skeleton" key={i}/>)}</div> : items.length ? <div className="grid">{items.map((anime) => <AnimeCard key={`${anime.provider}-${anime.id}`} anime={anime}/>)}</div> : <div className="empty">No anime match your filters.</div>}
      {!loading && (page > 1 || hasNext) && <div className="pagination"><button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft size={16}/> Previous</button><div>{page}</div><button disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight size={16}/></button></div>}
    </section>
  </main>;
}
