import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const JIKAN = 'https://api.jikan.moe/v4';

type JikanAnime = {
  mal_id: number;
  title: string;
  title_english?: string | null;
  images?: { jpg?: { large_image_url?: string; image_url?: string } };
  score?: number | null;
  episodes?: number | null;
  status?: string | null;
  aired?: { from?: string | null; to?: string | null; string?: string };
  synopsis?: string | null;
  genres?: { name: string }[];
  type?: string | null;
  year?: number | null;
  season?: string | null;
  broadcast?: { day?: string | null; time?: string | null; string?: string | null };
};

async function get(path: string) {
  const res = await fetch(`${JIKAN}${path}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Jikan returned ${res.status}`);
  return (await res.json()).data as JikanAnime[];
}

function normalize(items: JikanAnime[]) {
  return items
    .filter((a) => a?.mal_id && a?.images?.jpg?.large_image_url)
    .map((a) => ({
      id: a.mal_id,
      title: a.title_english || a.title,
      originalTitle: a.title,
      image: a.images?.jpg?.large_image_url || a.images?.jpg?.image_url,
      score: a.score ?? null,
      episodes: a.episodes ?? null,
      status: a.status ?? 'Unknown',
      type: a.type ?? 'TV',
      releaseDate: a.aired?.from ?? null,
      releaseDateText: a.aired?.string ?? null,
      synopsis: a.synopsis || 'Synopsis not available yet.',
      genres: (a.genres || []).map((g) => g.name),
      broadcast: a.broadcast?.string ?? null,
      year: a.year ?? null,
      season: a.season ?? null,
    }));
}

export async function GET() {
  try {
    const [now, upcoming] = await Promise.all([
      get('/seasons/now?sfw=true&limit=25'),
      get('/seasons/upcoming?sfw=true&limit=25'),
    ]);

    const latest = normalize(now)
      .sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0))
      .slice(0, 18);
    const next = normalize(upcoming)
      .sort((a, b) => {
        if (!a.releaseDate && !b.releaseDate) return 0;
        if (!a.releaseDate) return 1;
        if (!b.releaseDate) return -1;
        return new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime();
      })
      .slice(0, 18);

    return NextResponse.json({ latest, upcoming: next, source: 'Jikan / MyAnimeList', updatedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Anime API error:', error);
    return NextResponse.json({ latest: [], upcoming: [], error: 'The anime database is temporarily unavailable. Please refresh in a moment.' }, { status: 502 });
  }
}
