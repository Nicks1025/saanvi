const BaseRegistrarAdapter = require('./BaseRegistrarAdapter');
const PuppeteerManager = require('./PuppeteerManager');

class BasePuppeteerAdapter extends BaseRegistrarAdapter {
  constructor(sourceConfig) {
    super(sourceConfig);
    // In-memory cache to store active Puppeteer pages waiting for CAPTCHA input
    // In a real production system, this should be a distributed cache (Redis) with session serialization,
    // but Puppeteer Pages cannot be serialized, so we must stick to this Node process.
    if (!global.puppeteerSessions) {
      global.puppeteerSessions = new Map();
    }
  }

  async getPage(sessionId) {
    if (sessionId && global.puppeteerSessions.has(sessionId)) {
      return global.puppeteerSessions.get(sessionId);
    }
    const page = await PuppeteerManager.getNewPage();
    const newSessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    global.puppeteerSessions.set(newSessionId, page);
    page.sessionId = newSessionId;
    
    // Auto-cleanup session after 2 minutes to prevent memory leaks
    setTimeout(async () => {
      if (global.puppeteerSessions.has(newSessionId)) {
        const p = global.puppeteerSessions.get(newSessionId);
        await p.close().catch(() => {});
        global.puppeteerSessions.delete(newSessionId);
      }
    }, 120000);
    
    return page;
  }

  async closeSession(sessionId) {
    if (global.puppeteerSessions.has(sessionId)) {
      const page = global.puppeteerSessions.get(sessionId);
      await page.close().catch(() => {});
      global.puppeteerSessions.delete(sessionId);
    }
  }
}

module.exports = BasePuppeteerAdapter;
