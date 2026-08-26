import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ANILIST = 'https://graphql.anilist.co';
const JIKAN = 'https://api.jikan.moe/v4';
const KITSU = 'https://kitsu.io/api/edge/anime';

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

type AniListMedia = { id:number; idMal?:number|null; title:{romaji?:string|null;english?:string|null;native?:string|null}; coverImage?:{extraLarge?:string|null;large?:string|null}; averageScore?:number|null; episodes?:number|null; status?:string|null; type?:string|null; startDate?:{year?:number|null;month?:number|null;day?:number|null}; description?:string|null; genres?:string[]; nextAiringEpisode?:{airingAt:number;episode:number}|null };
type JikanAnime = { mal_id:number; title:string; title_english?:string|null; images?:{jpg?:{large_image_url?:string;image_url?:string}}; score?:number|null; episodes?:number|null; status?:string|null; aired?:{from?:string|null;string?:string}; synopsis?:string|null; genres?:{name:string}[]; type?:string|null; broadcast?:{string?:string|null} };
type KitsuAnime = { id:string; attributes:{ canonicalTitle?:string|null; titles?:{en?:string|null;en_jp?:string|null;ja_jp?:string|null}; posterImage?:{original?:string|null;large?:string|null}; averageRating?:string|null; episodeCount?:number|null; status?:string|null; startDate?:string|null; synopsis?:string|null; showType?:string|null } };

function seasonInfo(){
  const now=new Date(); const month=now.getUTCMonth()+1; const year=now.getUTCFullYear();
  if(month<=3)return{season:'WINTER',year,nextSeason:'SPRING',nextYear:year};
  if(month<=6)return{season:'SPRING',year,nextSeason:'SUMMER',nextYear:year};
  if(month<=9)return{season:'SUMMER',year,nextSeason:'FALL',nextYear:year};
  return{season:'FALL',year,nextSeason:'WINTER',nextYear:year+1};
}
function stripHtml(v:string|null|undefined){return(v||'Synopsis not available yet.').replace(/<br\s*\/?\s*>/gi,' ').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#039;/g,"'").replace(/\s+/g,' ').trim()}
function isoDate(p?:{year?:number|null;month?:number|null;day?:number|null}){if(!p?.year||!p.month||!p.day)return null;return`${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`}

function normalizeAniList(items:AniListMedia[]):Anime[]{return items.filter(a=>a?.id&&(a.coverImage?.extraLarge||a.coverImage?.large)).map(a=>{const d=isoDate(a.startDate);return{id:a.idMal||a.id,title:a.title.english||a.title.romaji||a.title.native||'Untitled anime',originalTitle:a.title.native||a.title.romaji||a.title.english||'Untitled anime',image:a.coverImage?.extraLarge||a.coverImage?.large||'',score:a.averageScore?a.averageScore/10:null,episodes:a.episodes??null,status:a.status||'Unknown',type:a.type||'TV',releaseDate:d,releaseDateText:d,synopsis:stripHtml(a.description),genres:a.genres||[],broadcast:a.nextAiringEpisode?`Episode ${a.nextAiringEpisode.episode} · ${new Date(a.nextAiringEpisode.airingAt*1000).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}`:null}})}
function normalizeJikan(items:JikanAnime[]):Anime[]{return items.filter(a=>a?.mal_id&&(a.images?.jpg?.large_image_url||a.images?.jpg?.image_url)).map(a=>({id:a.mal_id,title:a.title_english||a.title,originalTitle:a.title,image:a.images?.jpg?.large_image_url||a.images?.jpg?.image_url||'',score:a.score??null,episodes:a.episodes??null,status:a.status||'Unknown',type:a.type||'TV',releaseDate:a.aired?.from?.slice(0,10)||null,releaseDateText:a.aired?.string||null,synopsis:stripHtml(a.synopsis),genres:(a.genres||[]).map(g=>g.name),broadcast:a.broadcast?.string||null}))}
function normalizeKitsu(items:KitsuAnime[]):Anime[]{return items.filter(a=>a?.id&&a.attributes?.posterImage?.large).map(a=>{const x=a.attributes;return{id:Number(a.id)||Math.abs(a.id.split('').reduce((n,c)=>((n<<5)-n)+c.charCodeAt(0)|0,0)),title:x.titles?.en||x.canonicalTitle||x.titles?.en_jp||x.titles?.ja_jp||'Untitled anime',originalTitle:x.titles?.ja_jp||x.titles?.en_jp||x.canonicalTitle||'Untitled anime',image:x.posterImage?.original||x.posterImage?.large||'',score:x.averageRating?Number(x.averageRating)/10:null,episodes:x.episodeCount??null,status:x.status||'Unknown',type:x.showType||'TV',releaseDate:x.startDate?.slice(0,10)||null,releaseDateText:x.startDate?new Date(x.startDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):null,synopsis:stripHtml(x.synopsis),genres:[],broadcast:null}})}

async function fetchJson(url:string,init?:RequestInit){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),9000);try{const r=await fetch(url,{...init,signal:controller.signal,next:{revalidate:300}} as RequestInit);if(!r.ok)throw new Error(`${r.status}`);return await r.json()}finally{clearTimeout(timer)}}

async function getAniList(){const{season,year,nextSeason,nextYear}=seasonInfo();const query=`query ($season: MediaSeason!, $year: Int!, $nextSeason: MediaSeason!, $nextYear: Int!) { current: Page(page:1,perPage:30){ media(type:ANIME,season:$season,seasonYear:$year,status:RELEASING,sort:[POPULARITY_DESC]){ id idMal title{romaji english native} coverImage{extraLarge large} averageScore episodes status type startDate{year month day} description genres nextAiringEpisode{airingAt episode} } } upcoming: Page(page:1,perPage:30){ media(type:ANIME,season:$nextSeason,seasonYear:$nextYear,status:NOT_YET_RELEASED,sort:[START_DATE_ASC,POPULARITY_DESC]){ id idMal title{romaji english native} coverImage{extraLarge large} averageScore episodes status type startDate{year month day} description genres nextAiringEpisode{airingAt episode} } } }`;const json=await fetchJson(ANILIST,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({query,variables:{season,year,nextSeason,nextYear}})});if(json.errors?.length)throw new Error('GraphQL error');return{latest:normalizeAniList(json.data.current.media),upcoming:normalizeAniList(json.data.upcoming.media)}}
async function getJikan(){const get=async(path:string)=>{const json=await fetchJson(`${JIKAN}${path}`,{headers:{Accept:'application/json'}});return(json.data||[])as JikanAnime[]};const[now,upcoming]=await Promise.all([get('/seasons/now?sfw=true&limit=25'),get('/seasons/upcoming?sfw=true&limit=25')]);return{latest:normalizeJikan(now).sort((a,b)=>(b.score||0)-(a.score||0)),upcoming:normalizeJikan(upcoming).sort((a,b)=>dateSort(a,b))}}
async function getKitsu(){const make=async(params:string)=>{const json=await fetchJson(`${KITSU}?${params}`,{headers:{Accept:'application/vnd.api+json'}});return(json.data||[])as KitsuAnime[]};const[current,upcoming]=await Promise.all([make('filter[status]=current&page[limit]=30&sort=-averageRating'),make('filter[status]=upcoming&page[limit]=30&sort=startDate')]);return{latest:normalizeKitsu(current).sort((a,b)=>(b.score||0)-(a.score||0)),upcoming:normalizeKitsu(upcoming).sort((a,b)=>dateSort(a,b))}}
function dateSort(a:Anime,b:Anime){if(!a.releaseDate)return 1;if(!b.releaseDate)return-1;return new Date(a.releaseDate).getTime()-new Date(b.releaseDate).getTime()}

export async function GET(){
  let latest:Anime[]=[];let upcoming:Anime[]=[];const sources:string[]=[];
  // Providers are tried independently. A failure in one database no longer hides data from another.
  try{const d=await getAniList();latest=d.latest;upcoming=d.upcoming;sources.push('AniList')}catch(e){console.warn('AniList unavailable',e)}
  if(!latest.length||!upcoming.length){try{const d=await getJikan();if(!latest.length)latest=d.latest;if(!upcoming.length)upcoming=d.upcoming;sources.push('Jikan / MyAnimeList')}catch(e){console.warn('Jikan unavailable',e)}}
  if(!latest.length||!upcoming.length){try{const d=await getKitsu();if(!latest.length)latest=d.latest;if(!upcoming.length)upcoming=d.upcoming;sources.push('Kitsu')}catch(e){console.warn('Kitsu unavailable',e)}}
  if(!latest.length&&!upcoming.length)return NextResponse.json({latest:[],upcoming:[],error:'All anime databases are temporarily unreachable. Please try again shortly.'},{status:503});
  return NextResponse.json({latest:latest.slice(0,18),upcoming:upcoming.slice(0,18),source:sources.join(' + '),updatedAt:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}});
}
