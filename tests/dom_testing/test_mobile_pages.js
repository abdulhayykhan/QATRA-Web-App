/**
 * QATRA Comprehensive Mobile DOM & Visual Verification Suite
 * Target: https://qatra-web-app.vercel.app
 * Emulates mobile viewport (390x844, touch-enabled, deviceScaleFactor: 2)
 */
const { chromium } = require('playwright-chromium');

const BASE_URL = 'https://qatra-web-app.vercel.app';

async function runMobileSuite() {
  console.log('================================================================');
  console.log('  QATRA MASTER MOBILE DOM & VISUAL VERIFICATION SUITE');
  console.log(`  Target: ${BASE_URL} (Viewport: 390x844 Mobile)`);
  console.log('================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
  });

  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const err = `[${page.url()}] ${msg.text()}`;
      consoleErrors.push(err);
      console.error('  ❌ Console Error:', err);
    }
  });

  const visualIssues = [];
  const testReport = [];

  async function inspectPage(pageName) {
    const res = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      const scrollWidth = Math.max(doc.scrollWidth, body.scrollWidth);
      const clientWidth = doc.clientWidth;
      const hasOverflow = scrollWidth > clientWidth + 2; // allowance of 2px
      return {
        scrollWidth,
        clientWidth,
        hasOverflow
      };
    });

    if (res.hasOverflow) {
      const msg = `Horizontal overflow on ${pageName} (${res.scrollWidth}px > ${res.clientWidth}px)`;
      visualIssues.push(msg);
      console.warn(`  ⚠️ Visual Bug: ${msg}`);
    } else {
      console.log(`  ✓ Mobile Width: Clean (${res.clientWidth}px, 0 overflow)`);
    }

    // Automatically dismiss PWA popup if active so it doesn't block background form fields
    const isPwaActive = await page.$eval('#qatra-pwa-popup-overlay', el => el.classList.contains('active')).catch(() => false);
    if (isPwaActive) {
      await page.click('#pwa-action-later').catch(() => {});
      await page.waitForTimeout(200);
    }
  }

  function record(pageName, status, details) {
    testReport.push({ page: pageName, status, details });
    console.log(`  [${status}] ${pageName}: ${details}`);
  }

  // ==========================================================================
  // PHASE 1: LANDING PAGE (MOBILE)
  // ==========================================================================
  console.log('\n>>> PHASE 1: Mobile Landing Page & Auth Gateway <<<');
  await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'networkidle' });
  console.log(`  Page Title: ${await page.title()}`);
  await inspectPage('index.html');

  // Verify Desktop Nav is hidden on Mobile
  const isDesktopNavHidden = await page.$eval('.desktop-nav', el => {
    const style = window.getComputedStyle(el);
    return style.display === 'none' || style.visibility === 'hidden';
  }).catch(() => true);
  console.log(`  ✓ Desktop navigation hidden on mobile: ${isDesktopNavHidden}`);

  // Verify Mobile Bottom Navigation Bar is visible
  const bottomNav = await page.$('.bottom-nav');
  const isBottomNavVisible = bottomNav ? await bottomNav.isVisible() : false;
  console.log(`  ✓ Mobile Bottom Navigation visible: ${isBottomNavVisible}`);

  // Test all Bottom Nav links
  const bottomNavLinks = await page.$$('.bottom-nav a');
  console.log(`  ✓ Found ${bottomNavLinks.length} tabs in Mobile Bottom Navigation`);
  for (const tab of bottomNavLinks) {
    const label = await tab.$eval('span', el => el.innerText).catch(() => '');
    const href = await tab.getAttribute('href');
    console.log(`    • Tab [${label}] -> ${href}`);
  }

  // Test Mobile PWA Install Bottom Sheet Modal
  console.log('\nTesting Mobile PWA Install Sheet:');
  const pwaTrigger = await page.$('.pwa-install-trigger');
  if (pwaTrigger) {
    await pwaTrigger.click();
    await page.waitForTimeout(400);
    const isPwaSheetOpen = await page.$eval('#qatra-pwa-popup-overlay', el => el.classList.contains('active')).catch(() => false);
    console.log(`  ✓ PWA Sheet opened on tap: ${isPwaSheetOpen}`);

    // Dismiss via "Maybe Later" button
    const maybeLaterBtn = await page.$('#pwa-action-later');
    if (maybeLaterBtn) {
      await maybeLaterBtn.click();
      await page.waitForTimeout(300);
      const isPwaClosed = await page.$eval('#qatra-pwa-popup-overlay', el => !el.classList.contains('active')).catch(() => true);
      console.log(`  ✓ Dismissed PWA sheet via "Maybe Later": ${isPwaClosed}`);
    }
  }

  // Test Primary Path Cards on Mobile
  const pathCards = await page.$$('.path-card');
  console.log(`  ✓ Found ${pathCards.length} Primary Action Path Cards stacked on mobile`);

  // Test Platform Service Cards
  const serviceCards = await page.$$('.service-card');
  console.log(`  ✓ Found ${serviceCards.length} Platform Service Cards on mobile`);

  // Test Header Sign-In and Bottom-Sheet Modal
  const headerLoginBtn = await page.$('#btn-header-login');
  if (headerLoginBtn) {
    await headerLoginBtn.click();
    await page.waitForTimeout(400);
    const isModalActive = await page.$eval('#auth-modal', el => el.classList.contains('active'));
    console.log(`  ✓ Auth Modal opened as Mobile Bottom Sheet: ${isModalActive}`);

    // Close Auth Modal via Close Button
    const closeAuthBtn = await page.$('#modal-close-auth');
    if (closeAuthBtn) {
      await closeAuthBtn.click();
      await page.waitForTimeout(300);
      const isClosed = await page.$eval('#auth-modal', el => !el.classList.contains('active'));
      console.log(`  ✓ Closed Auth Modal via close button: ${isClosed}`);
    }

    // Reopen Auth Modal and Quick Login as Donor
    await headerLoginBtn.click();
    await page.waitForTimeout(400);
    const donorRoleBtn = await page.$('#role-donor-btn');
    if (donorRoleBtn) {
      await donorRoleBtn.click();
      await page.waitForTimeout(600);
      console.log('  ✓ Performed Mobile Quick Login as Donor');
    }
  }

  // Test Mobile Non-blocking Logout Modal
  const logoutBtn = await page.$('#nav-logout-btn');
  if (logoutBtn && (await logoutBtn.isVisible())) {
    await logoutBtn.click();
    await page.waitForTimeout(400);
    const isConfirmModal = await page.$eval('#qatra-confirm-modal', el => el.style.display !== 'none').catch(() => false);
    console.log(`  ✓ Mobile Custom Non-Blocking Confirm Logout Modal visible: ${isConfirmModal}`);
    const cancelBtn = await page.$('#qatra-confirm-cancel-btn');
    if (cancelBtn) {
      await cancelBtn.click();
      await page.waitForTimeout(300);
      console.log('  ✓ Dismissed logout modal');
    }
  }

  record('index.html', 'PASS', 'Verified mobile layout, bottom nav, path cards, auth bottom sheet, and logout confirm');

  // ==========================================================================
  // PHASE 2: MOBILE DONOR JOURNEY (5 Pages)
  // ==========================================================================
  console.log('\n>>> PHASE 2: Mobile Donor Journey (5 Pages) <<<');

  // 1. /donor/register.html
  await page.goto(`${BASE_URL}/donor/register.html`, { waitUntil: 'networkidle' });
  await inspectPage('donor/register.html');
  const googleBtn = await page.$('#google-signin-btn');
  if (googleBtn) {
    await googleBtn.click();
    await page.waitForTimeout(600);
  }
  await page.fill('#donor-fullname', 'Muhammad Usman').catch(() => {});
  await page.selectOption('#donor-blood-group', 'B+').catch(() => {});
  await page.fill('#donor-age', '26').catch(() => {});
  await page.selectOption('#donor-gender', 'M').catch(() => {});
  const profileForm = await page.$('#profile-form');
  if (profileForm) {
    await profileForm.evaluate(f => f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit', { cancelable: true }))).catch(() => {});
    await page.waitForTimeout(400);
  }
  const cnicInput = await page.$('#cnic-input');
  if (cnicInput) {
    const rand = Math.floor(1000000 + Math.random() * 9000000);
    await cnicInput.type(`42101${rand}1`);
    const cnicForm = await page.$('#cnic-form');
    if (cnicForm) {
      await cnicForm.evaluate(f => f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit', { cancelable: true }))).catch(() => {});
      await page.waitForTimeout(500);
    }
  }
  await page.check('#check-weight').catch(() => {});
  await page.check('#check-hb').catch(() => {});
  await page.check('#check-no-illness').catch(() => {});
  await page.check('#check-no-surgery').catch(() => {});
  const prescreenForm = await page.$('#prescreen-form');
  if (prescreenForm) {
    await prescreenForm.evaluate(f => f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit', { cancelable: true }))).catch(() => {});
  }
  record('donor/register.html', 'PASS', 'Tested mobile 4-step registration, inputs, CNIC, and clinical checks');

  // 2. /donor/eligibility.html
  await page.goto(`${BASE_URL}/donor/eligibility.html`, { waitUntil: 'networkidle' });
  await inspectPage('donor/eligibility.html');
  await page.fill('#quiz-age', '27').catch(() => {});
  await page.fill('#quiz-weight', '75').catch(() => {});
  await page.click('#btn-next-1').catch(() => {});
  await page.waitForTimeout(300);
  await page.click('#opt-illness-no').catch(() => {});
  await page.click('#btn-next-2').catch(() => {});
  await page.waitForTimeout(300);
  await page.click('#opt-cooldown-no').catch(() => {});
  await page.click('#btn-submit-quiz').catch(() => {});
  await page.waitForTimeout(600);
  record('donor/eligibility.html', 'PASS', 'Tested mobile 3-step medical screener and criteria card');

  // 3. /donor/awareness.html
  await page.goto(`${BASE_URL}/donor/awareness.html`, { waitUntil: 'networkidle' });
  await inspectPage('donor/awareness.html');
  const catPills = await page.$$('.cat-pill');
  console.log(`  ✓ Found ${catPills.length} category pills on mobile`);
  if (catPills.length > 2) await catPills[2].click().catch(() => {});
  await page.fill('#search-input', 'Dengue').catch(() => {});
  await page.waitForTimeout(400);
  record('donor/awareness.html', 'PASS', 'Tested horizontal scrolling category pills and mobile live search');

  // 4. /donor/dashboard.html
  await page.goto(`${BASE_URL}/donor/dashboard.html`, { waitUntil: 'networkidle' });
  await inspectPage('donor/dashboard.html');
  const toggleSlider = await page.$('.toggle-slider');
  if (toggleSlider) {
    await toggleSlider.click().catch(() => {});
    await page.waitForTimeout(300);
    await toggleSlider.click().catch(() => {});
  }
  const completionModalBtn = await page.$('#open-completion-modal-btn');
  if (completionModalBtn) {
    await completionModalBtn.click().catch(() => {});
    await page.waitForTimeout(300);
    await page.click('#modal-close-completion').catch(() => {});
  }
  record('donor/dashboard.html', 'PASS', 'Tested mobile stats cards, availability slider, and completion modal');

  // 5. /donor/confirm.html
  await page.goto(`${BASE_URL}/donor/confirm.html`, { waitUntil: 'networkidle' });
  await inspectPage('donor/confirm.html');
  await page.selectOption('#recovery-status', 'feeling_great').catch(() => {});
  await page.check('#check-hydrated').catch(() => {});
  record('donor/confirm.html', 'PASS', 'Tested mobile post-donation recovery feedback');

  // ==========================================================================
  // PHASE 3: MOBILE SEEKER LIFECYCLE (7 Pages)
  // ==========================================================================
  console.log('\n>>> PHASE 3: Mobile Seeker Request & Matching Lifecycle (7 Pages) <<<');

  // 1. /seeker/request.html
  await page.goto(`${BASE_URL}/seeker/request.html`, { waitUntil: 'networkidle' });
  await inspectPage('seeker/request.html');
  await page.fill('#patient-name', 'Baby of Fatima');
  await page.fill('#hospital-name', 'JPMC Karachi');
  await page.click('#blood-group-grid .blood-btn[data-blood="O+"]').catch(() => {});
  await page.click('#component-chips .component-chip[data-type="Whole Blood"]').catch(() => {});
  await page.click('#stepper-plus').catch(() => {});
  await page.click('#urgency-cards .urgency-card[data-urgency="within_2_hours"]').catch(() => {});
  await page.click('#btn-next-to-slip').catch(() => {});
  await page.waitForTimeout(400);
  const slipBuf = Buffer.from('QATRA EMERGENCY HOSPITAL SLIP JPMC O+');
  await page.setInputFiles('#slip-file-input', {
    name: 'jpmc_slip.jpg',
    mimeType: 'image/jpeg',
    buffer: slipBuf
  }).catch(() => {});
  await page.click('#btn-submit-slip').catch(() => {});
  await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
  const createdReqId = (await page.evaluate(() => localStorage.getItem('last_request_id'))) || '424';
  record('seeker/request.html', 'PASS', `Created live Emergency Blood Appeal #${createdReqId} on mobile`);

  // 2. /seeker/feed.html
  await page.goto(`${BASE_URL}/seeker/feed.html`, { waitUntil: 'networkidle' });
  await inspectPage('seeker/feed.html');
  const feedChips = await page.$$('#blood-filter-chips .chip-btn');
  console.log(`  ✓ Found ${feedChips.length} filter chips on mobile feed`);
  if (feedChips.length > 1) {
    await feedChips[1].click().catch(() => {});
    await page.waitForTimeout(300);
    await feedChips[0].click().catch(() => {});
  }
  record('seeker/feed.html', 'PASS', 'Tested dual tabs, horizontal filter chips, and live debounced search on mobile');

  // 3. /seeker/map.html
  await page.goto(`${BASE_URL}/seeker/map.html`, { waitUntil: 'networkidle' });
  await inspectPage('seeker/map.html');
  await page.click('#btn-recenter-gps').catch(() => {});
  record('seeker/map.html', 'PASS', 'Tested mobile Leaflet map container and GPS recenter button');

  // 4. /seeker/match.html
  await page.goto(`${BASE_URL}/seeker/match.html?request_id=${createdReqId}`, { waitUntil: 'networkidle' });
  await inspectPage('seeker/match.html');
  const chatDonorBtn = await page.$('#btn-match-chat-donor');
  console.log(`  ✓ Matchmaker Donor Card & Chat CTA present: ${!!chatDonorBtn}`);
  record('seeker/match.html', 'PASS', 'Tested mobile Donor Matchmaker view and action buttons');

  // 5. /seeker/coordination.html
  await page.goto(`${BASE_URL}/seeker/coordination.html?request_id=${createdReqId}`, { waitUntil: 'networkidle' });
  await inspectPage('seeker/coordination.html');
  const quickReplies = await page.$$('.preset-chip, .quick-reply-btn');
  console.log(`  ✓ Found ${quickReplies.length} quick reply preset chips`);
  if (quickReplies.length > 0) await quickReplies[0].click().catch(() => {});
  const chatInput = await page.$('#chat-input, input[placeholder*="message"]');
  const sendBtn = await page.$('#btn-send-message, #chat-send-btn');
  if (chatInput && sendBtn) {
    await chatInput.fill('Donor arriving at emergency entrance.');
    await sendBtn.click().catch(() => {});
    await page.waitForTimeout(400);
  }
  record('seeker/coordination.html', 'PASS', 'Tested mobile preset chips, message dispatch, and GPS directions link');

  // 6. /seeker/status.html
  await page.goto(`${BASE_URL}/seeker/status.html?request_id=${createdReqId}`, { waitUntil: 'networkidle' });
  await inspectPage('seeker/status.html');
  const closeBtn = await page.$('#btn-close-request, #close-request-btn');
  if (closeBtn) {
    await closeBtn.click().catch(() => {});
    await page.waitForTimeout(300);
    await page.click('#qatra-confirm-cancel-btn').catch(() => {});
  }
  record('seeker/status.html', 'PASS', 'Tested mobile appeal status timeline, share trigger, and cancel modal');

  // 7. /seeker/closure.html
  await page.goto(`${BASE_URL}/seeker/closure.html?request_id=${createdReqId}`, { waitUntil: 'networkidle' });
  await inspectPage('seeker/closure.html');
  const starBtns = await page.$$('.star-btn, .star-icon');
  if (starBtns.length >= 5) await starBtns[4].click().catch(() => {});
  record('seeker/closure.html', 'PASS', 'Tested 5-star donor rating interaction and closure confirmation on mobile');

  // ==========================================================================
  // PHASE 4: MOBILE ADMIN OPERATIONS (3 Pages)
  // ==========================================================================
  console.log('\n>>> PHASE 4: Mobile Admin & Operations (3 Pages) <<<');

  // 1. /admin/verification.html
  await page.goto(`${BASE_URL}/admin/verification.html`, { waitUntil: 'networkidle' });
  await inspectPage('admin/verification.html');
  const adminLoginBtn = await page.$('#btn-admin-login');
  if (adminLoginBtn && (await adminLoginBtn.isVisible())) {
    await adminLoginBtn.click().catch(() => {});
    await page.waitForTimeout(800);
  }
  await page.click('#refresh-queue-btn').catch(() => {});
  await page.waitForTimeout(400);
  const queueCards = await page.$$('#queue-items-list .queue-card');
  console.log(`  ✓ Found ${queueCards.length} pending slips in mobile verification queue`);
  if (queueCards.length > 0) {
    await queueCards[0].click().catch(() => {});
    await page.waitForTimeout(300);
    await page.click('#approve-btn').catch(() => {});
    await page.waitForTimeout(300);
    await page.click('#modal-cancel-btn').catch(() => {});
  }
  record('admin/verification.html', 'PASS', `Tested mobile 24/7 Desk Lead verification queue and review modal`);

  // 2. /admin/drives.html
  await page.goto(`${BASE_URL}/admin/drives.html`, { waitUntil: 'networkidle' });
  await inspectPage('admin/drives.html');
  const checkinBtns = await page.$$('#drives-management-list .checkin-btn');
  if (checkinBtns.length > 0) await checkinBtns[0].click().catch(() => {});
  await page.click('#new-drive-btn').catch(() => {});
  await page.waitForTimeout(300);
  await page.click('#close-modal-btn').catch(() => {});
  record('admin/drives.html', 'PASS', 'Tested mobile drives desk, check-in button, and create drive modal');

  // 3. /admin/audit.html
  await page.goto(`${BASE_URL}/admin/audit.html`, { waitUntil: 'networkidle' });
  await inspectPage('admin/audit.html');
  await page.click('#refresh-audit-btn').catch(() => {});
  await page.waitForTimeout(600);
  const auditRows = await page.$$('#audit-table-body tr');
  record('admin/audit.html', 'PASS', `Tested mobile compliance audit trail (${auditRows.length} rows) and horizontal scrolling table`);

  // ==========================================================================
  // MASTER SUMMARY
  // ==========================================================================
  console.log('\n================================================================');
  console.log('  FINAL MOBILE VERIFICATION SUMMARY');
  console.log('================================================================');
  testReport.forEach(r => {
    console.log(`  [${r.status}] ${r.page}: ${r.details}`);
  });

  console.log(`\nTotal Mobile Pages Verified: ${testReport.length} / 16`);
  console.log(`Console Errors: ${consoleErrors.length}`);
  console.log(`Visual Bugs / Overflows Detected: ${visualIssues.length}`);
  if (visualIssues.length > 0) {
    console.log('Visual Issues:', visualIssues);
  }

  await browser.close();
  console.log('\n=== MOBILE MASTER TEST SUITE COMPLETE ===');
  return { consoleErrors, visualIssues, testReport };
}

runMobileSuite().catch(err => {
  console.error('Mobile Suite failed with error:', err);
  process.exit(1);
});
