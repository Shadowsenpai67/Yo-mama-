import { NextResponse } from 'next/server';

const ANILIST = 'https://graphql.anilist.co';
const JIKAN = 'https://api.jikan.moe/v4';

async function fetchJson(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
    if (!response.ok) throw new Error(String(response.status));
    return await response.json();
  } finally { clearTimeout(timer); }
}

function clean(value: string | null | undefined) {
  return (value || 'Description not available yet.')
    .replace(/<br\s*\/?\s*>/gi, ' ').replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ').trim();
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) return NextResponse.json({ error: 'Invalid anime id.' }, { status: 400 });

  try {
    const query = `query ($id: Int, $malId: Int) {
      Media(id: $id, type: ANIME) {
        id idMal title { romaji english native } coverImage { extraLarge large } bannerImage
        averageScore popularity episodes duration status format countryOfOrigin
        season seasonYear startDate { year month day } endDate { year month day }
        description genres synonyms
        studios { nodes { name } }
        producers: studios { nodes { name } }
        tags { name rank }
        nextAiringEpisode { airingAt episode }
        trailer { id site thumbnail }
      }
      Mal: Media(idMal: $malId, type: ANIME) {
        id idMal title { romaji english native } coverImage { extraLarge large } bannerImage
        averageScore popularity episodes duration status format countryOfOrigin
        season seasonYear startDate { year month day } endDate { year month day }
        description genres synonyms
        studios { nodes { name } }
        tags { name rank }
        nextAiringEpisode { airingAt episode }
        trailer { id site thumbnail }
      }
    }`;

    const data = await fetchJson(ANILIST, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables: { id: numericId, malId: numericId } }),
    });
    const anime = data.data?.Media || data.data?.Mal;
    if (anime) return NextResponse.json(normalizeAniList(anime));
  } catch (error) {
    console.warn('AniList detail failed:', error);
  }

  try {
    const json = await fetchJson(`${JIKAN}/anime/${numericId}/full?sfw=true`, { headers: { Accept: 'application/json' } });
    const a = json.data;
    return NextResponse.json({
      id: a.mal_id, title: a.title_english || a.title, originalTitle: a.title,
      image: a.images?.jpg?.large_image_url || a.images?.jpg?.image_url, bannerImage: a.images?.jpg?.large_image_url,
      score: a.score ?? null, popularity: a.popularity ?? null, episodes: a.episodes ?? null, duration: a.duration || null,
      status: a.status || 'Unknown', format: a.type || 'TV', country: 'JP',
      releaseDate: a.aired?.from?.slice(0, 10) || null, endDate: a.aired?.to?.slice(0, 10) || null,
      season: a.season || null, seasonYear: a.year || null, synopsis: clean(a.synopsis),
      genres: (a.genres || []).map((g: { name: string }) => g.name), studios: (a.studios || []).map((s: { name: string }) => s.name),
      tags: [...(a.themes || []), ...(a.demographics || [])].map((x: { name: string }) => x.name),
      broadcast: a.broadcast?.string || null,
      trailer: a.trailer?.url || null,
      source: 'Jikan / MyAnimeList',
    });
  } catch (error) {
    console.error('Anime detail providers failed:', error);
    return NextResponse.json({ error: 'Anime details are temporarily unavailable.' }, { status: 503 });
  }
}

function normalizeAniList(a: any) {
  const start = a.startDate?.year && a.startDate?.month && a.startDate?.day ? `${a.startDate.year}-${String(a.startDate.month).padStart(2,'0')}-${String(a.startDate.day).padStart(2,'0')}` : null;
  const end = a.endDate?.year && a.endDate?.month && a.endDate?.day ? `${a.endDate.year}-${String(a.endDate.month).padStart(2,'0')}-${String(a.endDate.day).padStart(2,'0')}` : null;
  return {
    id: a.idMal || a.id, title: a.title.english || a.title.romaji || a.title.native, originalTitle: a.title.native || a.title.romaji,
    image: a.coverImage?.extraLarge || a.coverImage?.large, bannerImage: a.bannerImage || a.coverImage?.extraLarge,
    score: a.averageScore ? a.averageScore / 10 : null, popularity: a.popularity ?? null, episodes: a.episodes ?? null, duration: a.duration ? `${a.duration} min` : null,
    status: a.status || 'Unknown', format: a.format || 'TV', country: a.countryOfOrigin || 'JP', releaseDate: start, endDate: end,
    season: a.season || null, seasonYear: a.seasonYear || null, synopsis: clean(a.description), genres: a.genres || [],
    studios: (a.studios?.nodes || []).map((s: any) => s.name), tags: (a.tags || []).slice(0, 10).map((t: any) => t.name),
    broadcast: a.nextAiringEpisode ? `Episode ${a.nextAiringEpisode.episode} · ${new Date(a.nextAiringEpisode.airingAt * 1000).toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' })}` : null,
    trailer: a.trailer?.site === 'youtube' && a.trailer?.id ? `https://www.youtube.com/watch?v=${a.trailer.id}` : null,
    source: 'AniList',
  };
}
