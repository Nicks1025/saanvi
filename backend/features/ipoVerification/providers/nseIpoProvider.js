const axios = require('axios');

class NseIpoProvider {
  constructor() {
    this.baseUrl = 'https://www.nseindia.com/api';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo'
    };
  }

  async getActiveIpos() {
    try {
      // Sometimes NSE requires a cookie session first, but often this endpoint works directly with headers.
      // If blocked, we rely on the graceful fallback in the Aggregator.
      const response = await axios.get(`${this.baseUrl}/ipo-current-issue`, {
        headers: this.headers,
        timeout: 10000
      });

      if (!Array.isArray(response.data)) {
         console.warn('NSE API returned unexpected format');
         return [];
      }

      return response.data.map(item => this._normalize(item));

    } catch (error) {
      console.error(`NSE API failed: ${error.message}`);
      return []; // Graceful failure
    }
  }

  _normalize(item) {
    // NSE format:
    // "companyName", "issueEndDate", "issuePrice", "issueSize", "issueStartDate", "series", "status", "symbol", "noOfSharesOffered", "noOfsharesBid"
    
    // Parse dates (24-Aug-2026 -> 2026-08-24)
    const parseDate = (dStr) => {
      if (!dStr) return null;
      const parts = dStr.split('-');
      if (parts.length === 3) {
        const monthMap = {'Jan':'01','Feb':'02','Mar':'03','Apr':'04','May':'05','Jun':'06','Jul':'07','Aug':'08','Sep':'09','Oct':'10','Nov':'11','Dec':'12'};
        return `${parts[2]}-${monthMap[parts[1]] || '01'}-${parts[0].padStart(2, '0')}`;
      }
      return null;
    };

    // Calculate subscription
    let totalSub = null;
    if (item.noOfsharesBid && item.noOfSharesOffered) {
       const bid = parseFloat(item.noOfsharesBid);
       const offered = parseFloat(item.noOfSharesOffered);
       if (offered > 0) {
         totalSub = (bid / offered).toFixed(2);
       }
    } else if (item.noOfTime) {
       totalSub = parseFloat(item.noOfTime).toFixed(2);
    }

    // Parse price band string: "Rs.94 to Rs.99" → {min:94, max:99}
    const parsePriceBand = (priceStr) => {
      if (!priceStr) return { min: null, max: null, raw: priceStr };
      const nums = priceStr.match(/(\d+(?:\.\d+)?)/g);
      if (!nums) return { min: null, max: null, raw: priceStr };
      const values = nums.map(Number);
      return {
        min: values[0] || null,
        max: values[values.length - 1] || null,
        raw: priceStr
      };
    };

    return {
      id: `nse-${item.symbol || item.companyName}`.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name: item.companyName,
      symbol: item.symbol || null,
      exchange: 'NSE',
      status: this._mapStatus(item.status, parseDate(item.issueEndDate)),
      issueType: item.series === 'SME' ? 'sme' : 'regular',
      priceBand: parsePriceBand(item.issuePrice),
      issueSize: item.issueSize ? parseFloat(item.issueSize) : null,
      dates: {
        open: parseDate(item.issueStartDate),
        close: parseDate(item.issueEndDate),
        allotment: null, // NSE doesn't provide
        listing: null
      },
      registrar: {
        name: null, // NSE doesn't provide
        source: 'NSE'
      },
      subscription: {
        total: totalSub
      },
      officialSources: [{
        source: 'NSE',
        url: 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',
        fetchedAt: new Date().toISOString()
      }]
    };
  }

  _mapStatus(nseStatus, closeDate) {
    if (!nseStatus) return 'UNKNOWN';
    if (nseStatus.toLowerCase() === 'active') {
       const today = new Date().toISOString().split('T')[0];
       if (closeDate && today > closeDate) return 'CLOSED';
       return 'ACTIVE';
    }
    return nseStatus.toUpperCase();
  }
}

module.exports = new NseIpoProvider();
