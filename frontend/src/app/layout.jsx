import { Providers } from './providers';
import '@/index.css';
import '@/App.css';

export const metadata = {
  title: 'Saanvi — Play, Explore & Grow',
  description: 'Saanvi is a modern digital platform featuring real-time multiplayer tabletop games, interactive financial calculators, and discovery tools.',
  keywords: ['Saanvi', 'Saanvi games', 'Saanvi platform', 'Saanvi app', 'Saanvi multiplayer', 'Saanvi calculators'],
  authors: [{ name: 'Saanvi' }],
  creator: 'Saanvi',
  publisher: 'Saanvi',
  applicationName: 'Saanvi',
  openGraph: {
    title: 'Saanvi — Play, Explore & Grow',
    description: 'Saanvi is a modern digital platform featuring real-time multiplayer tabletop games, interactive financial calculators, and discovery tools.',
    siteName: 'Saanvi',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Saanvi — Play, Explore & Grow',
    description: 'Saanvi is a modern digital platform featuring real-time multiplayer tabletop games, interactive financial calculators, and discovery tools.',
  },
  icons: {
    icon: '/saanvi_logo.png'
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* JSON-LD for Saanvi Organization to improve root keyword indexing */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "Saanvi",
          "url": "https://saanvi.app", // Adjust domain to actual production domain if known
          "description": "Saanvi is a modern digital platform featuring real-time multiplayer tabletop games, interactive financial calculators, and discovery tools.",
          "publisher": {
            "@type": "Organization",
            "name": "Saanvi",
            "logo": {
              "@type": "ImageObject",
              "url": "https://saanvi.app/saanvi_logo.png"
            }
          }
        })}} />
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
