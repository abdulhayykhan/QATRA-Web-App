/**
 * QATRA — Emergency Blood Request & Hospital Slip Controller (Feature 3 & 2)
 * Owner: Mahrukh Baig
 *
 * Implements Wireframe pg 5 (Requirements) & pg 6 (Slip verification upload).
 */
import { apiUpload, showToast, getCurrentUser } from './api.js';

let selectedSlipFile = null;

document.addEventListener('DOMContentLoaded', () => {
  setupBloodGroupGrid();
  setupComponentChips();
  setupUnitsStepper();
  setupUrgencyCards();
  setupStepNavigation();
  setupSlipUpload();
  setupFormSubmission();
});

/**
 * Blood group 8-pill selection (Wireframe pg 5)
 */
function setupBloodGroupGrid() {
  const buttons = document.querySelectorAll('#blood-group-grid .blood-btn');
  const hiddenInput = document.getElementById('blood-group-val');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      hiddenInput.value = btn.getAttribute('data-blood');
    });
  });
}

/**
 * Component type selection
 */
function setupComponentChips() {
  const chips = document.querySelectorAll('#component-chips .component-chip');
  const hiddenInput = document.getElementById('component-type-val');

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      hiddenInput.value = chip.getAttribute('data-type');
    });
  });
}

/**
 * Interactive units stepper counter ([-] / [+])
 */
function setupUnitsStepper() {
  const minusBtn = document.getElementById('stepper-minus');
  const plusBtn = document.getElementById('stepper-plus');
  const display = document.getElementById('units-display');
  const label = document.getElementById('units-label');
  const hiddenInput = document.getElementById('units-needed-val');

  let count = 1;

  function update() {
    display.innerText = count;
    label.innerText = count === 1 ? 'Bag' : 'Bags';
    hiddenInput.value = count;
  }

  minusBtn.addEventListener('click', () => {
    if (count > 1) {
      count--;
      update();
    }
  });

  plusBtn.addEventListener('click', () => {
    if (count < 10) {
      count++;
      update();
    }
  });
}

/**
 * Urgency radio cards selection
 */
function setupUrgencyCards() {
  const cards = document.querySelectorAll('#urgency-cards .urgency-card');
  const hiddenInput = document.getElementById('urgency-val');

  cards.forEach(card => {
    card.addEventListener('click', () => {
      cards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      hiddenInput.value = card.getAttribute('data-urgency');
    });
  });
}

/**
 * Multi-step wizard: Step 1 Details -> Step 2 Slip Upload
 */
function setupStepNavigation() {
  const step1 = document.getElementById('form-step-1');
  const step2 = document.getElementById('form-step-2');
  const nextBtn = document.getElementById('btn-next-to-slip');
  const backBtn = document.getElementById('btn-back-to-details');
  const dot1 = document.getElementById('dot-step-1');
  const dot2 = document.getElementById('dot-step-2');
  const line = document.getElementById('line-step-1');

  nextBtn.addEventListener('click', () => {
    const patientName = document.getElementById('patient-name').value.trim();
    const hospitalName = document.getElementById('hospital-name').value.trim();

    if (!patientName) {
      showToast('Please enter the patient name.', 'warning');
      document.getElementById('patient-name').focus();
      return;
    }

    if (!hospitalName) {
      showToast('Please enter or select the hospital name.', 'warning');
      document.getElementById('hospital-name').focus();
      return;
    }

    step1.style.display = 'none';
    step2.style.display = 'block';
    dot2.classList.add('active');
    line.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  backBtn.addEventListener('click', () => {
    step2.style.display = 'none';
    step1.style.display = 'block';
    dot2.classList.remove('active');
    line.classList.remove('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/**
 * Hospital slip drag-and-drop & file selection (Wireframe pg 6)
 */
function setupSlipUpload() {
  const dropFrame = document.getElementById('slip-drop-frame');
  const fileInput = document.getElementById('slip-file-input');
  const previewCard = document.getElementById('slip-preview-card');
  const previewImg = document.getElementById('slip-preview-img');
  const fileName = document.getElementById('slip-file-name');
  const fileSize = document.getElementById('slip-file-size');
  const removeBtn = document.getElementById('slip-remove-btn');

  dropFrame.addEventListener('click', () => fileInput.click());

  dropFrame.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropFrame.style.background = '#FFE0E0';
  });

  dropFrame.addEventListener('dragleave', () => {
    dropFrame.style.background = 'var(--primary-red-subtle)';
  });

  dropFrame.addEventListener('drop', (e) => {
    e.preventDefault();
    dropFrame.style.background = 'var(--primary-red-subtle)';
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) {
      processFile(fileInput.files[0]);
    }
  });

  removeBtn.addEventListener('click', () => {
    selectedSlipFile = null;
    fileInput.value = '';
    previewCard.style.display = 'none';
    dropFrame.style.display = 'block';
  });

  function processFile(file) {
    if (file.size > 10 * 1024 * 1024) {
      showToast('File size exceeds 10MB limit.', 'error');
      return;
    }

    selectedSlipFile = file;
    fileName.innerText = file.name;
    fileSize.innerText = `${(file.size / 1024).toFixed(1)} KB`;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImg.src = e.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      // PDF placeholder icon
      previewImg.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="55" height="55" viewBox="0 0 24 24" fill="%23C92A2A"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>';
    }

    dropFrame.style.display = 'none';
    previewCard.style.display = 'flex';
  }
}

/**
 * Handles multipart form submission to the hospital slip OCR upload endpoint
 */
function setupFormSubmission() {
  const form = document.getElementById('create-request-form');
  const submitBtn = document.getElementById('btn-submit-slip');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!selectedSlipFile) {
      showToast('Please attach a hospital admission slip or doctor order.', 'warning');
      return;
    }

    const patientName = document.getElementById('patient-name').value.trim();
    const hospitalName = document.getElementById('hospital-name').value.trim();
    const bloodGroup = document.getElementById('blood-group-val').value;
    const componentType = document.getElementById('component-type-val').value;
    const unitsNeeded = document.getElementById('units-needed-val').value;
    const urgency = document.getElementById('urgency-val').value;

    submitBtn.disabled = true;
    const originalText = submitBtn.innerText;
    submitBtn.innerText = 'Analyzing Requisition Slip via OCR... ⏳';

    const formData = new FormData();
    formData.append('file', selectedSlipFile);
    formData.append('patient_name', patientName);
    formData.append('hospital_name', hospitalName);
    formData.append('blood_group', bloodGroup);
    formData.append('component_type', componentType);
    formData.append('units_needed', unitsNeeded);
    formData.append('urgency', urgency);

    try {
      const res = await apiUpload('/auth/hospital-slip/upload', formData);
      const isAutoApproved = res.status === 'verified';

      if (isAutoApproved) {
        showToast('Hospital slip verified! Emergency broadcast active.', 'success');
        setTimeout(() => {
          window.location.href = `/seeker/map.html?request_id=${res.request_id}`;
        }, 1500);
      } else {
        showToast('Slip uploaded. Queued for 24/7 Desk Review (<3 mins).', 'info');
        setTimeout(() => {
          window.location.href = '/seeker/feed.html';
        }, 1800);
      }
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.innerText = originalText;
    }
  });
}
