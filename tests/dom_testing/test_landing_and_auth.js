const { chromium } = require('playwright-chromium');

const BASE_URL = 'https://qatra-web-app.vercel.app';

async function testLandingAndAuth() {
  console.log('=== TEST 1: Landing Page & Auth Gateway (/index.html) ===');
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  const networkFailures = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('response', resp => {
    if (resp.status() >= 400 && !resp.url().includes('favicon') && !resp.url().includes('manifest')) {
      networkFailures.push(`${resp.status()} ${resp.url()}`);
    }
  });

  console.log('1. Navigating to Landing Page...');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

  // 1. Check all links on page
  const links = await page.$$eval('a', els => els.map(el => ({
    text: el.innerText.trim(),
    href: el.getAttribute('href'),
    id: el.id
  })));
  console.log(`Found ${links.length} links on landing page.`);
  for (const link of links) {
    if (!link.href || link.href === '') {
      console.warn(`  ⚠️ Link with text "${link.text}" has empty href!`);
    } else {
      console.log(`  ✓ Link [${link.text || 'icon'}] -> ${link.href}`);
    }
  }

  // 2. Test Auth Modal Trigger
  console.log('\n2. Testing Sign In Button and Auth Modal...');
  const loginBtn = await page.$('#btn-header-login');
  if (loginBtn) {
    await loginBtn.click();
    await page.waitForTimeout(500);

    const isModalActive = await page.$eval('#auth-modal', el => el.classList.contains('active'));
    console.log(`  ✓ Auth Modal Opened: ${isModalActive}`);

    // Test Quick Sign-In Buttons inside modal
    const donorQuickBtn = await page.$('#role-donor-btn');
    const adminQuickBtn = await page.$('#role-admin-btn');
    const googleBtn = await page.$('#modal-google-btn');
    console.log(`  ✓ Quick Donor Button Present: ${!!donorQuickBtn}`);
    console.log(`  ✓ Quick Admin Button Present: ${!!adminQuickBtn}`);
    console.log(`  ✓ Google Button Present: ${!!googleBtn}`);

    // Test Close Button
    const closeBtn = await page.$('#modal-close-auth');
    if (closeBtn) {
      await closeBtn.click();
      await page.waitForTimeout(300);
      const isStillActive = await page.$eval('#auth-modal', el => el.classList.contains('active'));
      console.log(`  ✓ Auth Modal Closed via X button: ${!isStillActive}`);
    }
  } else {
    console.error('  ❌ #btn-header-login not found on landing page!');
  }

  // 3. Test Quick Sign-In and Custom Confirm Logout
  console.log('\n3. Testing Quick Sign-In & Non-blocking Logout Confirmation...');
  await page.click('#btn-header-login');
  await page.waitForTimeout(300);

  // Monitor network responses during login
  const [authResponse] = await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/auth/firebase-login')),
    page.click('#role-donor-btn')
  ]);
  console.log(`  ✓ Auth API Status: ${authResponse.status()}`);
  const authBody = await authResponse.json();
  console.log(`  ✓ Received Token: ${authBody.access_token ? 'Yes' : 'No'}`);

  // Wait for the automatic role-based redirect
  await page.waitForNavigation({ waitUntil: 'networkidle' });
  console.log(`  ✓ Successfully redirected to: ${page.url()}`);

  // Check if session was updated in localStorage
  const userToken = await page.evaluate(() => localStorage.getItem('qatra_token'));
  console.log(`  ✓ Logged In (Token in localStorage: ${userToken ? 'Set' : 'Missing'})`);

  // Navigate back to home to test logout button
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const logoutBtn = await page.$('#btn-header-logout');
  if (logoutBtn) {
    const isVisible = await logoutBtn.isVisible();
    console.log(`  ✓ Logout button visible in header: ${isVisible}`);
    if (isVisible) {
      await logoutBtn.click();
      await page.waitForTimeout(400);

    // Verify custom confirm modal appeared
    const confirmModalVisible = await page.$eval('#qatra-confirm-modal', el => el.style.display !== 'none');
    console.log(`  ✓ Custom Confirm Modal visible: ${confirmModalVisible}`);

    // Click Cancel first
    const cancelBtn = await page.$('#qatra-confirm-cancel-btn');
    if (cancelBtn) {
      await cancelBtn.click();
      await page.waitForTimeout(300);
      const modalAfterCancel = await page.$eval('#qatra-confirm-modal', el => el.style.display === 'none');
      console.log(`  ✓ Modal closed on cancel: ${modalAfterCancel}`);
    }

    // Click Logout again and confirm
    await logoutBtn.click();
    await page.waitForTimeout(300);
    const okBtn = await page.$('#qatra-confirm-ok-btn');
    if (okBtn) {
      await okBtn.click();
      await page.waitForTimeout(800);
      const tokenAfterLogout = await page.evaluate(() => localStorage.getItem('qatra_token'));
      console.log(`  ✓ Logged out successfully (Token: ${tokenAfterLogout || 'Cleared'})`);
    }
  }
}

  // 4. Test Hero Buttons
  console.log('\n4. Testing Hero CTA Buttons...');
  const heroRegisterBtn = await page.$('a[href="/donor/register.html"]');
  const heroRequestBtn = await page.$('a[href="/seeker/request.html"]');
  console.log(`  ✓ Hero 'Register as Donor' Button present: ${!!heroRegisterBtn}`);
  console.log(`  ✓ Hero 'Request Blood' Button present: ${!!heroRequestBtn}`);

  console.log('\n--- Console Errors on Landing Page ---');
  console.log(consoleErrors.length > 0 ? consoleErrors : '  None (Clean!)');

  console.log('\n--- Network 4xx/5xx Failures ---');
  console.log(networkFailures.length > 0 ? networkFailures : '  None (Clean!)');

  await browser.close();
  console.log('=== TEST 1 COMPLETE ===\n');
}

testLandingAndAuth().catch(err => {
  console.error('Test 1 failed with error:', err);
  process.exit(1);
});
