import HomeClient from './HomeClient';

export const metadata = {
  title: 'Saanvi — Play, Explore & Grow',
  description: 'Saanvi — Modern digital platform featuring real-time multiplayer tabletop games, interactive financial calculators, and discovery tools.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Saanvi — Play, Explore & Grow',
    description: 'Saanvi — Modern digital platform featuring real-time multiplayer tabletop games, interactive financial calculators, and discovery tools.',
  }
};

export default function Page() {
  return <HomeClient />;
}
