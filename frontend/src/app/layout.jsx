import { Providers } from './providers';
import '@/index.css';
import '@/App.css';

export const metadata = {
  title: 'Saanvi — Play, Explore & Grow',
  description: 'Saanvi — Modern digital platform featuring real-time multiplayer tabletop games, interactive financial calculators, and discovery tools.',
  openGraph: {
    title: 'Saanvi — Play, Explore & Grow',
    description: 'Saanvi — Modern digital platform featuring real-time multiplayer tabletop games, interactive financial calculators, and discovery tools.',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Synchronous theme initialization — runs BEFORE React hydrates, eliminates flash */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var theme = localStorage.getItem('app-theme') || 'system';
              if (theme && theme !== 'system') {
                document.documentElement.setAttribute('data-theme', theme);
              }
            } catch(e) {}
          })();
        `}} />
      </head>
      <body>
        <div id="root" className="app-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh' }}>
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
