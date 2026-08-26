const BasePuppeteerAdapter = require('./BasePuppeteerAdapter');

class LinkIntimeAdapter extends BasePuppeteerAdapter {
  constructor(sourceConfig) {
    super(sourceConfig);
  }

  async discoverCapabilities() {
    return {
      version: 2,
      captcha_required: false, 
      captcha_type: null,
      captcha_scope: null,
      supports_automated: true,
      supports_batch: false, 
      supports_session: false,
      rate_limit_per_min: 15,
      concurrency_limit: 3,
      methods: [
        {
          name: 'PAN',
          fields: [{ name: 'PAN', is_optional: false }]
        }
      ]
    };
  }

  async verify(method, identifiers, session = null) {
    const pan = identifiers.PAN;
    if (!pan) throw new Error('PAN is required');

    let page;
    try {
      page = await this.getPage();
      
      // Navigate to Link Intime's IPO Allotment portal
      await page.goto('https://linkintime.co.in/initial_offer/public-issues.html', { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for the search input
      await page.waitForSelector('#txtkey', { timeout: 15000 });
      
      // Select PAN radio button if present
      try {
        await page.evaluate(() => {
          const radio = document.querySelector('input[value="PAN"]');
          if (radio) radio.click();
        });
      } catch (e) {
        // Ignore, PAN is usually the default
      }

      // Enter PAN
      await page.type('#txtkey', pan);

      // Submit
      await page.click('#btnsearc');
      
      // Wait for network activity to settle (simulated AJAX wait)
      await new Promise(r => setTimeout(r, 2500));

      // Extract result text from the response table
      const resultData = await page.evaluate(() => {
        const table = document.querySelector('.table-responsive');
        if (!table) return null;
        
        // Very basic text extraction strategy for demonstration
        const text = table.innerText || '';
        
        const appliedMatch = text.match(/Applied[^\d]*(\d+)/i);
        const allottedMatch = text.match(/Allotted[^\d]*(\d+)/i);
        
        return {
          text,
          applied: appliedMatch ? parseInt(appliedMatch[1], 10) : 0,
          allotted: allottedMatch ? parseInt(allottedMatch[1], 10) : 0
        };
      });

      await this.closeSession(page.sessionId);

      if (!resultData) {
         return {
           status: 'NOT_FOUND',
           applied_quantity: 0,
           allotted_quantity: 0
         };
      }

      return {
        status: resultData.allotted > 0 ? 'ALLOTTED' : 'NOT_ALLOTTED',
        applied_quantity: resultData.applied,
        allotted_quantity: resultData.allotted
      };
      
    } catch (error) {
      if (page && page.sessionId) {
        await this.closeSession(page.sessionId);
      }
      return {
        status: 'FAILED',
        error_category: 'PUPPETEER_ERROR',
        message: `Scraping Error: ${error.message}`
      };
    }
  }
}

module.exports = LinkIntimeAdapter;
