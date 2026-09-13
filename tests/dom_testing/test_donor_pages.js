const { chromium } = require('playwright-chromium');

const BASE_URL = 'https://qatra-web-app.vercel.app';

async function testDonorPages() {
  console.log('=== TEST SUITE 2: Donor Lifecycle Pages ===');
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
  // 1. TEST /donor/register.html
  // ----------------------------------------------------
  console.log('\n--- 1. Testing /donor/register.html ---');
  await page.goto(`${BASE_URL}/donor/register.html`, { waitUntil: 'networkidle' });
  console.log(`  Page Title: ${await page.title()}`);

  // Step 1: Google login button
  const googleBtn = await page.$('#google-signin-btn');
  console.log(`  ✓ Step 1 Google Sign-In button present: ${!!googleBtn}`);
  await googleBtn.click();
  await page.waitForTimeout(1000);

  // Should transition to Step 2
  const isStep2Active = await page.$eval('#step-2', el => el.classList.contains('active'));
  console.log(`  ✓ Step 2 (Profile Info) active after Auth: ${isStep2Active}`);

  // Step 2: Fill out Profile details
  await page.fill('#donor-fullname', 'Muhammad Usman');
  await page.selectOption('#donor-blood-group', 'B+');
  await page.fill('#donor-age', '26');
  await page.selectOption('#donor-gender', 'M');
  console.log('  ✓ Filled Step 2 Profile inputs');

  // Submit Step 2
  const profileForm = await page.$('#profile-form');
  await profileForm.evaluate(f => f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit', { cancelable: true })));
  await page.waitForTimeout(500);

  // Should transition to Step 3 (CNIC)
  const isStep3Active = await page.$eval('#step-3', el => el.classList.contains('active'));
  console.log(`  ✓ Step 3 (CNIC Verification) active: ${isStep3Active}`);

  // Test CNIC formatting
  const cnicInput = await page.$('#cnic-input');
  const uniqueCnic = `42101${Math.floor(1000000 + Math.random() * 9000000)}1`;
  await cnicInput.type(uniqueCnic);
  const formattedCnic = await cnicInput.inputValue();
  console.log(`  ✓ Formatted Pakistani CNIC: ${formattedCnic}`);
  const provinceTag = await page.$eval('#cnic-province-tag', el => el.innerText);
  console.log(`  ✓ Detected Province: ${provinceTag}`);

  // Submit Step 3
  const cnicForm = await page.$('#cnic-form');
  await cnicForm.evaluate(f => f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit', { cancelable: true })));
  await page.waitForTimeout(1000);

  // Should transition to Step 4 (Pre-Screen)
  const isStep4Active = await page.$eval('#step-4', el => el.classList.contains('active'));
  console.log(`  ✓ Step 4 (Health Pre-Screening) active: ${isStep4Active}`);

  // Check health checkboxes
  await page.check('#check-weight');
  await page.check('#check-hb');
  await page.check('#check-no-illness');
  await page.check('#check-no-surgery');
  console.log('  ✓ Checked all clinical safety checkboxes');

  // Finish Registration
  const prescreenForm = await page.$('#prescreen-form');
  await prescreenForm.evaluate(f => f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit', { cancelable: true })));
  await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
  console.log(`  ✓ Navigated after registration to: ${page.url()}`);

  // ----------------------------------------------------
  // 2. TEST /donor/eligibility.html
  // ----------------------------------------------------
  console.log('\n--- 2. Testing /donor/eligibility.html ---');
  await page.goto(`${BASE_URL}/donor/eligibility.html`, { waitUntil: 'networkidle' });
  console.log(`  Page Title: ${await page.title()}`);

  // Step 1
  await page.fill('#quiz-age', '27');
  await page.fill('#quiz-weight', '75');
  await page.click('#btn-next-1');
  await page.waitForTimeout(300);
  console.log('  ✓ Step 1 Next button clicked with valid Age (27) and Weight (75kg)');

  // Step 2 (Radio cards)
  await page.click('#opt-illness-no');
  await page.click('#btn-next-2');
  await page.waitForTimeout(300);
  console.log('  ✓ Step 2 Next button clicked with clean medical history');

  // Step 3 (Donation history)
  await page.click('#opt-cooldown-no');
  await page.click('#btn-submit-quiz');
  await page.waitForTimeout(1000);
  console.log('  ✓ Step 3 Submit button clicked');

  const resultTitle = await page.$eval('#result-status-title', el => el.innerText).catch(() => 'N/A');
  console.log(`  ✓ Quiz Submitted! Result Evaluation: "${resultTitle}"`);
  const retakeBtn = await page.$('#btn-retake-quiz');
  console.log(`  ✓ Retake Quiz button present: ${!!retakeBtn}`);

  // ----------------------------------------------------
  // 3. TEST /donor/awareness.html
  // ----------------------------------------------------
  console.log('\n--- 3. Testing /donor/awareness.html ---');
  await page.goto(`${BASE_URL}/donor/awareness.html`, { waitUntil: 'networkidle' });
  console.log(`  Page Title: ${await page.title()}`);

  // Test Category Pills
  const catPills = await page.$$('.cat-pill');
  console.log(`  ✓ Found ${catPills.length} Category Pills in Awareness Library`);
  for (const pill of catPills.slice(0, 4)) {
    const text = await pill.innerText();
    await pill.click();
    await page.waitForTimeout(300);
    console.log(`  ✓ Clicked category pill: "${text.trim()}"`);
  }

  // Test Search Bar
  const searchInput = await page.$('#search-input');
  if (searchInput) {
    await searchInput.fill('Dengue');
    await page.waitForTimeout(300);
    console.log('  ✓ Entered search term "Dengue" into search bar');
    await searchInput.fill('');
    await page.waitForTimeout(200);
  }

  // ----------------------------------------------------
  // 4. TEST /donor/dashboard.html
  // ----------------------------------------------------
  console.log('\n--- 4. Testing /donor/dashboard.html ---');
  await page.goto(`${BASE_URL}/donor/dashboard.html`, { waitUntil: 'networkidle' });
  console.log(`  Page Title: ${await page.title()}`);

  // Check Availability Toggle Switch via visible slider
  const toggleSlider = await page.$('.toggle-slider');
  if (toggleSlider) {
    await toggleSlider.click();
    console.log('  ✓ Toggled donor availability switch slider');
    await page.waitForTimeout(400);
    await toggleSlider.click();
    console.log('  ✓ Toggled donor availability switch back to active');
  }

  // Check Manual Completion Modal Trigger
  const completionModalBtn = await page.$('#open-completion-modal-btn');
  if (completionModalBtn) {
    await completionModalBtn.click();
    await page.waitForTimeout(400);
    const isModalOpen = await page.$eval('#completion-modal', el => el.classList.contains('active') || el.style.display !== 'none');
    console.log(`  ✓ Donation Completion Modal open: ${isModalOpen}`);

    const closeBtn = await page.$('#modal-close-completion');
    if (closeBtn) {
      await closeBtn.click();
      await page.waitForTimeout(300);
      console.log('  ✓ Donation Completion Modal closed');
    }
  }

  // Check Non-blocking Logout on Donor Dashboard
  const logoutBtn = await page.$('#logout-btn');
  if (logoutBtn) {
    await logoutBtn.click();
    await page.waitForTimeout(400);
    const isConfirmModalOpen = await page.$eval('#qatra-confirm-modal', el => el.style.display !== 'none');
    console.log(`  ✓ Custom Confirm Modal open on Dashboard logout: ${isConfirmModalOpen}`);
    const cancelBtn = await page.$('#qatra-confirm-cancel-btn');
    if (cancelBtn) {
      await cancelBtn.click();
      await page.waitForTimeout(300);
      console.log('  ✓ Cancelled logout, remaining on dashboard');
    }
  }

  // ----------------------------------------------------
  // 5. TEST /donor/confirm.html
  // ----------------------------------------------------
  console.log('\n--- 5. Testing /donor/confirm.html ---');
  await page.goto(`${BASE_URL}/donor/confirm.html`, { waitUntil: 'networkidle' });
  console.log(`  Page Title: ${await page.title()}`);

  const feedbackForm = await page.$('#feedback-form');
  console.log(`  ✓ Post-donation feedback form present: ${!!feedbackForm}`);
  if (feedbackForm) {
    await page.selectOption('#recovery-status', 'feeling_great');
    await page.check('#check-hydrated');
    const submitFeedbackBtn = await page.$('#submit-feedback-btn');
    await submitFeedbackBtn.click();
    await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
    console.log(`  ✓ Submitted feedback form, redirected to: ${page.url()}`);
  }

  console.log('\n--- Console Errors in Donor Flow ---');
  console.log(consoleErrors.length > 0 ? consoleErrors : '  None (Clean!)');

  await browser.close();
  console.log('=== TEST SUITE 2 COMPLETE ===\n');
}

testDonorPages().catch(err => {
  console.error('Test Suite 2 failed with error:', err);
  process.exit(1);
});
