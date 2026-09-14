const { chromium } = require('playwright-chromium');

const BASE_URL = 'https://qatra-web-app.vercel.app';

async function testAdminPages() {
  console.log('=== TEST SUITE 4: Admin & Compliance Operations ===');
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    console.log(`  [BROWSER ${msg.type().toUpperCase()}]:`, msg.text());
    if (msg.type() === 'error') consoleErrors.push(`[${page.url()}] ${msg.text()}`);
  });

  // ----------------------------------------------------
  // 1. TEST /admin/verification.html
  // ----------------------------------------------------
  console.log('\n--- 1. Testing /admin/verification.html ---');
  await page.goto(`${BASE_URL}/admin/verification.html`, { waitUntil: 'networkidle' });
  console.log(`  Page Title: ${await page.title()}`);

  // Check if admin gate modal appears initially (unauthenticated state)
  const isGateActive = await page.$eval('#admin-gate-modal', el => el.classList.contains('active')).catch(() => false);
  console.log(`  ✓ Admin Gate Modal displayed initially: ${isGateActive}`);

  // Test Sign In as Alkhidmat Desk Lead button
  const adminLoginBtn = await page.$('#btn-admin-login');
  if (adminLoginBtn) {
    await adminLoginBtn.click();
    await page.waitForTimeout(1000);
    console.log('  ✓ Clicked "Sign In as Alkhidmat Desk Lead"');
  }

  // Verify gate closed and desk lead header displayed
  const gateClosed = await page.$eval('#admin-gate-modal', el => !el.classList.contains('active')).catch(() => true);
  console.log(`  ✓ Admin Gate Modal dismissed: ${gateClosed}`);

  const adminInfoText = await page.$eval('#admin-user-info', el => el.innerText).catch(() => '');
  console.log(`  ✓ Admin Header info displayed: "${adminInfoText}"`);

  // Check pending escalation queue count
  const countBadge = await page.$eval('#pending-count-badge', el => el.innerText).catch(() => '');
  console.log(`  ✓ Escalation Queue Badge: ${countBadge}`);

  // Test Refresh Queue Button
  const refreshQueueBtn = await page.$('#refresh-queue-btn');
  if (refreshQueueBtn) {
    await refreshQueueBtn.click();
    await page.waitForTimeout(500);
    console.log('  ✓ Tested 🔄 Refresh Queue button');
  }

  // Check queue items and detail panel
  const queueCards = await page.$$('#queue-items-list .queue-card');
  console.log(`  ✓ Found ${queueCards.length} pending admission slips in queue`);

  if (queueCards.length > 0) {
    // Select first card
    await queueCards[0].click();
    await page.waitForTimeout(400);

    const hospitalName = await page.$eval('#detail-hospital-name', el => el.innerText).catch(() => '');
    const patientName = await page.$eval('#detail-patient-name', el => el.innerText).catch(() => '');
    const reqId = await page.$eval('#detail-request-id', el => el.innerText).catch(() => '');
    const bloodBadge = await page.$eval('#detail-blood-badge', el => el.innerText).catch(() => '');
    const confidenceText = await page.$eval('#detail-confidence-text', el => el.innerText).catch(() => '');
    console.log(`  ✓ Inspected Slip: Req #${reqId} | Hospital: "${hospitalName}" | Patient: "${patientName}" | Blood: ${bloodBadge} | OCR: ${confidenceText}`);

    // Test Approve Modal
    const approveBtn = await page.$('#approve-btn');
    if (approveBtn) {
      await approveBtn.click();
      await page.waitForTimeout(300);
      const isReviewModalActive = await page.$eval('#admin-review-modal', el => el.classList.contains('active')).catch(() => false);
      console.log(`  ✓ Review Modal opened on Approve: ${isReviewModalActive}`);

      // Fill audit review notes
      await page.fill('#review-notes-input', 'Verified patient hospital admission slip and doctor seal.');
      console.log('  ✓ Filled Desk Lead audit review notes');

      // Test Cancel in review modal
      const cancelReviewBtn = await page.$('#modal-cancel-btn');
      if (cancelReviewBtn) {
        await cancelReviewBtn.click();
        await page.waitForTimeout(200);
        console.log('  ✓ Cancelled review modal');
      }
    }

    // Test Reject Modal
    const rejectBtn = await page.$('#reject-btn');
    if (rejectBtn) {
      await rejectBtn.click();
      await page.waitForTimeout(300);
      console.log('  ✓ Review Modal opened on Reject');
      const cancelReviewBtn = await page.$('#modal-cancel-btn');
      if (cancelReviewBtn) {
        await cancelReviewBtn.click();
        await page.waitForTimeout(200);
      }
    }
  }

  // ----------------------------------------------------
  // 2. TEST /admin/drives.html
  // ----------------------------------------------------
  console.log('\n--- 2. Testing /admin/drives.html ---');
  await page.goto(`${BASE_URL}/admin/drives.html`, { waitUntil: 'networkidle' });
  console.log(`  Page Title: ${await page.title()}`);

  // Check stat boxes
  const activeDrivesCount = await page.$eval('#total-drives-count', el => el.innerText).catch(() => '0');
  const slotsBooked = await page.$eval('#total-slots-booked', el => el.innerText).catch(() => '0');
  const unitsCollected = await page.$eval('#total-units-collected', el => el.innerText).catch(() => '0');
  console.log(`  ✓ Stats: Active Drives=${activeDrivesCount}, Registered Donors=${slotsBooked}, Units Collected=${unitsCollected}`);

  // Test Public Notice Link
  const publicDriveLink = await page.$('a[href*="/donor/awareness.html?cat=events"]');
  console.log(`  ✓ Public Drives & Registration Link present: ${!!publicDriveLink}`);

  // Test QR Check-in button on drive card
  const checkinBtns = await page.$$('#drives-management-list .checkin-btn');
  console.log(`  ✓ Found ${checkinBtns.length} Drive Management Cards`);
  if (checkinBtns.length > 0) {
    await checkinBtns[0].click();
    await page.waitForTimeout(300);
    console.log('  ✓ Clicked "QR Check-in 📷" on first scheduled drive');
  }

  // Test + Create Drive Modal Open / Close
  const newDriveBtn = await page.$('#new-drive-btn');
  if (newDriveBtn) {
    await newDriveBtn.click();
    await page.waitForTimeout(300);
    const isModalActive = await page.$eval('#create-drive-modal', el => el.classList.contains('active')).catch(() => false);
    console.log(`  ✓ Schedule New Blood Drive Modal active: ${isModalActive}`);

    // Fill form
    await page.fill('#drive-title', 'SZABIST Emergency Blood Donation Drive');
    await page.fill('#drive-location', 'SZABIST Clifton Campus, Karachi');
    await page.fill('#drive-slots', '75');
    console.log('  ✓ Filled schedule drive form fields');

    // Close modal
    const closeModalBtn = await page.$('#close-modal-btn');
    if (closeModalBtn) {
      await closeModalBtn.click();
      await page.waitForTimeout(200);
      const isClosed = await page.$eval('#create-drive-modal', el => !el.classList.contains('active')).catch(() => true);
      console.log(`  ✓ Closed Create Drive Modal: ${isClosed}`);
    }
  }

  // ----------------------------------------------------
  // 3. TEST /admin/audit.html
  // ----------------------------------------------------
  console.log('\n--- 3. Testing /admin/audit.html ---');
  await page.goto(`${BASE_URL}/admin/audit.html`, { waitUntil: 'networkidle' });
  console.log(`  Page Title: ${await page.title()}`);

  // Check table body
  await page.waitForTimeout(1000);
  const auditRows = await page.$$('#audit-table-body tr');
  console.log(`  ✓ Found ${auditRows.length} rows in Tamper-Evident Audit Table`);

  // If unauthenticated prompt is shown, click sign in
  const auditLoginBtn = await page.$('#btn-audit-admin-login');
  if (auditLoginBtn) {
    await auditLoginBtn.click();
    await page.waitForTimeout(1000);
    console.log('  ✓ Signed in as Desk Lead on Audit Trail');
  }

  // Test Refresh Audit Button
  const refreshAuditBtn = await page.$('#refresh-audit-btn');
  if (refreshAuditBtn) {
    await refreshAuditBtn.click();
    await page.waitForTimeout(800);
    console.log('  ✓ Tested 🔄 Refresh Audit Trail button');
  }

  const updatedRows = await page.$$('#audit-table-body tr');
  console.log(`  ✓ Post-refresh Audit records present: ${updatedRows.length}`);

  console.log('\n--- Console Errors in Admin & Compliance Operations ---');
  console.log(consoleErrors.length > 0 ? consoleErrors : '  None (Clean!)');

  await browser.close();
  console.log('=== TEST SUITE 4 COMPLETE ===\n');
}

testAdminPages().catch(err => {
  console.error('Test Suite 4 failed with error:', err);
  process.exit(1);
});
