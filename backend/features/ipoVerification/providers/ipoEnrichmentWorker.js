const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

class IpoEnrichmentWorker {
  constructor() {
    this.cacheFile = path.join(__dirname, '../../../data/ipo_enrichment_cache.json');
    this.enrichmentCache = {};
    this.isRunning = false;
    this.targetIpos = [];
    this.currentIndex = 0;
    
    this._loadCache();
  }

  _loadCache() {
    try {
      if (fs.existsSync(this.cacheFile)) {
        const data = fs.readFileSync(this.cacheFile, 'utf8');
        this.enrichmentCache = JSON.parse(data);
      }
    } catch (error) {
      console.error(`Failed to load IPO enrichment cache: ${error.message}`);
    }
  }

  _saveCache() {
    try {
      const dataDir = path.dirname(this.cacheFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(this.cacheFile, JSON.stringify(this.enrichmentCache, null, 2));
    } catch (error) {
      console.error(`Failed to save IPO enrichment cache: ${error.message}`);
    }
  }

  // Called by MarketDataProvider to feed the list of active/cached IPOs
  feedTargetIpos(ipos) {
    // Only target IPOs that are missing deep data AND are not NSE-sourced
    // (NSE IPOs already have symbol from the official API — no need to scrape)
    this.targetIpos = ipos.filter(ipo => {
      // Skip NSE-sourced IPOs — they already have authoritative symbol data
      if (ipo.id && ipo.id.startsWith('nse-')) return false;
      
      const enriched = this.enrichmentCache[ipo.id];
      const hasIssueSize = ipo.issueSize || (enriched && enriched.issueSize);
      const hasRegistrar = (ipo.registrar && ipo.registrar.name) || (enriched && enriched.registrar);
      
      // If we already tried and marked it as un-scrapable, skip
      if (enriched && enriched.failed) return false;
      
      // If we're missing any critical piece of deep data, queue it
      return !hasIssueSize || !hasRegistrar;
    });
    
    if (!this.isRunning && this.targetIpos.length > 0) {
      this.start();
    }
  }

  // Provides the current enrichment cache to the MarketDataProvider for merging
  getEnrichedData() {
    return this.enrichmentCache;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.currentIndex = 0;
    console.log(`Starting background enrichment for ${this.targetIpos.length} IPOs...`);
    this._processNext();
  }

  async _processNext() {
    if (this.currentIndex >= this.targetIpos.length) {
      this.isRunning = false;
      console.log('Background enrichment complete for current batch.');
      return;
    }

    const target = this.targetIpos[this.currentIndex];
    await this._enrichIpo(target);
    
    this.currentIndex++;
    
    // Throttle to 2 seconds to avoid being blocked by IPOWatch
    setTimeout(() => this._processNext(), 2000);
  }

  async _enrichIpo(ipo) {
    try {
      const slug = ipo.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-ipo';
      const url = `https://ipowatch.in/${slug}/`;
      
      console.log(`Enriching ${ipo.name} via ${url}...`);
      
      const res = await axios.get(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        timeout: 10000
      });
      
      const $ = cheerio.load(res.data);
      let issueSize = null;
      let symbol = null;
      let registrar = null;
      let allotmentDate = null;
      let listingDate = null;
      
      // Helper to parse "August 24, 2026" into a timestamp
      const parseDateStr = (str) => {
         if (!str || str.includes('TBA')) return null;
         const parsed = new Date(str).getTime();
         return isNaN(parsed) ? null : parsed;
      };
      
      // Extract from tables
      $("table tbody tr").each((i, el) => {
        const th = $(el).find("td").eq(0).text().trim().toLowerCase();
        const td = $(el).find("td").eq(1).text().trim();
        
        if (th.includes("issue size")) issueSize = td.replace('Approx ', '');
        if (th.includes("bse code") || th.includes("nse code") || th.includes("symbol")) {
          if (td && !td.toLowerCase().includes("ipo allotment page")) {
            symbol = td;
          }
        }
        if (th.includes("basis of allotment")) allotmentDate = parseDateStr(td);
        if (th.includes("listing date")) listingDate = parseDateStr(td);
      });
      
      // Extract Registrar — use the table row approach (most reliable)
      // IPOWatch puts registrar in a "Registrar" labeled table cell
      const ALLOTMENT_PAGE_SUFFIXES = [
        /\s*ipo\s*allotment\s*page\s*/i,
        /\s*allotment\s*status\s*/i,
        /\s*website\s*/i,
      ];
      
      const DOMAIN_TO_REGISTRAR = {
        'kfintech.com': 'KFin Technologies',
        'kfin.com': 'KFin Technologies',
        'linkintime.co.in': 'Link Intime',
        'mufgintime.com': 'MUFG Intime',
        'bigshareonline.com': 'Bigshare Services',
        'skylinerta.com': 'Skyline Financial Services',
        'cameoindia.com': 'Cameo Corporate Services',
        'maashitla.com': 'Maashitla Securities',
        'purvasharegistry.com': 'Purva Sharegistry',
        'mbsfinancial.in': 'MBS Financial Services',
        'bcasonline.co.in': 'BCAS Registry'
      };
      
      $('table tbody tr').each((i, el) => {
        if (registrar) return; // already found
        const th = $(el).find('td').eq(0).text().trim().toLowerCase();
        const td = $(el).find('td').eq(1);
        if (!th.includes('registrar')) return;
        
        // Strategy 1: try the anchor href domain
        td.find('a').each((j, a) => {
          if (registrar) return;
          const href = $(a).attr('href') || '';
          for (const [domain, name] of Object.entries(DOMAIN_TO_REGISTRAR)) {
            if (href.includes(domain)) {
              registrar = name;
              return;
            }
          }
          
          // Strategy 2: strip "IPO Allotment Page" suffix from link text
          let linkText = $(a).text().trim();
          for (const suffix of ALLOTMENT_PAGE_SUFFIXES) {
            linkText = linkText.replace(suffix, '').trim();
          }
          // Only accept if it looks like a company name (not a sentence)
          if (linkText && linkText.length > 2 && linkText.length < 80 && !linkText.includes(' is ') && !linkText.includes(' are ') && !linkText.includes('responsible')) {
            registrar = linkText;
          }
        });
        
        // Strategy 3: use raw cell text if no link but has a meaningful value
        if (!registrar) {
          const rawText = td.text().trim();
          if (rawText && rawText.length > 2 && rawText.length < 80 && 
              !rawText.toLowerCase().includes('allotment page') &&
              !rawText.includes('responsible') &&
              !rawText.includes('process')) {
            registrar = rawText;
          }
        }
      });

      // Strategy 4 (fallback): paragraph text directly below a "Registrar" heading
      if (!registrar) {
        $('h1, h2, h3, h4').each((i, el) => {
          if (registrar) return;
          const heading = $(el).text().trim().toLowerCase();
          if (!heading.includes('registrar')) return;
          
          const nextP = $(el).nextAll('p').first();
          if (nextP.length) {
            const candidate = nextP.text().split('\n')[0].trim();
            if (candidate && candidate.length > 2 && candidate.length < 120 &&
                !candidate.includes('responsible') && !candidate.includes('allotment')) {
              registrar = candidate;
            }
          }
        });
      }
      
      // Strategy 5 (final fallback): scan ANY anchor on the page for known registrar domains
      // Catches cases where registrar link is in contact/footer section, not a labeled table
      if (!registrar) {
        $('a').each((i, el) => {
          if (registrar) return;
          const href = $(el).attr('href') || '';
          for (const [domain, name] of Object.entries(DOMAIN_TO_REGISTRAR)) {
            if (href.includes(domain)) {
              registrar = name;
              return;
            }
          }
        });
      }
      
      // Cache results
      this.enrichmentCache[ipo.id] = {
        issueSize,
        symbol,
        registrar,
        allotmentDate,
        listingDate,
        updatedAt: new Date().toISOString()
      };
      
      this._saveCache();
      console.log(`Enriched ${ipo.name}: Size=${issueSize}, Reg=${registrar}, Symbol=${symbol}`);
      
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log(`404 Not Found for ${ipo.name}, skipping future attempts.`);
        this.enrichmentCache[ipo.id] = { failed: true, reason: '404' };
        this._saveCache();
      } else {
        console.error(`Failed to enrich ${ipo.name}: ${error.message}`);
      }
    }
  }
}

module.exports = new IpoEnrichmentWorker();
