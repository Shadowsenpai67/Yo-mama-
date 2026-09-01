import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const revalidate = 300;

const API = 'https://api.fortnite.com/ecosystem/v1';

function apiUrl(path: string, params?: Record<string, string>) {
  const url = new URL(`${API}${path}`);
  for (const [key, value] of Object.entries(params || {})) url.searchParams.set(key, value);
  return url;
}

async function epicFetch(path: string, params?: Record<string, string>) {
  const response = await fetch(apiUrl(path, params), {
    headers: { Accept: 'application/json', 'User-Agent': 'AniPulse/1.0' },
    next: { revalidate: 300 },
  });
  if (!response.ok) throw new Error(`Epic Fortnite API returned ${response.status}`);
  return response.json();
}

function latestMetric(metric: unknown) {
  if (!Array.isArray(metric) || metric.length === 0) return null;
  const item = metric[metric.length - 1] as { value?: number };
  return typeof item?.value === 'number' ? item.value : null;
}

function normalizeMetrics(raw: any) {
  return {
    plays: latestMetric(raw?.plays),
    uniquePlayers: latestMetric(raw?.uniquePlayers),
    peakCCU: latestMetric(raw?.peakCCU),
    minutesPlayed: latestMetric(raw?.minutesPlayed),
    averageMinutesPerPlayer: latestMetric(raw?.averageMinutesPerPlayer),
    favorites: latestMetric(raw?.favorites),
    recommendations: latestMetric(raw?.recommendations),
    retention: Array.isArray(raw?.retention) && raw.retention.length
      ? raw.retention[raw.retention.length - 1]
      : null,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code')?.trim();
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || 12)));
  const offset = Math.max(0, Number(url.searchParams.get('offset') || 0));
  const orderBy = url.searchParams.get('orderBy') || 'plays';

  try {
    if (code) {
      const [metadata, metrics] = await Promise.all([
        epicFetch(`/islands/${encodeURIComponent(code)}`),
        epicFetch(`/islands/${encodeURIComponent(code)}/metrics`, {
          startDate: new Date(Date.now() - 7 * 86400000).toISOString(),
          endDate: new Date().toISOString(),
          interval: 'day',
        }),
      ]);
      return NextResponse.json({ data: { ...metadata, metrics: normalizeMetrics(metrics) }, source: 'Epic Fortnite Data API' });
    }

    const islands = await epicFetch('/islands', {
      limit: String(limit),
      offset: String(offset),
      orderBy,
      order: 'desc',
    });

    const data = Array.isArray(islands?.data) ? islands.data : [];
    const enriched = await Promise.all(data.slice(0, 12).map(async (island: any) => {
      try {
        const metrics = await epicFetch(`/islands/${encodeURIComponent(island.code)}/metrics`, {
          startDate: new Date(Date.now() - 86400000).toISOString(),
          endDate: new Date().toISOString(),
          interval: 'day',
        });
        return { ...island, metrics: normalizeMetrics(metrics) };
      } catch {
        return { ...island, metrics: null };
      }
    }));

    return NextResponse.json({
      data: enriched,
      pagination: islands?.meta || null,
      source: 'Epic Fortnite Data API',
      updatedAt: new Date().toISOString(),
    }, { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=86400' } });
  } catch (error) {
    console.error('Fortnite Data API failed:', error);
    return NextResponse.json({ data: [], error: 'Fortnite data is temporarily unavailable. Please try again shortly.' }, { status: 503 });
  }
}
