import UnoLayoutClient from './UnoLayoutClient';

export const metadata = {
  title: 'UNO — Saanvi',
};

export default function Layout({ children }) {
  return <UnoLayoutClient>{children}</UnoLayoutClient>;
}

