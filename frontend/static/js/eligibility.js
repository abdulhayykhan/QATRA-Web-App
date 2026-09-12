/**
 * QATRA — 4-Step Eligibility Checker Controller (Feature 4)
 * Evaluates donor answers against clinical rules via stateless scoring API (FR 4.1).
 */
import { apiPost, showToast } from './api.js';

let currentStep = 1;

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
});

function setStep(step) {
  currentStep = step;

  // Update progress bars
  for (let i = 1; i <= 4; i++) {
    const bar = document.getElementById(`bar-${i}`);
    if (i <= step) {
      bar.classList.add('active');
    } else {
      bar.classList.remove('active');
    }

    const stepEl = document.getElementById(`step-${i}`);
    if (stepEl) {
      stepEl.className = (i === step) ? 'quiz-step active' : 'quiz-step';
    }
  }
}

function setupNavigation() {
  document.getElementById('btn-next-1').addEventListener('click', () => {
    const age = parseInt(document.getElementById('quiz-age').value, 10);
    const weight = parseFloat(document.getElementById('quiz-weight').value);

    if (isNaN(age) || age < 16) {
      showToast('Donors must be at least 18 years old.', 'warning');
      return;
    }
    if (isNaN(weight) || weight < 40) {
      showToast('Minimum weight for donation is 50 kg.', 'warning');
      return;
    }

    setStep(2);
  });

  document.getElementById('btn-back-2').addEventListener('click', () => setStep(1));
  document.getElementById('btn-next-2').addEventListener('click', () => setStep(3));
  document.getElementById('btn-back-3').addEventListener('click', () => setStep(2));

  document.getElementById('btn-submit-quiz').addEventListener('click', async () => {
    const btn = document.getElementById('btn-submit-quiz');
    btn.disabled = true;
    btn.innerText = 'Scoring Clinical Answers... ⏳';

    const age = parseInt(document.getElementById('quiz-age').value, 10);
    const weight = parseFloat(document.getElementById('quiz-weight').value);

    const hasTattoo = document.getElementById('check-tattoo').checked;
    const hasSurgery = document.getElementById('check-surgery').checked;
    const hasDental = document.getElementById('check-dental').checked;
    const hasMalaria = document.getElementById('check-malaria').checked;

    const hasAntibiotics = document.getElementById('check-antibiotics').checked;
    const hasAspirin = document.getElementById('check-aspirin').checked;
    const hasHepatitis = document.getElementById('check-hepatitis').checked;
    const hasPregnancy = document.getElementById('check-pregnancy').checked;

    try {
      const response = await apiPost('/awareness/eligibility/check', {
        age: age,
        weight_kg: weight,
        has_recent_tattoo: hasTattoo,
        has_recent_surgery: hasSurgery,
        has_dental_work_72h: hasDental,
        has_recent_malaria_or_dengue: hasMalaria,
        taking_antibiotics: hasAntibiotics,
        taking_aspirin: hasAspirin,
        chronic_conditions: hasHepatitis,
        is_pregnant_or_nursing: hasPregnancy
      });

      renderResult(response);
      setStep(4);
    } catch (err) {
      // Fallback local scoring if offline
      const isEligible = age >= 18 && age <= 65 && weight >= 50 && !hasTattoo && !hasSurgery && !hasHepatitis && !hasAntibiotics;
      renderResult({
        status: isEligible ? 'eligible' : 'may_need_confirmation',
        message: isEligible 
          ? 'You meet standard voluntary blood donation criteria!' 
          : 'Some responses may require a brief on-site consultation with a phlebotomist.'
      });
      setStep(4);
    } finally {
      btn.disabled = false;
      btn.innerText = 'Evaluate My Eligibility 🩺';
    }
  });
}

function renderResult(result) {
  const card = document.getElementById('quiz-result-card');
  const icon = document.getElementById('result-icon');
  const title = document.getElementById('result-status-title');
  const msg = document.getElementById('result-message-text');
  const actionBtn = document.getElementById('result-action-btn');

  const status = (result.status || result.eligibility || 'eligible').toLowerCase();

  if (status.includes('eligible') && !status.includes('not')) {
    card.className = 'result-box eligible';
    icon.innerText = '🎉';
    title.innerText = 'You Are Eligible to Donate!';
    msg.innerText = result.message || 'You meet the clinical parameters to donate blood and help emergency patients in Karachi.';
    actionBtn.innerText = 'Register as Verified Donor';
    actionBtn.href = '/donor/register.html';
  } else if (status.includes('confirm') || status.includes('may_need')) {
    card.className = 'result-box warning';
    icon.innerText = '⚠️';
    title.innerText = 'May Need On-Site Consultation';
    msg.innerText = result.message || 'One or more of your responses indicates a temporary deferral window or requires phlebotomist review.';
    actionBtn.innerText = 'Learn About Deferral Periods';
    actionBtn.href = '/donor/awareness.html';
  } else {
    card.className = 'result-box deferred';
    icon.innerText = '🛑';
    title.innerText = 'Temporary Clinical Deferral';
    msg.innerText = result.message || 'For recipient and donor safety, you cannot donate blood at this time. Please check back after your recovery window.';
    actionBtn.innerText = 'Explore Awareness Library';
    actionBtn.href = '/donor/awareness.html';
  }
}
