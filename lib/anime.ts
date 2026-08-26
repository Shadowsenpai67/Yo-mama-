import { unstable_cache } from 'next/cache';

export type Anime = {
  id: number;
  providerId: string | number;
  provider: 'AniList' | 'Jikan / MyAnimeList' | 'Kitsu';
  slug: string;
  title: string;
  englishTitle: string | null;
  nativeTitle: string | null;
  originalTitle: string;
  synopsis: string;
  detailedDescription: string;
  coverImage: string;
  bannerImage: string | null;
  trailerUrl: string | null;
  score: number | null;
  popularity: number | null;
  rank: number | null;
  type: string;
  status: string;
  episodes: number | null;
  duration: string | null;
  genres: string[];
  tags: string[];
  season: string | null;
  seasonYear: number | null;
  startDate: string | null;
  endDate: string | null;
  releaseDateText: string | null;
  nextAiringEpisode: number | null;
  nextAiringAt: string | null;
  broadcast: string | null;
  studios: string[];
  source: string | null;
  country: string | null;
  isUpcoming: boolean;
  isCurrentlyAiring: boolean;
};

export type CatalogResult = { latest: Anime[]; upcoming: Anime[] };

const ANILIST = 'https://graphql.anilist.co';
const JIKAN = 'https://api.jikan.moe/v4';
const KITSU = 'https://kitsu.io/api/edge';
const TIMEOUT_MS = 7000;
const MEDIA_FIELDS = `id idMal title { romaji english native } coverImage { extraLarge large } bannerImage averageScore popularity episodes duration status format countryOfOrigin season seasonYear startDate { year month day } endDate { year month day } description genres studios { nodes { name } } tags { name rank } nextAiringEpisode { airingAt episode } trailer { id site }`;

function stripHtml(value: string | null | undefined) {
  return (value || 'Synopsis not available yet.')
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}

function dateFromParts(value?: { year?: number | null; month?: number | null; day?: number | null }) {
  if (!value?.year || !value.month || !value.day) return null;
  return `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
}

function slugify(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'anime';
}

async function fetchJson<T>(url: string, init?: RequestInit, attempts = 1): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal, headers: { Accept: 'application/json', ...(init?.headers || {}) }, next: { revalidate: 300, tags: ['anime'] } });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.json() as T;
    } catch (error) {
      last = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 300));
    } finally { clearTimeout(timer); }
  }
  throw last instanceof Error ? last : new Error('Provider request failed');
}

function normalizeAniList(a: any): Anime {
  const title = a.title?.english || a.title?.romaji || a.title?.native || 'Untitled anime';
  const startDate = dateFromParts(a.startDate);
  const endDate = dateFromParts(a.endDate);
  const nextAt = a.nextAiringEpisode?.airingAt ? new Date(a.nextAiringEpisode.airingAt * 1000).toISOString() : null;
  return {
    id: a.idMal || a.id, providerId: a.id, provider: 'AniList', slug: slugify(title) + '-' + (a.idMal || a.id),
    title, englishTitle: a.title?.english || null, nativeTitle: a.title?.native || null, originalTitle: a.title?.native || a.title?.romaji || title,
    synopsis: stripHtml(a.description), detailedDescription: stripHtml(a.description), coverImage: a.coverImage?.extraLarge || a.coverImage?.large || '', bannerImage: a.bannerImage || null,
    trailerUrl: a.trailer?.site === 'youtube' && a.trailer?.id ? `https://www.youtube.com/watch?v=${a.trailer.id}` : null,
    score: typeof a.averageScore === 'number' ? a.averageScore / 10 : null, popularity: a.popularity ?? null, rank: null,
    type: a.format || 'TV', status: a.status || 'Unknown', episodes: a.episodes ?? null, duration: a.duration ? `${a.duration} min` : null,
    genres: a.genres || [], tags: (a.tags || []).filter((t: any) => (t.rank ?? 100) >= 20).slice(0, 12).map((t: any) => t.name),
    season: a.season || null, seasonYear: a.seasonYear ?? null, startDate, endDate, releaseDateText: startDate,
    nextAiringEpisode: a.nextAiringEpisode?.episode ?? null, nextAiringAt: nextAt,
    broadcast: a.nextAiringEpisode ? `Episode ${a.nextAiringEpisode.episode} · ${new Date(a.nextAiringEpisode.airingAt * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : null,
    studios: (a.studios?.nodes || []).map((s: any) => s.name), source: null, country: a.countryOfOrigin || null,
    isUpcoming: a.status === 'NOT_YET_RELEASED', isCurrentlyAiring: a.status === 'RELEASING',
  };
}

function normalizeJikan(a: any): Anime {
  const title = a.title_english || a.title || 'Untitled anime';
  const startDate = a.aired?.from?.slice(0, 10) || null;
  return {
    id: a.mal_id, providerId: a.mal_id, provider: 'Jikan / MyAnimeList', slug: slugify(title) + '-' + a.mal_id,
    title, englishTitle: a.title_english || null, nativeTitle: a.title_japanese || null, originalTitle: a.title || title,
    synopsis: stripHtml(a.synopsis), detailedDescription: stripHtml(a.synopsis), coverImage: a.images?.jpg?.large_image_url || a.images?.jpg?.image_url || '', bannerImage: null,
    trailerUrl: a.trailer?.url || null, score: a.score ?? null, popularity: a.popularity ?? null, rank: a.rank ?? null,
    type: a.type || 'TV', status: a.status || 'Unknown', episodes: a.episodes ?? null, duration: a.duration || null,
    genres: (a.genres || []).map((g: any) => g.name), tags: [...(a.themes || []), ...(a.demographics || [])].map((g: any) => g.name),
    season: a.season || null, seasonYear: a.year ?? null, startDate, endDate: a.aired?.to?.slice(0, 10) || null, releaseDateText: a.aired?.string || startDate,
    nextAiringEpisode: null, nextAiringAt: null, broadcast: a.broadcast?.string || null, studios: (a.studios || []).map((s: any) => s.name),
    source: a.source || null, country: 'JP', isUpcoming: a.status === 'Not yet aired', isCurrentlyAiring: a.status === 'Currently Airing',
  };
}

function normalizeKitsu(a: any): Anime {
  const x = a.attributes || {}; const title = x.titles?.en || x.canonicalTitle || x.titles?.en_jp || x.titles?.ja_jp || 'Untitled anime';
  const rawId = String(a.id); const numericId = Number(rawId) || Math.abs(rawId.split('').reduce((n, c) => ((n << 5) - n) + c.charCodeAt(0) | 0, 0));
  return {
    id: numericId, providerId: rawId, provider: 'Kitsu', slug: slugify(title) + '-' + rawId, title, englishTitle: x.titles?.en || null, nativeTitle: x.titles?.ja_jp || null, originalTitle: x.titles?.ja_jp || x.titles?.en_jp || title,
    synopsis: stripHtml(x.synopsis), detailedDescription: stripHtml(x.description || x.synopsis), coverImage: x.posterImage?.original || x.posterImage?.large || '', bannerImage: x.coverImage?.original || x.coverImage?.large || null,
    trailerUrl: null, score: x.averageRating ? Number(x.averageRating) / 10 : null, popularity: null, rank: null, type: x.showType || 'TV', status: x.status || 'Unknown', episodes: x.episodeCount ?? null, duration: x.episodeLength ? `${x.episodeLength} min` : null,
    genres: [], tags: [], season: null, seasonYear: x.startDate ? new Date(x.startDate).getUTCFullYear() : null, startDate: x.startDate?.slice(0, 10) || null, endDate: x.endDate?.slice(0, 10) || null, releaseDateText: x.startDate ? new Date(x.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null,
    nextAiringEpisode: null, nextAiringAt: null, broadcast: null, studios: [], source: null, country: 'JP', isUpcoming: x.status === 'upcoming', isCurrentlyAiring: x.status === 'current',
  };
}

async function aniListCatalog(): Promise<CatalogResult> {
  const now = new Date(); const month = now.getUTCMonth() + 1; const year = now.getUTCFullYear();
  const season = month <= 3 ? 'WINTER' : month <= 6 ? 'SPRING' : month <= 9 ? 'SUMMER' : 'FALL';
  const next = season === 'WINTER' ? 'SPRING' : season === 'SPRING' ? 'SUMMER' : season === 'SUMMER' ? 'FALL' : 'WINTER'; const nextYear = season === 'FALL' ? year + 1 : year;
  const query = `query ($season: MediaSeason!, $year: Int!, $status: MediaStatus!) { Page(page: 1, perPage: 50) { media(type: ANIME, season: $season, seasonYear: $year, status: $status, sort: [POPULARITY_DESC]) { ${MEDIA_FIELDS} } } }`;
  const request = (s: string, y: number, status: string) => fetchJson<any>(ANILIST, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables: { season: s, year: y, status } }) }).then((j) => { if (j.errors?.length || !j.data) throw new Error('AniList GraphQL error'); return (j.data.Page?.media || []).map(normalizeAniList); });
  const [latest, upcoming] = await Promise.all([request(season, year, 'RELEASING'), request(next, nextYear, 'NOT_YET_RELEASED')]);
  return { latest, upcoming };
}

async function jikanCatalog(): Promise<CatalogResult> {
  const get = (path: string) => fetchJson<any>(`${JIKAN}${path}`, { headers: { Accept: 'application/json' } }).then((j) => (j.data || []).map(normalizeJikan));
  const [latest, upcoming] = await Promise.all([get('/seasons/now?sfw=true&limit=25'), get('/seasons/upcoming?sfw=true&limit=25')]);
  return { latest: latest.sort((a: Anime, b: Anime) => (b.score || 0) - (a.score || 0)), upcoming: upcoming.sort((a: Anime, b: Anime) => (a.startDate || '9999').localeCompare(b.startDate || '9999')) };
}

async function kitsuCatalog(): Promise<CatalogResult> {
  const get = (params: string) => fetchJson<any>(`${KITSU}/anime?${params}`, { headers: { Accept: 'application/vnd.api+json' } }).then((j) => (j.data || []).map(normalizeKitsu));
  const [latest, upcoming] = await Promise.all([get('filter[status]=current&page[limit]=50&sort=-averageRating'), get('filter[status]=upcoming&page[limit]=50&sort=startDate')]);
  return { latest: latest.sort((a: Anime, b: Anime) => (b.score || 0) - (a.score || 0)), upcoming };
}

const cachedAniList = unstable_cache(aniListCatalog, ['anime-catalog-anilist'], { revalidate: 300, tags: ['anime-catalog'] });
const cachedJikan = unstable_cache(jikanCatalog, ['anime-catalog-jikan'], { revalidate: 300, tags: ['anime-catalog'] });
const cachedKitsu = unstable_cache(kitsuCatalog, ['anime-catalog-kitsu'], { revalidate: 300, tags: ['anime-catalog'] });

export async function getCatalog() {
  const providers: Array<[string, () => Promise<CatalogResult>]> = [['AniList', cachedAniList], ['Jikan / MyAnimeList', cachedJikan], ['Kitsu', cachedKitsu]];
  const results = await Promise.allSettled(providers.map(([, get]) => get()));
  let latest: Anime[] = []; let upcoming: Anime[] = []; const sources: string[] = [];
  results.forEach((result, index) => {
    if (result.status !== 'fulfilled') { console.warn(`${providers[index][0]} unavailable:`, result.reason); return; }
    if (result.value.latest.length) latest = latest.length ? latest : result.value.latest;
    if (result.value.upcoming.length) upcoming = upcoming.length ? upcoming : result.value.upcoming;
    if (result.value.latest.length || result.value.upcoming.length) sources.push(providers[index][0]);
  });
  if (!latest.length && !upcoming.length) throw new Error('All anime providers and cached data failed');
  return { latest, upcoming, source: sources.join(' + '), stale: false };
}

export async function searchAnime(query: string) {
  const q = encodeURIComponent(query.trim());
  const providers = [
    fetchJson<any>(`${ANILIST}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: `query ($search: String!) { Page(page: 1, perPage: 24) { media(type: ANIME, search: $search, sort: [SEARCH_MATCH, POPULARITY_DESC]) { ${MEDIA_FIELDS} } } }`, variables: { search: query } }) }).then((j) => (j.data?.Page?.media || []).map(normalizeAniList)),
    fetchJson<any>(`${JIKAN}/anime?q=${q}&sfw=true&limit=24&order_by=score&sort=desc`).then((j) => (j.data || []).map(normalizeJikan)),
    fetchJson<any>(`${KITSU}/anime?filter[text]=${q}&page[limit]=24&sort=-averageRating`, { headers: { Accept: 'application/vnd.api+json' } }).then((j) => (j.data || []).map(normalizeKitsu)),
  ];
  const results = await Promise.allSettled(providers);
  for (const result of results) if (result.status === 'fulfilled' && result.value.length) return result.value;
  return [];
}

export async function getAnimeById(id: number) {
  const query = `query ($id: Int, $malId: Int) { byId: Media(id: $id, type: ANIME) { ${MEDIA_FIELDS} } byMal: Media(idMal: $malId, type: ANIME) { ${MEDIA_FIELDS} } }`;
  try {
    const j = await fetchJson<any>(ANILIST, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables: { id, malId: id } }) });
    const anime = j.data?.byMal || j.data?.byId; if (anime) return normalizeAniList(anime);
  } catch (error) { console.warn('AniList detail unavailable:', error); }
  try {
    const j = await fetchJson<any>(`${JIKAN}/anime/${id}/full?sfw=true`); if (j.data) return normalizeJikan(j.data);
  } catch (error) { console.warn('Jikan detail unavailable:', error); }
  try {
    const j = await fetchJson<any>(`${KITSU}/anime?filter[id]=${id}&page[limit]=1`, { headers: { Accept: 'application/vnd.api+json' } }); if (j.data?.[0]) return normalizeKitsu(j.data[0]);
  } catch (error) { console.warn('Kitsu detail unavailable:', error); }
  return null;
}
