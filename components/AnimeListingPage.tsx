'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Filter, RotateCcw, Search } from 'lucide-react';
import AnimeCard, { Anime } from './AnimeCard';

const GENRES = ['Action','Adventure','Comedy','Drama','Fantasy','Horror','Mystery','Romance','Sci-Fi','Sports','Supernatural','Thriller'];
const TYPES = ['TV','Movie','ONA','OVA','Special','Music'];

export default function AnimeListingPage({ mode }: { mode: 'latest' | 'upcoming' }) {
  const [items, setItems] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [genre, setGenre] = useState('All genres');
  const [type, setType] = useState('All types');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 24;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError('');
      try {
        const response = await fetch(`/api/anime?section=${mode}&limit=100&refresh=${Date.now()}`, { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load anime.');
        if (!cancelled) setItems(data.items || data[mode] || []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unable to load anime.');
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [mode]);

  useEffect(() => setPage(1), [genre, type, query]);

  const filtered = useMemo(() => items.filter((anime) => {
    const text = `${anime.title} ${anime.originalTitle} ${anime.genres.join(' ')}`.toLowerCase();
    return (genre === 'All genres' || anime.genres.includes(genre)) &&
      (type === 'All types' || anime.type.toUpperCase() === type) &&
      text.includes(query.toLowerCase());
  }), [items, genre, type, query]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <main className="listingPage">
      <div className="listingHero">
        <div className="listingTop"><Link href="/" className="backLink"><ArrowLeft size={15}/> Home</Link></div>
        <span className="kicker">{mode === 'latest' ? 'ON AIR NOW' : 'COMING SOON'}</span>
        <h1>{mode === 'latest' ? 'Latest anime' : 'Upcoming releases'}</h1>
        <p>{mode === 'latest' ? 'Explore the full current-season lineup, with genres, formats, ratings and synopses.' : 'See what is scheduled next, ordered by announced release date.'}</p>
      </div>

      <section className="catalog">
        <div className="filterBar">
          <div className="filterTitle"><Filter size={16}/> Filters</div>
          <label className="filterSearch"><Search size={15}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search this catalog..."/></label>
          <select value={genre} onChange={(e) => setGenre(e.target.value)}><option>All genres</option>{GENRES.map((g) => <option key={g}>{g}</option>)}</select>
          <select value={type} onChange={(e) => setType(e.target.value)}><option>All types</option>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
          {(genre !== 'All genres' || type !== 'All types' || query) && <button className="resetFilters" onClick={() => {setGenre('All genres');setType('All types');setQuery('')}}><RotateCcw size={14}/> Reset</button>}
        </div>

        <div className="catalogSummary"><span>{filtered.length} anime found</span><span>Page {page} of {pages}</span></div>
        {error && <div className="error"><span>{error}</span><button onClick={() => location.reload()}>Try again</button></div>}
        {loading ? <div className="skeletonGrid">{Array.from({ length: 12 }).map((_, i) => <div className="skeleton" key={i}/>)}</div> : visible.length ? <div className="grid">{visible.map((anime) => <AnimeCard key={anime.id} anime={anime}/>)}</div> : <div className="empty">No anime match your filters.</div>}

        {!loading && pages > 1 && <div className="pagination"><button disabled={page === 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={16}/> Previous</button><div>{page} / {pages}</div><button disabled={page === pages} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight size={16}/></button></div>}
      </section>
    </main>
  );
}
