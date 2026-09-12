/**
 * QATRA — 4-Step Interactive Eligibility Checker Controller (Feature 4)
 * Evaluates donor answers against clinical rules via stateless scoring API (FR 4.1).
 * Owner: Yumna Abbasi
 */
import { apiPost, showToast } from './api.js';

let currentStep = 1;

document.addEventListener('DOMContentLoaded', () => {
  setupRadioCards();
  setupNavigation();
});

/**
 * Configure visual card selection for step 2 and step 3 radio choices.
 */
function setupRadioCards() {
  document.querySelectorAll('.radio-card').forEach(card => {
    card.addEventListener('click', () => {
      const groupName = card.querySelector('input[type="radio"]')?.name;
      if (groupName) {
        document.querySelectorAll(`input[name="${groupName}"]`).forEach(input => {
          input.closest('.radio-card')?.classList.remove('selected');
        });
        const radio = card.querySelector('input[type="radio"]');
        if (radio) {
          radio.checked = true;
          card.classList.add('selected');
        }
      }
    });
  });
}

/**
 * Switch active step in stepper UI.
 * @param {number} step 
 */
function setStep(step) {
  currentStep = step;

  // Update progress bars
  for (let i = 1; i <= 4; i++) {
    const bar = document.getElementById(`bar-${i}`);
    if (bar) {
      if (i <= step) {
        bar.classList.add('active');
      } else {
        bar.classList.remove('active');
      }
    }

    const stepEl = document.getElementById(`step-${i}`);
    if (stepEl) {
      stepEl.className = (i === step) ? 'quiz-step active' : 'quiz-step';
    }
  }

  // Scroll smoothly to top of content
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Setup navigation listeners and quiz submission handler.
 */
function setupNavigation() {
  // Step 1 -> Step 2
  const btnNext1 = document.getElementById('btn-next-1');
  if (btnNext1) {
    btnNext1.addEventListener('click', () => {
      const age = parseInt(document.getElementById('quiz-age')?.value, 10);
      const weight = parseFloat(document.getElementById('quiz-weight')?.value);

      if (isNaN(age) || age < 1) {
        showToast('Please enter a valid age.', 'warning');
        return;
      }
      if (isNaN(weight) || weight < 10) {
        showToast('Please enter a valid weight in kg.', 'warning');
        return;
      }

      setStep(2);
    });
  }

  // Step 2 Back & Next
  const btnBack2 = document.getElementById('btn-back-2');
  if (btnBack2) {
    btnBack2.addEventListener('click', () => setStep(1));
  }

  const btnNext2 = document.getElementById('btn-next-2');
  if (btnNext2) {
    btnNext2.addEventListener('click', () => setStep(3));
  }

  // Step 3 Back
  const btnBack3 = document.getElementById('btn-back-3');
  if (btnBack3) {
    btnBack3.addEventListener('click', () => setStep(2));
  }

  // Step 4 Retake Quiz
  const btnRetake = document.getElementById('btn-retake-quiz');
  if (btnRetake) {
    btnRetake.addEventListener('click', () => {
      setStep(1);
    });
  }

  // Submit Quiz -> Evaluate API
  const btnSubmit = document.getElementById('btn-submit-quiz');
  if (btnSubmit) {
    btnSubmit.addEventListener('click', async () => {
      btnSubmit.disabled = true;
      btnSubmit.innerText = 'Evaluating Clinical Criteria... ⏳';

      const age = parseInt(document.getElementById('quiz-age')?.value, 10) || 23;
      const weight = parseFloat(document.getElementById('quiz-weight')?.value) || 65.0;

      const illnessChecked = document.querySelector('input[name="illness-choice"]:checked')?.value === 'yes';
      const cooldownChecked = document.querySelector('input[name="cooldown-choice"]:checked')?.value === 'yes';

      const payload = {
        step1_age: age,
        step1_weight_kg: weight,
        step2_has_recent_illness: illnessChecked,
        step3_donated_within_90_days: cooldownChecked
      };

      try {
        const response = await apiPost('/awareness/eligibility-check', payload);
        renderEvaluationResult(response, payload);
        setStep(4);
      } catch (err) {
        // Fallback local scoring if offline or API unreachable
        const step1Pass = (age >= 18 && age <= 65 && weight >= 50.0);
        const step2Pass = !illnessChecked;
        const step3Pass = !cooldownChecked;

        let resType = 'eligible';
        let summary = 'Eligible to Proceed';
        let message = 'Based on your preliminary answers, you meet initial donor criteria.';

        if (!step1Pass) {
          resType = 'not_eligible';
          summary = age < 18 ? 'Age Criteria Not Met' : (age > 65 ? 'Age Upper Limit Exceeded' : 'Weight Below Minimum Threshold');
          message = 'National clinical safety parameters require donors to be 18–65 years old and at least 50 kg.';
        } else if (!step3Pass) {
          resType = 'not_eligible';
          summary = 'Active Cooldown Window';
          message = 'A mandatory 90-day recovery interval is required between donations to allow full red blood cell and iron replenishment.';
        } else if (!step2Pass) {
          resType = 'may_need_confirmation';
          summary = 'Medical Confirmation Required';
          message = 'Recent illness or antibiotic treatment may require temporary deferral. On-site staff will assess your vitals.';
        }

        renderEvaluationResult({
          result: resType,
          summary: summary,
          message: message,
          disclaimer: 'This quiz is for preliminary screening only. Final eligibility is determined on-site by qualified medical staff.',
          details: {
            step1_core_criteria: { passed: step1Pass, age, weight_kg: weight },
            step2_health_condition: { passed: step2Pass, has_recent_illness: illnessChecked },
            step3_cooldown: { passed: step3Pass, donated_within_90_days: cooldownChecked }
          }
        }, payload);
        setStep(4);
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerText = 'Evaluate My Eligibility 🩺';
      }
    });
  }
}

/**
 * Render structured evaluation result and stepper breakdown indicators.
 * @param {Object} data 
 * @param {Object} payload 
 */
function renderEvaluationResult(data, payload) {
  const card = document.getElementById('quiz-result-card');
  const icon = document.getElementById('result-icon');
  const badge = document.getElementById('result-summary-badge');
  const title = document.getElementById('result-status-title');
  const msg = document.getElementById('result-message-text');
  const disclaimerEl = document.getElementById('result-disclaimer-text');
  const actionPrimary = document.getElementById('result-action-primary');
  const actionSecondary = document.getElementById('result-action-secondary');

  const resultType = (data.result || 'eligible').toLowerCase();

  // Set disclaimer
  if (disclaimerEl && data.disclaimer) {
    disclaimerEl.innerText = data.disclaimer;
  }

  // Update Main Result Card
  if (resultType === 'eligible') {
    card.className = 'result-box eligible';
    icon.innerText = '🎉';
    badge.className = 'badge badge-success';
    badge.innerText = data.summary || 'Eligible to Proceed';
    title.innerText = 'You Meet Initial Donor Criteria!';
    msg.innerText = data.message || 'You meet clinical parameters to donate blood and help patients in Karachi.';
    
    actionPrimary.innerText = 'Find Upcoming Blood Drives 📍';
    actionPrimary.href = '/donor/awareness.html';
    actionPrimary.style.display = 'block';

    actionSecondary.innerText = 'Go to Donor Dashboard';
    actionSecondary.href = '/donor/dashboard.html';
  } else if (resultType === 'may_need_confirmation') {
    card.className = 'result-box warning';
    icon.innerText = '⚠️';
    badge.className = 'badge badge-warning';
    badge.innerText = data.summary || 'Medical Confirmation Required';
    title.innerText = 'On-Site Medical Consultation Required';
    msg.innerText = data.message || 'One of your responses requires a brief consultation with a certified phlebotomist.';

    actionPrimary.innerText = 'Explore Preparation & Recovery Library';
    actionPrimary.href = '/donor/awareness.html';
    actionPrimary.style.display = 'block';

    actionSecondary.innerText = 'Return to Donor Dashboard';
    actionSecondary.href = '/donor/dashboard.html';
  } else {
    // not_eligible / deferred
    card.className = 'result-box deferred';
    icon.innerText = '🛑';
    badge.className = 'badge badge-danger';
    badge.innerText = data.summary || 'Temporary Deferral';
    title.innerText = 'Temporary Clinical Deferral';
    msg.innerText = data.message || 'For donor and recipient safety, you cannot donate at this time.';

    actionPrimary.innerText = 'Read About Deferral Windows & Nutrition';
    actionPrimary.href = '/donor/awareness.html';
    actionPrimary.style.display = 'block';

    actionSecondary.innerText = 'Return to Donor Dashboard';
    actionSecondary.href = '/donor/dashboard.html';
  }

  // Update Stepper Breakdown Indicators
  const details = data.details || {};

  const step1Passed = details.step1_core_criteria ? details.step1_core_criteria.passed : (payload.step1_age >= 18 && payload.step1_age <= 65 && payload.step1_weight_kg >= 50);
  const step2Passed = details.step2_health_condition ? details.step2_health_condition.passed : (!payload.step2_has_recent_illness);
  const step3Passed = details.step3_cooldown ? details.step3_cooldown.passed : (!payload.step3_donated_within_90_days);

  const b1Status = document.getElementById('breakdown-step1-status');
  if (b1Status) {
    b1Status.innerHTML = step1Passed 
      ? '<span style="color: var(--color-success);">✅ Passed</span>'
      : '<span style="color: var(--color-danger);">❌ Criteria Unmet</span>';
  }

  const b2Status = document.getElementById('breakdown-step2-status');
  if (b2Status) {
    b2Status.innerHTML = step2Passed
      ? '<span style="color: var(--color-success);">✅ Passed</span>'
      : '<span style="color: var(--color-warning);">⚠️ On-site Check</span>';
  }

  const b3Status = document.getElementById('breakdown-step3-status');
  if (b3Status) {
    b3Status.innerHTML = step3Passed
      ? '<span style="color: var(--color-success);">✅ Passed</span>'
      : '<span style="color: var(--color-danger);">⏳ 90-Day Cooldown</span>';
  }
}
