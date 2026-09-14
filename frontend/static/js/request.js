/**
 * QATRA — Emergency Blood Request & Hospital Slip Controller (Feature 3 & 2)
 * Owner: Mahrukh Baig
 *
 * Implements Wireframe pg 5 (Requirements) & pg 6 (Slip verification upload).
 */
import { apiUpload, apiPost, showToast, onReady } from './api.js';

let selectedSlipFile = null;

onReady(() => {
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
  const dot2 = document.getElementById('dot-step-2');
  const line = document.getElementById('line-step-1');
  const patientInput = document.getElementById('patient-name');
  const hospitalInput = document.getElementById('hospital-name');

  function proceedToStep2() {
    const patientName = patientInput.value.trim();
    const hospitalName = hospitalInput.value.trim();

    if (!patientName) {
      showToast('Please enter the patient name.', 'warning');
      patientInput.focus();
      return;
    }

    if (!hospitalName) {
      showToast('Please enter or select the hospital name.', 'warning');
      hospitalInput.focus();
      return;
    }

    step1.style.display = 'none';
    step2.style.display = 'block';
    dot2.classList.add('active');
    line.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  nextBtn.addEventListener('click', proceedToStep2);

  // Prevent accidental submit on enter key in Step 1
  patientInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      hospitalInput.focus();
    }
  });

  hospitalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      proceedToStep2();
    }
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

  // Prevent fileInput from re-triggering dropFrame click
  fileInput.addEventListener('click', (e) => e.stopPropagation());

  dropFrame.addEventListener('click', (e) => {
    if (e.target !== fileInput) {
      fileInput.click();
    }
  });

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

  async function processFile(file) {
    if (file.size > 15 * 1024 * 1024) {
      showToast('File size exceeds 15MB limit. Please select a smaller file.', 'error');
      return;
    }

    // 1. Immediately select file and show preview for responsive user feedback
    selectedSlipFile = file;
    fileName.innerText = file.name;
    fileSize.innerText = `${(file.size / 1024).toFixed(1)} KB`;

    if (file.type && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImg.src = e.target.result;
      };
      reader.readAsDataURL(file);

      // 2. Perform background client-side compression to stay well below serverless limits
      compressImageIfNeeded(file, 1600, 0.82)
        .then((compressed) => {
          if (compressed && compressed.size) {
            selectedSlipFile = compressed;
            fileSize.innerText = `${(compressed.size / 1024).toFixed(1)} KB (Optimized)`;
          }
        })
        .catch(() => {
          // Keep original file as fallback
          selectedSlipFile = file;
        });
    } else {
      // PDF placeholder icon
      previewImg.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="55" height="55" viewBox="0 0 24 24" fill="%23C92A2A"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>';
    }

    dropFrame.style.display = 'none';
    previewCard.style.display = 'flex';
  }
}

/**
 * Client-Side Image Resizing & Compression for Mobile Cameras (iOS/Android)
 * Keeps payloads < 1.5MB to guarantee instantaneous upload and stay well below Vercel limits.
 */
function compressImageIfNeeded(file, maxDimension = 1600, quality = 0.82) {
  if (!file || !file.type || !file.type.startsWith('image/')) {
    return Promise.resolve(file);
  }

  return new Promise((resolve) => {
    // 4-second safety timeout so compression never blocks submission
    const timeout = setTimeout(() => resolve(file), 4000);

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        clearTimeout(timeout);
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          clearTimeout(timeout);
          if (!blob || blob.size >= file.size) {
            resolve(file);
          } else {
            const safeName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
            try {
              const compressed = new File([blob], safeName, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressed);
            } catch (err) {
              // Fallback for WebViews where new File() is restricted
              blob.name = safeName;
              blob.lastModified = Date.now();
              resolve(blob);
            }
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}

/**
 * Ensure the client has a valid session token (user session or emergency seeker session)
 */
async function ensureSeekerToken() {
  let token = localStorage.getItem('qatra_token');

  // Verify JWT expiration if token exists
  if (token) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.exp && payload.exp * 1000 < Date.now() + 60000) {
          // Token is expired or will expire in 60s
          token = null;
        }
      }
    } catch (e) {
      token = null;
    }
  }

  if (!token) {
    try {
      const emergencyToken = `demo_seeker_${Date.now()}`;
      const authRes = await apiPost('/auth/firebase-login', {
        firebase_id_token: emergencyToken,
      });
      if (authRes && authRes.access_token) {
        localStorage.setItem('qatra_token', authRes.access_token);
        localStorage.setItem('qatra_user', JSON.stringify(authRes.user));
        token = authRes.access_token;
      }
    } catch (authErr) {
      console.warn('Emergency seeker session initialization failed:', authErr);
    }
  }

  return token;
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

    if (!patientName) {
      showToast('Please enter patient name.', 'warning');
      return;
    }
    if (!hospitalName) {
      showToast('Please enter hospital name.', 'warning');
      return;
    }

    submitBtn.disabled = true;
    const originalText = submitBtn.innerText;
    submitBtn.innerText = 'Analyzing Requisition Slip via OCR... ⏳';

    try {
      // Ensure session is active
      await ensureSeekerToken();

      let fileToUpload = selectedSlipFile;
      if (fileToUpload.size > 4.2 * 1024 * 1024) {
        // Attempt compression if still oversized
        fileToUpload = await compressImageIfNeeded(fileToUpload, 1200, 0.75);
      }

      if (fileToUpload.size > 4.2 * 1024 * 1024) {
        submitBtn.disabled = false;
        submitBtn.innerText = originalText;
        showToast('Uploaded document exceeds 4.2MB limit. Please attach a compressed file or photo.', 'warning');
        return;
      }

      const buildFormData = () => {
        const fd = new FormData();
        fd.append('file', fileToUpload);
        fd.append('patient_name', patientName);
        fd.append('hospital_name', hospitalName);
        fd.append('blood_group', bloodGroup);
        fd.append('component_type', componentType);
        fd.append('units_needed', unitsNeeded);
        fd.append('urgency', urgency);
        return fd;
      };

      let res;
      try {
        res = await apiUpload('/auth/hospital-slip/upload', buildFormData());
      } catch (uploadErr) {
        // On 401 unauthorized, refresh emergency token and retry once
        if (uploadErr.message && uploadErr.message.toLowerCase().includes('unauthorized')) {
          localStorage.removeItem('qatra_token');
          await ensureSeekerToken();
          res = await apiUpload('/auth/hospital-slip/upload', buildFormData());
        } else {
          throw uploadErr;
        }
      }

      const isAutoApproved = res.status === 'verified';
      if (res.request_id) {
        localStorage.setItem('last_request_id', res.request_id);
        // Cache details for instant display on status page
        localStorage.setItem(
          `request_${res.request_id}_details`,
          JSON.stringify({
            patient_name: patientName,
            hospital_name: hospitalName,
            blood_group: bloodGroup,
            urgency: urgency,
            units_needed: unitsNeeded,
            status: res.status,
          })
        );
      }

      if (isAutoApproved) {
        showToast('Hospital slip verified! Emergency broadcast active.', 'success');
        setTimeout(() => {
          window.location.href = `/seeker/map.html?request_id=${res.request_id}`;
        }, 1200);
      } else {
        showToast('Slip uploaded. Queued for 24/7 Desk Review (<3 mins).', 'info');
        setTimeout(() => {
          window.location.href = `/seeker/status.html?request_id=${res.request_id || ''}`;
        }, 1200);
      }
    } catch (err) {
      console.error('Hospital slip submission failed:', err);
      showToast(err.message || 'Failed to submit hospital slip. Please try again.', 'error');
      submitBtn.disabled = false;
      submitBtn.innerText = originalText;
    }
  });
}
