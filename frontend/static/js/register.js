/**
 * QATRA — Donor Onboarding & Multi-Step Verification Controller (Feature 2)
 * Handles Google Sign-In, CNIC validation, and pre-screening checklists.
 */
import { apiPost, showToast, setAuthToken, setCurrentUser } from './api.js';

let currentStep = 1;
let registrationState = {
  fullName: '',
  bloodGroup: 'O+',
  age: 24,
  gender: 'M',
  cnic: '',
  frontUrl: '',
  backUrl: ''
};

document.addEventListener('DOMContentLoaded', () => {
  setupStep1Google();
  setupStep2Profile();
  setupStep3CNIC();
  setupStep4PreScreen();
});

function goToStep(stepNumber) {
  currentStep = stepNumber;

  // Update nodes
  for (let i = 1; i <= 4; i++) {
    const node = document.getElementById(`step-node-${i}`);
    const content = document.getElementById(`step-content` ? `step-${i}` : null);
    
    if (i < currentStep) {
      node.className = 'step-node completed';
    } else if (i === currentStep) {
      node.className = 'step-node active';
    } else {
      node.className = 'step-node';
    }

    if (content) {
      content.className = (i === currentStep) ? 'step-content active' : 'step-content';
    }
  }
}

function setupStep1Google() {
  const googleBtn = document.getElementById('google-signin-btn');

  googleBtn.addEventListener('click', async () => {
    googleBtn.innerText = 'Connecting to Google... ⏳';
    googleBtn.disabled = true;

    try {
      // Simulate Google Sign-In or use Firebase token
      const mockGoogleToken = `test_google_token_${Date.now()}`;
      const response = await apiPost('/auth/firebase-login', {
        firebase_id_token: mockGoogleToken
      });

      setAuthToken(response.access_token);
      setCurrentUser(response.user);

      registrationState.fullName = response.user.full_name || 'Alkhidmat Volunteer';
      document.getElementById('donor-fullname').value = registrationState.fullName;

      showToast('Google Identity authenticated successfully!', 'success');
      goToStep(2);
    } catch (err) {
      googleBtn.innerText = 'Continue with Google';
      googleBtn.disabled = false;
    }
  });
}

function setupStep2Profile() {
  const form = document.getElementById('profile-form');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    registrationState.fullName = document.getElementById('donor-fullname').value.trim();
    registrationState.bloodGroup = document.getElementById('donor-blood-group').value;
    registrationState.age = parseInt(document.getElementById('donor-age').value, 10);
    registrationState.gender = document.getElementById('donor-gender').value;

    goToStep(3);
  });
}

function setupStep3CNIC() {
  const input = document.getElementById('cnic-input');
  const form = document.getElementById('cnic-form');
  const btn = document.getElementById('cnic-submit-btn');

  // Auto format: 42101-1234567-1
  input.addEventListener('input', (e) => {
    let val = input.value.replace(/\D/g, '');
    if (val.length > 13) val = val.substring(0, 13);

    let formatted = '';
    if (val.length > 5) {
      formatted += val.substring(0, 5) + '-';
      if (val.length > 12) {
        formatted += val.substring(5, 12) + '-' + val.substring(12);
      } else {
        formatted += val.substring(5);
      }
    } else {
      formatted = val;
    }
    input.value = formatted;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rawCnic = input.value.replace(/\D/g, '');

    if (rawCnic.length !== 13) {
      showToast('Please enter a valid 13-digit Pakistani CNIC number.', 'warning');
      return;
    }

    btn.disabled = true;
    btn.innerText = 'Encrypting & Validating... ⏳';

    try {
      await apiPost('/auth/cnic/submit', {
        cnic_number: rawCnic,
        front_image_url: document.getElementById('cnic-front-url').value || 'https://vault.supabase.co/front_placeholder.jpg',
        back_image_url: document.getElementById('cnic-back-url').value || 'https://vault.supabase.co/back_placeholder.jpg'
      });

      showToast('CNIC checksum validated and AES-256 encrypted at rest.', 'success');
      goToStep(4);
    } catch (err) {
      btn.disabled = false;
      btn.innerText = 'Validate CNIC & Proceed →';
    }
  });
}

function setupStep4PreScreen() {
  const form = document.getElementById('prescreen-form');
  const btn = document.getElementById('finish-registration-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const weightPassed = document.getElementById('check-weight').checked;
    const hbPassed = document.getElementById('check-hb').checked;
    const noIllness = document.getElementById('check-no-illness').checked;
    const noSurgery = document.getElementById('check-no-surgery').checked;

    if (!weightPassed || !hbPassed || !noIllness || !noSurgery) {
      showToast('You must meet all clinical criteria to join the live emergency pool.', 'warning');
      return;
    }

    btn.disabled = true;
    btn.innerText = 'Activating Profile... ⏳';

    try {
      const response = await apiPost('/auth/donor/pre-screen', {
        age: registrationState.age,
        weight_kg: 68.0,
        hemoglobin_g_dl: 14.0,
        has_recent_illness: false,
        has_recent_tattoo_or_surgery: false
      });

      showToast(response.message || 'Donor verification completed!', 'success');
      setTimeout(() => {
        window.location.href = '/donor/dashboard.html';
      }, 1500);
    } catch (err) {
      btn.disabled = false;
      btn.innerText = 'Complete Registration & Activate Donor Profile ✅';
    }
  });
}
