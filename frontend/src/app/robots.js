export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/dashboard', '/chat', '/games', '/settings', '/login', '/signup'],
    },
    sitemap: 'https://saanviworld.com/sitemap.xml',
  }
}
