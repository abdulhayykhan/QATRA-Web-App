const { chromium } = require('playwright-chromium');

async function run() {
  console.log('Launching Chrome...');
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const page = await browser.newPage();
  console.log('Navigating to https://qatra-web-app.vercel.app ...');
  await page.goto('https://qatra-web-app.vercel.app', { waitUntil: 'networkidle' });
  console.log('Page Title:', await page.title());
  await browser.close();
  console.log('Smoke test passed successfully!');
}

run().catch(err => {
  console.error('Smoke test error:', err);
  process.exit(1);
});
