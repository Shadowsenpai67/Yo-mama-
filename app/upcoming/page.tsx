import AnimeListingPage from '../../components/AnimeListingPage';

export const metadata = { title: 'Upcoming Anime · AniPulse', description: 'Browse upcoming anime and their announced release dates.' };

export default function UpcomingPage() { return <AnimeListingPage mode="upcoming" />; }
