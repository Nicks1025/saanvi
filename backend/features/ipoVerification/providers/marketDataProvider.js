const axios = require('axios');
const cheerio = require('cheerio');
const { parseDatesToStatus } = require('../../../utils/general-util');

class MarketDataProvider {
  constructor() {
    this.gmpUrl = 'https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/';
    this.listUrl = 'https://ipowatch.in/upcoming-ipo-calendar-ipo-list/';
    this.cache = null;
    this.cacheTime = 0;
    this.CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  }

  async getMarketData() {
    if (this.cache && (Date.now() - this.cacheTime < this.CACHE_TTL)) {
      return this.cache;
    }

    try {
      const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };
      
      const [gmpRes, listRes, perfRes] = await Promise.all([
        axios.get(this.gmpUrl, { headers, timeout: 15000 }).catch(() => null),
        axios.get(this.listUrl, { headers, timeout: 15000 }).catch(() => null),
        axios.get('https://ipowatch.in/ipo-performance-tracker/', { headers, timeout: 15000 }).catch(() => null)
      ]);

      const ipoMap = new Map();

      // Helper to parse dates into status is now imported from general-util.js

      // Parse Main List (Size, Dates, Status)
      if (listRes && listRes.data) {
        const $list = cheerio.load(listRes.data);
        $list('table').each((tableIdx, tableEl) => {
          $list(tableEl).find('tbody tr').each((i, el) => {
            if (i === 0) return; // sometimes header
            const tds = $list(el).find('td');
            if (tds.length >= 4) {
               const name = $list(tds[0]).text().trim().replace(/ IPO$/, '').trim();
               if (!name || name === 'IPO Name') return;
               
               const datesStr = $list(tds[1]).text().trim();
               const sizeStr = $list(tds[2]).text().trim();
               const priceStr = $list(tds[3]).text().trim();
               
               let maxPrice = null;
               const priceMatch = priceStr.match(/(\d+)/);
               if (priceMatch) maxPrice = parseInt(priceMatch[1]);
               
               const statusObj = parseDatesToStatus(datesStr);
               const key = name.toLowerCase().replace(/\s+/g, ' ');
               
               ipoMap.set(key, {
                 id: `market-${key.replace(/[^a-z0-9]/g, '-')}`,
                 name,
                 symbol: null,
                 status: statusObj.status,
                 issueSize: sizeStr,
                 dates: { raw: statusObj.formattedDates, open: null, close: null, listing: null },
                 registrar: { name: null, source: 'IPOWatch' },
                 priceBand: { min: maxPrice, max: maxPrice, raw: priceStr },
                 marketData: {
                    gmp: null
                 }
               });
            }
          });
        });
      }

      // Parse GMP Page
      if (gmpRes && gmpRes.data) {
        const $gmp = cheerio.load(gmpRes.data);
        $gmp('table tbody tr').each((i, el) => {
          if (i === 0) return;
          const tds = $gmp(el).find('td');
          if (tds.length >= 5) {
            const name = $gmp(tds[0]).text().trim().replace(/ IPO$/, '').trim();
            if (!name || name === 'IPO Name') return;
            const key = name.toLowerCase();
            
            const gmpStr = $gmp(tds[1]).text().trim();
            let gmpValue = null;
            const gmpMatch = gmpStr.match(/(\d+)/);
            if (gmpMatch) gmpValue = parseInt(gmpMatch[1]);
            const estStr = $gmp(tds[4]).text().trim();
            
            let matchedKey = null;
            if (ipoMap.has(key)) {
               matchedKey = key;
            } else {
               for (const existingKey of ipoMap.keys()) {
                  const normExisting = existingKey.replace(/\s+/g, "");
                  const normKey = key.replace(/\s+/g, "");
                  if (normExisting.startsWith(normKey) || normKey.startsWith(normExisting)) {
                     matchedKey = existingKey;
                     break;
                  }
               }
            }
            
            if (matchedKey) {
               const existing = ipoMap.get(matchedKey);
               existing.marketData.gmp = {
                 value: gmpValue,
                 raw: gmpStr,
                 source: 'IPOWatch',
                 updatedAt: new Date().toISOString()
               };
               // Look for "Listed" status
               const estStr = $gmp(tds[4]).text().trim();
               if (estStr.toLowerCase().includes('listed')) {
                  existing.status = 'LISTED';
               }
            } else {
               const priceStr = $gmp(tds[3]).text().trim();
               let maxPrice = null;
               const priceMatch = priceStr.match(/(\d+)/);
               if (priceMatch) maxPrice = parseInt(priceMatch[1]);
               
               ipoMap.set(key, {
                 id: `market-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                 name,
                 symbol: null,
                 status: 'CLOSED',
                 issueSize: null,
                 dates: { open: null, close: null, listing: null },
                 registrar: { name: null, source: 'IPOWatch' },
                 priceBand: { min: maxPrice, max: maxPrice, raw: priceStr },
                 marketData: {
                   gmp: {
                     value: gmpValue,
                     raw: gmpStr,
                     source: 'IPOWatch',
                     updatedAt: new Date().toISOString()
                   }
                 }
               });
            }
          }
        });
      }

      // Parse Performance Tracker for LISTED status
      if (perfRes && perfRes.data) {
        const $perf = cheerio.load(perfRes.data);
        $perf('table tbody tr').each((i, el) => {
          if (i === 0) return;
          const tds = $perf(el).find('td');
          if (tds.length >= 4) {
            const name = $perf(tds[0]).text().trim().replace(/ IPO$/, '').trim();
            if (!name) return;
            const key = name.toLowerCase().replace(/\s+/g, ' ');
            
            let matchedKey = null;
            if (ipoMap.has(key)) {
               matchedKey = key;
            } else {
               for (const existingKey of ipoMap.keys()) {
                  const normExisting = existingKey.replace(/\s+/g, "");
                  const normKey = key.replace(/\s+/g, "");
                  if (normExisting.startsWith(normKey) || normKey.startsWith(normExisting)) {
                     matchedKey = existingKey;
                     break;
                  }
               }
            }
            
            if (matchedKey) {
               ipoMap.get(matchedKey).status = 'LISTED';
            } else {
               const priceStr = $perf(tds[1]).text().trim();
               let maxPrice = null;
               const priceMatch = priceStr.match(/(\d+)/);
               if (priceMatch) maxPrice = parseInt(priceMatch[1]);
               
               // If it's on the performance tracker but missing from the main calendar, we inject it as a LISTED IPO
               ipoMap.set(key, {
                 id: `market-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                 name,
                 symbol: null,
                 status: 'LISTED',
                 issueSize: null,
                 dates: { raw: null, open: null, close: null, listing: null },
                 registrar: { name: null, source: 'IPOWatch' },
                 priceBand: { min: maxPrice, max: maxPrice, raw: priceStr },
                 marketData: {
                   gmp: null
                 }
               });
            }
          }
        });
      }

      const enrichmentWorker = require('./ipoEnrichmentWorker');
      const enrichedData = enrichmentWorker.getEnrichedData();

      const ipos = Array.from(ipoMap.values()).map(ipo => {
         const enriched = enrichedData[ipo.id];
         if (enriched && !enriched.failed) {
            if (enriched.symbol) ipo.symbol = enriched.symbol;
            if (enriched.issueSize && !ipo.issueSize) ipo.issueSize = enriched.issueSize;
            if (enriched.registrar && !ipo.registrar?.name) ipo.registrar = { name: enriched.registrar, source: 'Enrichment' };
            if (enriched.allotmentDate) ipo.dates.allotmentDate = enriched.allotmentDate;
            if (enriched.listingDate) ipo.dates.listingDate = enriched.listingDate;
         }
         return ipo;
      });

      this.cache = ipos;
      this.cacheTime = Date.now();
      
      // Feed the worker in the background
      enrichmentWorker.feedTargetIpos(ipos);
      
      return ipos;

    } catch (error) {
      console.error(`MarketDataProvider failed to fetch IPOs: ${error.message}`);
      return this.cache || [];
    }
  }
}

module.exports = new MarketDataProvider();
