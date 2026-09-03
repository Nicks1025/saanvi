import UnauthorizedClient from './UnauthorizedClient';

export const metadata = {
  title: 'Not Authorized — Saanvi',
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  return <UnauthorizedClient />;
}
