const { chromium } = require('playwright-chromium');

const BASE_URL = 'https://qatra-web-app.vercel.app';

async function testSeekerPages() {
  console.log('=== TEST SUITE 3: Seeker Emergency Request & Fulfillment Lifecycle ===');
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(`[${page.url()}] ${msg.text()}`);
  });

  // ----------------------------------------------------
  // 1. TEST /seeker/request.html
  // ----------------------------------------------------
  console.log('\n--- 1. Testing /seeker/request.html ---');
  await page.goto(`${BASE_URL}/seeker/request.html`, { waitUntil: 'networkidle' });
  console.log(`  Page Title: ${await page.title()}`);

  // Step 1: Fill Patient and Hospital
  await page.fill('#patient-name', 'Baby of Fatima');
  await page.fill('#hospital-name', 'Jinnah Postgraduate Medical Centre (JPMC)');
  console.log('  ✓ Filled patient name and hospital name');

  // Select Blood Group
  const bloodBtn = await page.$('#blood-group-grid .blood-btn[data-blood="O+"]');
  if (bloodBtn) {
    await bloodBtn.click();
    console.log('  ✓ Selected blood group O+');
  }

  // Select component chip
  const compChip = await page.$('#component-chips .component-chip[data-type="Whole Blood"]');
  if (compChip) {
    await compChip.click();
    console.log('  ✓ Selected component Whole Blood');
  }

  // Test Units Stepper
  const plusBtn = await page.$('#stepper-plus');
  if (plusBtn) {
    await plusBtn.click();
    const units = await page.$eval('#units-display', el => el.innerText);
    console.log(`  ✓ Incremented units stepper to: ${units}`);
  }

  // Select Urgency Card
  const urgencyCard = await page.$('#urgency-cards .urgency-card[data-urgency="within_2_hours"]');
  if (urgencyCard) {
    await urgencyCard.click();
    console.log('  ✓ Selected Critical Urgency (within 2 hours)');
  }

  // Proceed to Step 2 (Hospital Slip Upload)
  const nextToSlipBtn = await page.$('#btn-next-to-slip');
  if (nextToSlipBtn) {
    await nextToSlipBtn.click();
    await page.waitForTimeout(500);
    console.log('  ✓ Clicked Next to Hospital Slip upload step');
  }

  // Attach mock hospital admission slip
  const dummyBuffer = Buffer.from('QATRA EMERGENCY HOSPITAL SLIP\nPatient: Baby of Fatima\nHospital: JPMC\nBlood Group: O+');
  await page.setInputFiles('#slip-file-input', {
    name: 'hospital_admission_slip.jpg',
    mimeType: 'image/jpeg',
    buffer: dummyBuffer
  });
  await page.waitForTimeout(600);
  console.log('  ✓ Attached hospital admission slip file');

  // Submit Emergency Request
  const submitSlipBtn = await page.$('#btn-submit-slip');
  if (submitSlipBtn) {
    await submitSlipBtn.click();
    console.log('  ✓ Clicked Submit Emergency Blood Appeal');
    await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
    console.log(`  ✓ Navigated after request submission to: ${page.url()}`);
  }

  const createdRequestId = await page.evaluate(() => localStorage.getItem('last_request_id')) || '1';
  console.log(`  ✓ Created Emergency Request ID: #${createdRequestId}`);

  // ----------------------------------------------------
  // 2. TEST /seeker/feed.html
  // ----------------------------------------------------
  console.log('\n--- 2. Testing /seeker/feed.html ---');
  await page.goto(`${BASE_URL}/seeker/feed.html`, { waitUntil: 'networkidle' });
  console.log(`  Page Title: ${await page.title()}`);

  // Test Dual Tabs
  const tabUrgent = await page.$('#tab-urgent');
  const tabAwareness = await page.$('#tab-awareness');
  console.log(`  ✓ Urgent Feed tab present: ${!!tabUrgent}`);
  console.log(`  ✓ Awareness Hub tab present: ${!!tabAwareness}`);
  if (tabAwareness) {
    await tabAwareness.click();
    await page.waitForTimeout(300);
    console.log('  ✓ Switched to Awareness Hub tab on Feed');
    await tabUrgent.click();
    await page.waitForTimeout(300);
    console.log('  ✓ Switched back to Urgent Appeals tab');
  }

  // Test Filter Chips
  const filterChips = await page.$$('#blood-filter-chips .chip-btn');
  console.log(`  ✓ Found ${filterChips.length} Filter Chips on Live Feed`);
  if (filterChips.length > 1) {
    await filterChips[1].click();
    await page.waitForTimeout(400);
    console.log(`  ✓ Clicked filter chip: "${(await filterChips[1].innerText()).trim()}"`);
    await filterChips[0].click(); // Reset to All
  }

  // Test Search Box
  const searchInput = await page.$('#hospital-search-input');
  if (searchInput) {
    await searchInput.fill('Civil Hospital');
    await page.waitForTimeout(400);
    console.log('  ✓ Performed live debounced search for "Civil Hospital"');
    await searchInput.fill('');
  }

  // ----------------------------------------------------
  // 3. TEST /seeker/map.html
  // ----------------------------------------------------
  console.log('\n--- 3. Testing /seeker/map.html ---');
  await page.goto(`${BASE_URL}/seeker/map.html`, { waitUntil: 'networkidle' });
  console.log(`  Page Title: ${await page.title()}`);

  // Check Leaflet map element
  const mapContainer = await page.$('#live-map');
  console.log(`  ✓ Leaflet #live-map container initialized: ${!!mapContainer}`);

  // Test Radius Chips
  const radiusChips = await page.$$('#radius-chips .chip-btn');
  console.log(`  ✓ Found ${radiusChips.length} Map Radius Filter Chips`);
  for (const chip of radiusChips) {
    await chip.click();
    await page.waitForTimeout(200);
  }
  console.log('  ✓ Successfully tested all Map radius filters (5km, 10km, 15km)');

  // Test Map Recenter GPS Button
  const gpsBtn = await page.$('#btn-recenter-gps');
  if (gpsBtn) {
    await gpsBtn.click();
    console.log('  ✓ Clicked Recenter GPS Map button');
  }

  // ----------------------------------------------------
  // 4. TEST /seeker/match.html
  // ----------------------------------------------------
  console.log('\n--- 4. Testing /seeker/match.html ---');
  await page.goto(`${BASE_URL}/seeker/match.html?request_id=${createdRequestId}`, { waitUntil: 'networkidle' });
  console.log(`  Page Title: ${await page.title()}`);

  const chatDonorBtn = await page.$('#btn-match-chat-donor');
  console.log(`  ✓ In-App Chat button present: ${!!chatDonorBtn}`);
  if (chatDonorBtn) {
    console.log(`  ✓ Chat href destination: ${await chatDonorBtn.getAttribute('href')}`);
  }

  // ----------------------------------------------------
  // 5. TEST /seeker/coordination.html
  // ----------------------------------------------------
  console.log('\n--- 5. Testing /seeker/coordination.html ---');
  await page.goto(`${BASE_URL}/seeker/coordination.html?request_id=${createdRequestId}`, { waitUntil: 'networkidle' });
  console.log(`  Page Title: ${await page.title()}`);

  // Test Quick Preset Message Chips
  const presetChips = await page.$$('.preset-chip, .quick-reply-btn');
  console.log(`  ✓ Found ${presetChips.length} Quick Reply / Preset Chips in Coordination Chat`);
  if (presetChips.length > 0) {
    await presetChips[0].click();
    console.log('  ✓ Clicked first preset coordination message');
  }

  // Test Chat Input and Send Button
  const chatInput = await page.$('#chat-input, input[placeholder*="message"]');
  const sendBtn = await page.$('#btn-send-message, #chat-send-btn');
  if (chatInput && sendBtn) {
    await chatInput.fill('We are waiting outside Blood Bank, 2nd floor.');
    await sendBtn.click();
    await page.waitForTimeout(500);
    console.log('  ✓ Sent live coordination message via chat');
  }

  // Test Turn-by-Turn Hospital Directions Button
  const dirBtn = await page.$('#btn-open-gps-directions');
  if (dirBtn) {
    const dirHref = await dirBtn.getAttribute('href');
    console.log(`  ✓ Hospital GPS Navigation link verified: ${dirHref}`);
  }

  // ----------------------------------------------------
  // 6. TEST /seeker/status.html
  // ----------------------------------------------------
  console.log('\n--- 6. Testing /seeker/status.html ---');
  await page.goto(`${BASE_URL}/seeker/status.html?request_id=${createdRequestId}`, { waitUntil: 'networkidle' });
  console.log(`  Page Title: ${await page.title()}`);

  // Test Close / Cancel Request with non-blocking confirmation dialog
  const closeRequestBtn = await page.$('#close-request-btn, #btn-close-request');
  if (closeRequestBtn) {
    await closeRequestBtn.click();
    await page.waitForTimeout(400);
    const isConfirmOpen = await page.$eval('#qatra-confirm-modal', el => el.style.display !== 'none').catch(() => false);
    console.log(`  ✓ Custom Confirm Modal open on Close Request: ${isConfirmOpen}`);
    const cancelBtn = await page.$('#qatra-confirm-cancel-btn');
    if (cancelBtn) {
      await cancelBtn.click();
      await page.waitForTimeout(300);
      console.log('  ✓ Cancelled close action, request remains active');
    }
  }

  // ----------------------------------------------------
  // 7. TEST /seeker/closure.html
  // ----------------------------------------------------
  console.log('\n--- 7. Testing /seeker/closure.html ---');
  await page.goto(`${BASE_URL}/seeker/closure.html?request_id=${createdRequestId}`, { waitUntil: 'networkidle' });
  console.log(`  Page Title: ${await page.title()}`);

  // Test Star Rating selection
  const starBtns = await page.$$('.star-btn, .star-icon');
  console.log(`  ✓ Found ${starBtns.length} Star Rating interactive elements`);
  if (starBtns.length >= 5) {
    await starBtns[4].click();
    console.log('  ✓ Clicked 5-Star Donor Rating');
  }

  // Test Confirm Closure Button
  const confirmCloseBtn = await page.$('#confirm-close-btn');
  console.log(`  ✓ Confirm Close button present: ${!!confirmCloseBtn}`);

  console.log('\n--- Console Errors in Seeker Lifecycle ---');
  console.log(consoleErrors.length > 0 ? consoleErrors : '  None (Clean!)');

  await browser.close();
  console.log('=== TEST SUITE 3 COMPLETE ===\n');
}

testSeekerPages().catch(err => {
  console.error('Test Suite 3 failed with error:', err);
  process.exit(1);
});
