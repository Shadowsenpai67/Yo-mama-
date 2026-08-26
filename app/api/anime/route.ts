import { NextResponse } from 'next/server';
import { getCatalog, searchAnime, type Anime } from '@/lib/anime';

export const runtime = 'nodejs';
export const revalidate = 300;

function matches(anime: Anime, genre: string | null, type: string | null) {
  return (!genre || genre === 'All genres' || anime.genres.some((g) => g.toLowerCase() === genre.toLowerCase())) &&
    (!type || type === 'All types' || anime.type.toLowerCase() === type.toLowerCase());
}

function response(items: Anime[], page: number, perPage: number, source: string, stale = false) {
  const start = (page - 1) * perPage;
  const data = items.slice(start, start + perPage);
  return NextResponse.json({ data, items: data, pagination: { page, perPage, total: items.length, hasNextPage: start + perPage < items.length }, source, stale }, { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=86400' } });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const section = url.searchParams.get('section') || 'latest';
  const query = url.searchParams.get('search')?.trim() || '';
  const genre = url.searchParams.get('genre');
  const type = url.searchParams.get('type');
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const perPage = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || 24)));

  try {
    if (query) {
      const items = await searchAnime(query);
      const filtered = items.filter((anime) => matches(anime, genre, type));
      return response(filtered, page, perPage, 'Multi-provider search');
    }

    const catalog = await getCatalog();
    let items = section === 'upcoming' ? catalog.upcoming : catalog.latest;
    items = items.filter((anime) => matches(anime, genre, type));
    return response(items, page, perPage, catalog.source, catalog.stale);
  } catch (error) {
    console.error('Anime catalog failed:', error);
    return NextResponse.json({ data: [], items: [], pagination: { page, perPage, total: 0, hasNextPage: false }, error: 'Anime data is temporarily unavailable. Please try again shortly.', stale: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
