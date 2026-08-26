import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ANILIST = 'https://graphql.anilist.co';
const JIKAN = 'https://api.jikan.moe/v4';
const KITSU = 'https://kitsu.io/api/edge/anime';

// Keep a short-lived process cache so refreshes do not hammer public APIs.
let cached: { latest: Anime[]; upcoming: Anime[]; source: string; updatedAt: string } | null = null;
let cachedAt = 0;
const CACHE_MS = 5 * 60 * 1000;

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

type JikanAnime = {
  mal_id: number;
  title: string;
  title_english?: string | null;
  images?: { jpg?: { large_image_url?: string; image_url?: string } };
  score?: number | null;
  episodes?: number | null;
  status?: string | null;
  aired?: { from?: string | null; string?: string };
  synopsis?: string | null;
  genres?: { name: string }[];
  type?: string | null;
  broadcast?: { string?: string | null };
};

type KitsuAnime = {
  id: string;
  attributes: {
    canonicalTitle?: string | null;
    titles?: { en?: string | null; en_jp?: string | null; ja_jp?: string | null };
    posterImage?: { original?: string | null; large?: string | null };
    averageRating?: string | null;
    episodeCount?: number | null;
    status?: string | null;
    startDate?: string | null;
    synopsis?: string | null;
    showType?: string | null;
  };
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
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function isoDate(value?: { year?: number | null; month?: number | null; day?: number | null }) {
  if (!value?.year || !value.month || !value.day) return null;
  return `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
}

function normalizeAniList(items: AniListMedia[]): Anime[] {
  return items
    .filter((a) => a?.id && (a.coverImage?.extraLarge || a.coverImage?.large))
    .map((a) => {
      const date = isoDate(a.startDate);
      return {
        id: a.idMal || a.id,
        title: a.title.english || a.title.romaji || a.title.native || 'Untitled anime',
        originalTitle: a.title.native || a.title.romaji || a.title.english || 'Untitled anime',
        image: a.coverImage?.extraLarge || a.coverImage?.large || '',
        score: a.averageScore ? a.averageScore / 10 : null,
        episodes: a.episodes ?? null,
        status: a.status || 'Unknown',
        type: a.type || 'TV',
        releaseDate: date,
        releaseDateText: date,
        synopsis: stripHtml(a.description),
        genres: a.genres || [],
        broadcast: a.nextAiringEpisode
          ? `Episode ${a.nextAiringEpisode.episode} · ${new Date(a.nextAiringEpisode.airingAt * 1000).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}`
          : null,
      };
    });
}

function normalizeJikan(items: JikanAnime[]): Anime[] {
  return items
    .filter((a) => a?.mal_id && (a.images?.jpg?.large_image_url || a.images?.jpg?.image_url))
    .map((a) => ({
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
      genres: (a.genres || []).map((g) => g.name),
      broadcast: a.broadcast?.string || null,
    }));
}

function normalizeKitsu(items: KitsuAnime[]): Anime[] {
  return items
    .filter((a) => a?.id && (a.attributes?.posterImage?.large || a.attributes?.posterImage?.original))
    .map((a) => {
      const x = a.attributes;
      return {
        id: Number(a.id) || Math.abs(a.id.split('').reduce((n, c) => ((n << 5) - n) + c.charCodeAt(0) | 0, 0)),
        title: x.titles?.en || x.canonicalTitle || x.titles?.en_jp || x.titles?.ja_jp || 'Untitled anime',
        originalTitle: x.titles?.ja_jp || x.titles?.en_jp || x.canonicalTitle || 'Untitled anime',
        image: x.posterImage?.original || x.posterImage?.large || '',
        score: x.averageRating ? Number(x.averageRating) / 10 : null,
        episodes: x.episodeCount ?? null,
        status: x.status || 'Unknown',
        type: x.showType || 'TV',
        releaseDate: x.startDate?.slice(0, 10) || null,
        releaseDateText: x.startDate
          ? new Date(x.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : null,
        synopsis: stripHtml(x.synopsis),
        genres: [],
        broadcast: null,
      };
    });
}

function dateSort(a: Anime, b: Anime) {
  if (!a.releaseDate) return 1;
  if (!b.releaseDate) return -1;
  return new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime();
}

async function fetchJson(url: string, init?: RequestInit, attempts = 2) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        cache: 'no-store',
      });

      if (response.status === 429) {
        const retryAfter = Number(response.headers.get('retry-after') || 0);
        if (retryAfter > 0 && retryAfter <= 5 && attempt < attempts) {
          await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
          continue;
        }
      }

      if (!response.ok) throw new Error(`${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Provider request failed');
}

const MEDIA_FIELDS = `
  id idMal title { romaji english native }
  coverImage { extraLarge large }
  averageScore episodes status type
  startDate { year month day }
  description genres
  nextAiringEpisode { airingAt episode }
`;

async function aniListQuery(query: string, variables: Record<string, unknown>) {
  const json = await fetchJson(ANILIST, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (json.errors?.length || !json.data) throw new Error('AniList GraphQL error');
  return json.data;
}

async function getAniList() {
  const { season, year, nextSeason, nextYear } = seasonInfo();

  // Split current/upcoming into smaller requests. This avoids the large combined
  // GraphQL query that was timing out and reduces load against AniList's limits.
  const currentPromise = aniListQuery(
    `query ($season: MediaSeason!, $year: Int!) {
      Page(page: 1, perPage: 18) {
        media(type: ANIME, season: $season, seasonYear: $year, status: RELEASING, sort: [POPULARITY_DESC]) {
          ${MEDIA_FIELDS}
        }
      }
    }`,
    { season, year },
  );

  const upcomingPromise = aniListQuery(
    `query ($season: MediaSeason!, $year: Int!) {
      Page(page: 1, perPage: 18) {
        media(type: ANIME, season: $season, seasonYear: $year, status: NOT_YET_RELEASED, sort: [START_DATE_ASC, POPULARITY_DESC]) {
          ${MEDIA_FIELDS}
        }
      }
    }`,
    { season: nextSeason, year: nextYear },
  );

  const [current, upcoming] = await Promise.all([currentPromise, upcomingPromise]);
  return {
    latest: normalizeAniList(current.Page?.media || []),
    upcoming: normalizeAniList(upcoming.Page?.media || []),
  };
}

async function getJikan() {
  const get = async (path: string) => {
    const json = await fetchJson(`${JIKAN}${path}`, { headers: { Accept: 'application/json' } });
    return (json.data || []) as JikanAnime[];
  };

  const [now, upcoming] = await Promise.all([
    get('/seasons/now?sfw=true&limit=18'),
    get('/seasons/upcoming?sfw=true&limit=18'),
  ]);

  return {
    latest: normalizeJikan(now).sort((a, b) => (b.score || 0) - (a.score || 0)),
    upcoming: normalizeJikan(upcoming).sort(dateSort),
  };
}

async function getKitsu() {
  const make = async (params: string) => {
    const json = await fetchJson(`${KITSU}?${params}`, { headers: { Accept: 'application/vnd.api+json' } });
    return (json.data || []) as KitsuAnime[];
  };

  const [current, upcoming] = await Promise.all([
    make('filter[status]=current&page[limit]=18&sort=-averageRating'),
    make('filter[status]=upcoming&page[limit]=18&sort=startDate'),
  ]);

  return {
    latest: normalizeKitsu(current).sort((a, b) => (b.score || 0) - (a.score || 0)),
    upcoming: normalizeKitsu(upcoming).sort(dateSort),
  };
}

export async function GET() {
  if (cached && Date.now() - cachedAt < CACHE_MS) {
    return NextResponse.json(cached, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  }

  let latest: Anime[] = [];
  let upcoming: Anime[] = [];
  const sources: string[] = [];

  // Query providers independently. One provider outage must never blank the site.
  const results = await Promise.allSettled([
    getAniList(),
    getJikan(),
    getKitsu(),
  ]);

  for (const [index, result] of results.entries()) {
    if (result.status !== 'fulfilled') {
      console.warn(['AniList', 'Jikan', 'Kitsu'][index], 'unavailable:', result.reason);
      continue;
    }

    const name = ['AniList', 'Jikan / MyAnimeList', 'Kitsu'][index];
    if (!latest.length && result.value.latest.length) latest = result.value.latest;
    if (!upcoming.length && result.value.upcoming.length) upcoming = result.value.upcoming;
    if (result.value.latest.length || result.value.upcoming.length) sources.push(name);
  }

  if (!latest.length && !upcoming.length) {
    return NextResponse.json(
      { latest: [], upcoming: [], error: 'Anime databases are temporarily unreachable. Please try again shortly.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  cached = {
    latest: latest.slice(0, 18),
    upcoming: upcoming.slice(0, 18),
    source: sources.join(' + '),
    updatedAt: new Date().toISOString(),
  };
  cachedAt = Date.now();

  return NextResponse.json(cached, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  });
}
