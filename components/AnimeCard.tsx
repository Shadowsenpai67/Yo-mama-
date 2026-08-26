'use client';

import Link from 'next/link';
import { CalendarDays, Clock3, Star } from 'lucide-react';

export type Anime = {
  id: number;
  routeId?: string;
  title: string;
  originalTitle: string;
  coverImage?: string;
  image?: string;
  score: number | null;
  episodes: number | null;
  status: string;
  type: string;
  releaseDate?: string | null;
  startDate?: string | null;
  releaseDateText: string | null;
  synopsis: string;
  genres: string[];
  broadcast: string | null;
};

export function dateLabel(value: string | null | undefined, fallback: string | null) {
  if (fallback && !/^\d{4}-\d{2}-\d{2}$/.test(fallback)) return fallback;
  if (!value) return 'Release date TBA';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Release date TBA' : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

export default function AnimeCard({ anime }: { anime: Anime }) {
  const image = anime.coverImage || anime.image || '';
  const href = `/anime/${anime.routeId || anime.id}`;
  return (
    <Link href={href} className="cardLink" aria-label={`View ${anime.title}`}>
      <article className="card">
        <div className="poster">
          {image ? <img src={image} alt={`${anime.title} poster`} loading="lazy" /> : <div className="posterFallback">{anime.title}</div>}
          <div className="score"><Star size={13} fill="currentColor" /> {anime.score?.toFixed(1) ?? '—'}</div>
          <span className="type">{anime.type}</span>
        </div>
        <div className="cardBody">
          <div className="tags">{anime.genres.slice(0, 2).map((genre) => <span key={genre}>{genre}</span>)}</div>
          <h3 title={anime.title}>{anime.title}</h3>
          <p className="synopsis">{anime.synopsis}</p>
          <div className="meta">
            <span><CalendarDays size={14} />{dateLabel(anime.releaseDate || anime.startDate, anime.releaseDateText)}</span>
            <span>{anime.episodes ? `${anime.episodes} eps` : 'Ongoing'}</span>
          </div>
          {anime.broadcast && <div className="broadcast"><Clock3 size={13} />{anime.broadcast}</div>}
        </div>
      </article>
    </Link>
  );
}
