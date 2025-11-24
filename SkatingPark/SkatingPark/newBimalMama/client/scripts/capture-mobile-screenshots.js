const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const base = process.env.BASE_URL || 'http://localhost:3001';
  const pages = [
    '/',
    '/sales',
    '/expenses',
    '/summary',
    '/customer-details',
    '/users',
    '/branches',
    '/tickets'
  ];

  const outDir = 'screenshots/mobile';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15A372 Safari/604.1',
    isMobile: true
  });

  for (const p of pages) {
    const url = base.replace(/\/$/, '') + (p === '/' ? '/' : p);
    const page = await context.newPage();
    console.log('Visiting', url);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      // Wait a bit for any dynamic content
      await page.waitForTimeout(1000);
      const name = p === '/' ? 'dashboard' : p.replace(/\//g, '') || 'index';
      const file = `${outDir}/${name}.png`;
      await page.screenshot({ path: file, fullPage: true });
      console.log('Saved', file);
    } catch (err) {
      console.error('Failed to capture', url, err.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log('Done capturing screenshots.');
})();
