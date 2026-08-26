const nseProvider = require('./providers/nseIpoProvider');
const marketDataProvider = require('./providers/marketDataProvider');

class IpoAggregatorService {
  constructor() {
    this.nseProvider = nseProvider;
    this.marketDataProvider = marketDataProvider;
  }

  async getAllIpos() {
    // 1. Fetch from NSE (Authoritative for live/upcoming)
    const nseIpos = await this.nseProvider.getActiveIpos();

    // 2. Fetch from Market Data (GMP, Registrar, and past closed issues that NSE drops)
    const marketIpos = await this.marketDataProvider.getMarketData();

    // 3. Merge and deduplicate
    const mergedMap = new Map();
    
    const normalizeKey = (name) => {
      return name.toLowerCase()
        .replace(/\s+limited$/i, "")
        .replace(/\s+ltd\.?$/i, "")
        .replace(/\s+company$/i, "")
        .replace(/\s+co\.?$/i, "")
        .replace(/[^a-z0-9]/g, "");
    };

    // Add Market IPOs first so NSE can overwrite with more authoritative data if they overlap
    for (const mIpo of marketIpos) {
       const key = normalizeKey(mIpo.name);
       mergedMap.set(key, mIpo);
    }

    // Add/merge NSE IPOs
    for (const nIpo of nseIpos) {
       const nKey = normalizeKey(nIpo.name);
       let matchedKey = null;
       let existing = null;
       
       for (const [mKey, mIpo] of mergedMap.entries()) {
         if (mKey === nKey || nKey.startsWith(mKey) || mKey.startsWith(nKey)) {
           matchedKey = mKey;
           existing = mIpo;
           break;
         }
       }

       if (existing) {
         // Deep Merge: keep the best available data from both sources
         const mergedPriceBand = {
           min: existing.priceBand?.min || nIpo.priceBand?.min,
           max: existing.priceBand?.max || nIpo.priceBand?.max,
           raw: (existing.priceBand?.raw && existing.priceBand.raw !== '-') ? existing.priceBand.raw : (nIpo.priceBand?.raw || existing.priceBand?.raw)
         };
         
         const mergedDates = {
           raw: existing.dates?.raw || nIpo.dates?.raw,
           open: nIpo.dates?.open || existing.dates?.open,
           close: nIpo.dates?.close || existing.dates?.close,
           listing: existing.dates?.listing || nIpo.dates?.listing
         };

         mergedMap.set(matchedKey, {
           ...existing,
           ...nIpo,
           symbol: nIpo.symbol || existing.symbol,
           dates: mergedDates,
           priceBand: mergedPriceBand,
           marketData: existing.marketData || nIpo.marketData,
           registrar: existing.registrar?.name ? existing.registrar : (nIpo.registrar || existing.registrar),
           issueSize: (existing.issueSize && existing.issueSize.includes('Cr')) ? existing.issueSize : (nIpo.issueSize || existing.issueSize),
           name: existing.name || nIpo.name
         });
       } else {
         mergedMap.set(nKey, nIpo);
       }
    }

    let allIpos = Array.from(mergedMap.values());

    // 4. Normalize Allotment Status
    // Rules: DECLARED, NOT_DECLARED, UNKNOWN
    // We cannot safely infer DECLARED purely from dates.
    // If the market provider explicitly found it in the "Allotment Out" list, it could be DECLARED.
    // For now, since we can't reliably ping the registrar without the Phase 1 engine,
    // we set it to NOT_DECLARED for everything except for the ones where we explicitly know.
    const today = new Date().toISOString().split('T')[0];

    allIpos = allIpos.map(ipo => {
      let allotmentStatus = 'UNKNOWN';
      const now = Date.now();
      
      // 1. Upgrade status to LISTED if exact listing date is known and has passed
      if (ipo.status === 'CLOSED' && ipo.dates?.listingDate && now >= ipo.dates.listingDate) {
         ipo.status = 'LISTED';
      }
      
      // 2. Check exact allotment date
      let exactAllotmentOut = false;
      if (ipo.status === 'CLOSED' && ipo.dates?.allotmentDate && now >= ipo.dates.allotmentDate) {
         exactAllotmentOut = true;
      }
      
      // If it's listed, allotment is definitely declared and over
      if (ipo.status === 'LISTED') {
         allotmentStatus = 'DECLARED';
      } else if (ipo.status === 'CLOSED') {
         // Rely on exact extracted allotment date first, then market provider flag
         if (exactAllotmentOut) {
           allotmentStatus = 'DECLARED';
         } else if (ipo.allotment && ipo.allotment.status) {
           allotmentStatus = ipo.allotment.status;
         } else {
           allotmentStatus = 'UNKNOWN';
         }
      } else {
         allotmentStatus = 'NOT_DECLARED';
      }

      return {
        ...ipo,
        allotment: {
           status: allotmentStatus,
           source: 'Aggregator',
           declaredAt: null
        }
      };
    });

    return {
      status: 'success',
      data: allIpos,
      pagination: {
         currentPage: 1,
         totalPages: 1,
         totalRecords: allIpos.length
      }
    };
  }

  async getIpoDetails(id) {
    const all = await this.getAllIpos();
    if (all.status === 'success') {
       const ipo = all.data.find(i => i.id === id);
       if (ipo) {
         return { status: 'success', data: ipo };
       }
    }
    return { status: 'error', message: 'IPO not found in Aggregator data' };
  }
}

module.exports = new IpoAggregatorService();
