import { NextResponse } from 'next/server';
import { getAnimeById } from '@/lib/anime';

export const runtime = 'nodejs';
export const revalidate = 300;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) return NextResponse.json({ error: 'Invalid anime id.' }, { status: 400 });
  try {
    const anime = await getAnimeById(numericId);
    if (!anime) return NextResponse.json({ error: 'Anime not found.' }, { status: 404 });
    return NextResponse.json({ ...anime, format: anime.type, image: anime.coverImage, bannerImage: anime.bannerImage || anime.coverImage, releaseDate: anime.startDate, trailer: anime.trailerUrl, source: anime.provider });
  } catch (error) {
    console.error('Anime detail failed:', error);
    return NextResponse.json({ error: 'Anime details are temporarily unavailable.' }, { status: 503 });
  }
}
