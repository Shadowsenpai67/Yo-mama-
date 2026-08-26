import { NextResponse } from 'next/server';
import { getAnimeById } from '@/lib/anime';

export const runtime = 'nodejs';
export const revalidate = 300;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^(al|mal|kitsu)-.+/.test(id)) return NextResponse.json({ error: 'Invalid anime id.' }, { status: 400 });
  try {
    const anime = await getAnimeById(id);
    if (!anime) return NextResponse.json({ error: 'Anime not found.' }, { status: 404 });
    return NextResponse.json({ ...anime, format: anime.type, image: anime.coverImage, bannerImage: anime.bannerImage || anime.coverImage, releaseDate: anime.startDate, trailer: anime.trailerUrl, source: anime.provider }, { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=86400' } });
  } catch (error) {
    console.error('Anime detail failed:', error);
    return NextResponse.json({ error: 'Anime details are temporarily unavailable.' }, { status: 503 });
  }
}
