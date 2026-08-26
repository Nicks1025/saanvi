const puppeteer = require('puppeteer');

class PuppeteerManager {
  static browser = null;

  static async getBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920,1080'
        ]
      });
    }
    return this.browser;
  }

  static async getNewPage() {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    // Mask as a standard browser to avoid basic bot detection WAFs
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
    return page;
  }

  static async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

module.exports = PuppeteerManager;
