const BasePuppeteerAdapter = require('./BasePuppeteerAdapter');

class KFintechAdapter extends BasePuppeteerAdapter {
  constructor(sourceConfig) {
    super(sourceConfig);
  }

  async discoverCapabilities() {
    return {
      version: 3,
      captcha_required: false,
      supports_automated: true,
      supports_batch: false, 
      supports_session: false,
      rate_limit_per_min: 10,
      concurrency_limit: 2,
      methods: [
        {
          name: 'PAN',
          fields: [{ name: 'PAN', is_optional: false }]
        }
      ]
    };
  }

  async verify(method, identifiers, session = null, ipo = null) {
    const pan = identifiers.PAN;
    if (!pan) throw new Error('PAN is required');
    
    // Create a temporary session just for this request since we don't need stateful captchas
    const page = await this.getPage();
    const sessionId = page.sessionId;

    try {
      await page.goto('https://ipostatus.kfintech.com', { waitUntil: 'networkidle0', timeout: 30000 });
      
      // Select the IPO
      // Select the IPO using the MUI Select component
      await page.waitForSelector('#demo-multiple-name', { timeout: 10000 });
      await page.click('#demo-multiple-name');
      await new Promise(r => setTimeout(r, 1000)); // wait for dropdown animation
      
      let searchTerm = '';
      if (ipo && ipo.name) {
         searchTerm = ipo.name.substring(0, 5).trim();
      }
      
      // Find the correct dropdown option and click it
      const optionFound = await page.evaluate((search) => {
         const options = Array.from(document.querySelectorAll('li'));
         if (options.length > 0) {
            if (search) {
               const match = options.find(el => el.innerText.toLowerCase().includes(search.toLowerCase()));
               if (match) {
                  match.click();
                  return true;
               }
               return false;
            } else {
               options[0].click();
               return true;
            }
         }
         return false;
      }, searchTerm);
      
      if (searchTerm && !optionFound) {
         await this.closeSession(sessionId);
         return {
            status: 'FAILED',
            error_category: 'NOT_FOUND',
            message: `IPO matching '${searchTerm}' not found on KFintech.`
         };
      }
      
      await new Promise(r => setTimeout(r, 500));
      
      // Select PAN option (it's the 3rd radio button)
      const radios = await page.$$('input[type="radio"]');
      if (radios.length >= 3) {
        await radios[2].click();
      }
      
      // Enter PAN
      await page.type('#outlined-start-adornment', pan);
      
      // Submit
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.innerText, btn);
        if (text.includes('Submit')) {
          await btn.click();
          break;
        }
      }
      
      // Wait for network idle (API response)
      await new Promise(r => setTimeout(r, 2000));

      const resultData = await page.evaluate(() => {
        const textContent = document.body.innerText;
        const textLower = textContent.toLowerCase();
        
        // Handle SweetAlert popups indicating no record
        if (textLower.includes('invalid pan') || textLower.includes('not found') || textLower.includes('no record')) {
           return { applied: 0, allotted: 0, status: 'NOT_FOUND' };
        }
        
        if (textLower.includes('not allotted') || textLower.includes('not allotment')) {
           return { applied: 0, allotted: 0, status: 'NOT_ALLOTTED' };
        }
        
        // Try to find the data grid or table
        const cells = Array.from(document.querySelectorAll('td, th, span, p'));
        let applied = 0;
        let allotted = 0;
        
        // Simple heuristic: if we see numbers near "Applied" and "Allotted"
        for (let i = 0; i < cells.length; i++) {
          const txt = cells[i].innerText.toLowerCase();
          if (txt.includes('allotted') && cells[i+1]) {
             allotted = parseInt(cells[i+1].innerText, 10) || 0;
          }
          if (txt.includes('applied') && cells[i+1]) {
             applied = parseInt(cells[i+1].innerText, 10) || 0;
          }
        }
        
        // If we didn't parse from cells but there's a generic success message, assume allotted
        if (allotted === 0 && (textContent.includes('Allotted') || textContent.includes('Success'))) {
           allotted = 1; 
        }

        return { applied, allotted, status: allotted > 0 ? 'ALLOTTED' : 'NOT_ALLOTTED' };
      });

      await this.closeSession(sessionId);

      if (!resultData) {
         return { status: 'NOT_FOUND', applied_quantity: 0, allotted_quantity: 0 };
      }

      return {
        status: resultData.status,
        applied_quantity: resultData.applied,
        allotted_quantity: resultData.allotted
      };
      
    } catch (error) {
      await this.closeSession(sessionId);
      return {
        status: 'FAILED',
        error_category: 'PUPPETEER_ERROR',
        message: `KFintech Scraping Error: ${error.message}`
      };
    }
  }
}

module.exports = KFintechAdapter;
