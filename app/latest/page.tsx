import AnimeListingPage from '../../components/AnimeListingPage';

export const metadata = { title: 'Latest Anime · AniPulse', description: 'Browse the latest anime airing this season.' };

export default function LatestPage() { return <AnimeListingPage mode="latest" />; }
