import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const JIKAN = 'https://api.jikan.moe/v4';
const ANILIST = 'https://graphql.anilist.co';

type Anime = {
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
  broadcast?: { string?: string | null };
};

type AniListMedia = {
  id: number;
  idMal?: number | null;
  title: { romaji?: string | null; english?: string | null; native?: string | null };
  coverImage?: { extraLarge?: string | null; large?: string | null };
  averageScore?: number | null;
  episodes?: number | null;
  status?: string | null;
  type?: string | null;
  startDate?: { year?: number | null; month?: number | null; day?: number | null };
  description?: string | null;
  genres?: string[];
  nextAiringEpisode?: { airingAt: number; episode: number } | null;
};

function seasonInfo() {
  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const year = now.getUTCFullYear();
  if (month <= 3) return { season: 'WINTER', year, nextSeason: 'SPRING', nextYear: year };
  if (month <= 6) return { season: 'SPRING', year, nextSeason: 'SUMMER', nextYear: year };
  if (month <= 9) return { season: 'SUMMER', year, nextSeason: 'FALL', nextYear: year };
  return { season: 'FALL', year, nextSeason: 'WINTER', nextYear: year + 1 };
}

function stripHtml(value: string | null | undefined) {
  return (value || 'Synopsis not available yet.')
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ').trim();
}

function isoDate(parts?: { year?: number | null; month?: number | null; day?: number | null }) {
  if (!parts?.year || !parts.month || !parts.day) return null;
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function normalizeAniList(items: AniListMedia[]): Anime[] {
  return items.filter(a => a?.id && (a.coverImage?.extraLarge || a.coverImage?.large)).map(a => {
    const releaseDate = isoDate(a.startDate);
    return {
      id: a.idMal || a.id,
      title: a.title.english || a.title.romaji || a.title.native || 'Untitled anime',
      originalTitle: a.title.native || a.title.romaji || a.title.english || 'Untitled anime',
      image: a.coverImage?.extraLarge || a.coverImage?.large || '',
      score: a.averageScore ? a.averageScore / 10 : null,
      episodes: a.episodes ?? null,
      status: a.status || 'Unknown',
      type: a.type || 'TV',
      releaseDate,
      releaseDateText: releaseDate,
      synopsis: stripHtml(a.description),
      genres: a.genres || [],
      broadcast: a.nextAiringEpisode ? `Episode ${a.nextAiringEpisode.episode} · ${new Date(a.nextAiringEpisode.airingAt * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : null,
    };
  });
}

function normalizeJikan(items: JikanAnime[]): Anime[] {
  return items.filter(a => a?.mal_id && (a.images?.jpg?.large_image_url || a.images?.jpg?.image_url)).map(a => ({
    id: a.mal_id,
    title: a.title_english || a.title,
    originalTitle: a.title,
    image: a.images?.jpg?.large_image_url || a.images?.jpg?.image_url || '',
    score: a.score ?? null,
    episodes: a.episodes ?? null,
    status: a.status || 'Unknown',
    type: a.type || 'TV',
    releaseDate: a.aired?.from?.slice(0, 10) || null,
    releaseDateText: a.aired?.string || null,
    synopsis: stripHtml(a.synopsis),
    genres: (a.genres || []).map(g => g.name),
    broadcast: a.broadcast?.string || null,
  }));
}

async function getAniList() {
  const { season, year, nextSeason, nextYear } = seasonInfo();
  const query = `query ($season: MediaSeason!, $year: Int!, $nextSeason: MediaSeason!, $nextYear: Int!) {
    current: Page(page: 1, perPage: 30) {
      media(type: ANIME, season: $season, seasonYear: $year, status: RELEASING, sort: [POPULARITY_DESC]) {
        id idMal title { romaji english native } coverImage { extraLarge large } averageScore episodes status type startDate { year month day } description genres nextAiringEpisode { airingAt episode }
      }
    }
    upcoming: Page(page: 1, perPage: 30) {
      media(type: ANIME, season: $nextSeason, seasonYear: $nextYear, status: NOT_YET_RELEASED, sort: [START_DATE_ASC, POPULARITY_DESC]) {
        id idMal title { romaji english native } coverImage { extraLarge large } averageScore episodes status type startDate { year month day } description genres nextAiringEpisode { airingAt episode }
      }
    }
  }`;
  const response = await fetch(ANILIST, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables: { season, year, nextSeason, nextYear } }),
    next: { revalidate: 300 },
  });
  if (!response.ok) throw new Error(`AniList returned ${response.status}`);
  const json = await response.json();
  if (json.errors?.length) throw new Error('AniList GraphQL error');
  return { latest: normalizeAniList(json.data.current.media), upcoming: normalizeAniList(json.data.upcoming.media) };
}

async function getJikan() {
  const get = async (path: string) => {
    const response = await fetch(`${JIKAN}${path}`, { headers: { Accept: 'application/json' }, next: { revalidate: 300 } });
    if (!response.ok) throw new Error(`Jikan returned ${response.status}`);
    const json = await response.json();
    return (json.data || []) as JikanAnime[];
  };
  const [now, upcoming] = await Promise.all([
    get('/seasons/now?sfw=true&limit=25'),
    get('/seasons/upcoming?sfw=true&limit=25'),
  ]);
  return {
    latest: normalizeJikan(now).sort((a, b) => (b.score || 0) - (a.score || 0)),
    upcoming: normalizeJikan(upcoming).sort((a, b) => {
      if (!a.releaseDate) return 1; if (!b.releaseDate) return -1;
      return new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime();
    }),
  };
}

export async function GET() {
  try {
    // AniList is the primary source because it provides current + future season data
    // in one request. Jikan/MyAnimeList is a second independent fallback.
    let data: { latest: Anime[]; upcoming: Anime[] };
    let source: string;
    try {
      data = await getAniList();
      source = 'AniList';
      if (!data.latest.length || !data.upcoming.length) throw new Error('Incomplete AniList response');
    } catch (primaryError) {
      console.warn('AniList unavailable, falling back to Jikan:', primaryError);
      data = await getJikan();
      source = 'Jikan / MyAnimeList';
    }

    return NextResponse.json({
      latest: data.latest.slice(0, 18),
      upcoming: data.upcoming.slice(0, 18),
      source,
      updatedAt: new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('All anime providers failed:', error);
    return NextResponse.json({ latest: [], upcoming: [], error: 'Anime providers are temporarily unavailable. Please try again shortly.' }, { status: 503 });
  }
}
