'use client';

import Link from 'next/link';
import { CalendarDays, Clock3, Star } from 'lucide-react';

export type Anime = {
  id: number;
  title: string;
  originalTitle: string;
  image: string;
  score: number | null;
  episodes: number | null;
  status: string;
  type: string;
  releaseDate: string | null;
  releaseDateText: string | null;
  synopsis: string;
  genres: string[];
  broadcast: string | null;
};

export function dateLabel(value: string | null, fallback: string | null) {
  if (fallback && !/^\d{4}-\d{2}-\d{2}$/.test(fallback)) return fallback;
  if (!value) return 'Release date TBA';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

export default function AnimeCard({ anime }: { anime: Anime }) {
  return (
    <Link href={`/anime/${anime.id}`} className="cardLink" aria-label={`View ${anime.title}`}>
      <article className="card">
        <div className="poster">
          <img src={anime.image} alt={anime.title} loading="lazy" />
          <div className="score"><Star size={13} fill="currentColor" /> {anime.score?.toFixed(1) ?? '—'}</div>
          <span className="type">{anime.type}</span>
        </div>
        <div className="cardBody">
          <div className="tags">{anime.genres.slice(0, 2).map((genre) => <span key={genre}>{genre}</span>)}</div>
          <h3 title={anime.title}>{anime.title}</h3>
          <p className="synopsis">{anime.synopsis}</p>
          <div className="meta">
            <span><CalendarDays size={14} />{dateLabel(anime.releaseDate, anime.releaseDateText)}</span>
            <span>{anime.episodes ? `${anime.episodes} eps` : 'Ongoing'}</span>
          </div>
          {anime.broadcast && <div className="broadcast"><Clock3 size={13} />{anime.broadcast}</div>}
        </div>
      </article>
    </Link>
  );
}
