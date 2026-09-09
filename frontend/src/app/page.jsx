import HomeClient from './HomeClient';

export const metadata = {
  title: 'Saanvi — Play, Explore & Grow',
  description: 'Saanvi is a modern digital platform featuring real-time multiplayer tabletop games, interactive financial calculators, and discovery tools.',
  keywords: ['Saanvi', 'Saanvi app', 'Saanvi games', 'play Saanvi'],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Saanvi — Play, Explore & Grow',
    description: 'Saanvi is a modern digital platform featuring real-time multiplayer tabletop games, interactive financial calculators, and discovery tools.',
  }
};

export default function Page() {
  return <HomeClient />;
}
