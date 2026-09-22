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
  setupHospitalDropdown();
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

      const hospitalLat = parseFloat(document.getElementById('hospital-lat')?.value || '24.8607');
      const hospitalLng = parseFloat(document.getElementById('hospital-lng')?.value || '67.0011');
      const hospitalAddress = document.getElementById('hospital-address')?.value || `${hospitalName}, Karachi`;

      const buildFormData = () => {
        const fd = new FormData();
        fd.append('file', fileToUpload);
        fd.append('patient_name', patientName);
        fd.append('hospital_name', hospitalName);
        fd.append('blood_group', bloodGroup);
        fd.append('component_type', componentType);
        fd.append('units_needed', unitsNeeded);
        fd.append('urgency', urgency);
        fd.append('hospital_latitude', hospitalLat);
        fd.append('hospital_longitude', hospitalLng);
        fd.append('hospital_address', hospitalAddress);
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
      } else {
        showToast('Slip uploaded. Queued for 24/7 Desk Review (<3 mins).', 'info');
      }
      setTimeout(() => {
        window.location.href = `/seeker/status.html?request_id=${res.request_id || ''}`;
      }, 1200);
    } catch (err) {
      console.error('Hospital slip submission failed:', err);
      showToast(err.message || 'Failed to submit hospital slip. Please try again.', 'error');
      submitBtn.disabled = false;
      submitBtn.innerText = originalText;
    }
  });
}

/**
 * Comprehensive directory of Karachi Hospitals in alphabetical order (A–Z) with verified coordinates
 */
const KARACHI_HOSPITALS = [
  { name: 'Abbasi Shaheed Hospital', area: 'Nazimabad', lat: 24.9220, lng: 67.0280 },
  { name: 'Adventist Hospital (7th Day)', area: 'Saddar', lat: 24.8620, lng: 67.0290 },
  { name: 'Aga Khan Hospital for Women (Garden)', area: 'Garden East', lat: 24.8780, lng: 67.0220 },
  { name: 'Aga Khan Hospital for Women (Karimabad)', area: 'Karimabad', lat: 24.9180, lng: 67.0580 },
  { name: 'Aga Khan Hospital for Women (Kharadar)', area: 'Kharadar', lat: 24.8540, lng: 66.9940 },
  { name: 'Aga Khan Maternal & Child Care Centre', area: 'Hyderabad Colony', lat: 24.8850, lng: 67.0510 },
  { name: 'Aga Khan University Hospital (AKUH)', area: 'Stadium Road', lat: 24.8922, lng: 67.0747 },
  { name: 'Al-Ain Institute of Eye Diseases', area: 'Gulshan-e-Iqbal', lat: 24.9200, lng: 67.0880 },
  { name: 'Al-Mustafa Medical Centre', area: 'Gulshan-e-Iqbal', lat: 24.9190, lng: 67.0910 },
  { name: 'Al-Tibri Medical College & Hospital', area: 'Malir', lat: 24.9030, lng: 67.2100 },
  { name: 'Al-Zehra Medical Complex', area: 'Gulshan-e-Iqbal', lat: 24.9220, lng: 67.0870 },
  { name: 'Alkhidmat Al-Huda Medical Centre', area: 'North Nazimabad', lat: 24.9310, lng: 67.0350 },
  { name: 'Alkhidmat Fareeda Yaqoob Hospital', area: 'Gulshan-e-Iqbal', lat: 24.9180, lng: 67.0850 },
  { name: 'Alkhidmat Hospital (Korangi)', area: 'Korangi', lat: 24.8310, lng: 67.1250 },
  { name: 'Alkhidmat Raazia Sultana Hospital', area: 'Surjani Town', lat: 24.9850, lng: 67.0520 },
  { name: 'Anklesaria Hospital', area: 'Garden Road, Saddar', lat: 24.8680, lng: 67.0220 },
  { name: 'AO Clinic & Orthopaedic Hospital', area: 'Nazimabad', lat: 24.9210, lng: 67.0310 },
  { name: 'Ashfaq Memorial Hospital', area: 'Gulshan-e-Iqbal', lat: 24.9210, lng: 67.0890 },
  { name: 'Atia General Hospital', area: 'Malir', lat: 24.9020, lng: 67.1880 },
  { name: 'Baqai Institute of Diabetology & Endocrinology (BIDE)', area: 'Nazimabad', lat: 24.9260, lng: 67.0320 },
  { name: 'Baqai University Hospital', area: 'Super Highway', lat: 25.0120, lng: 67.1420 },
  { name: 'Burhani Hospital', area: 'Old City, Saddar', lat: 24.8580, lng: 67.0090 },
  { name: 'Cantonment General Hospital', area: 'Malir Cantt', lat: 24.9010, lng: 67.1920 },
  { name: 'Chiniot General Hospital', area: 'Korangi', lat: 24.8320, lng: 67.1290 },
  { name: 'Combined Military Hospital (CMH)', area: 'Malir Cantt', lat: 24.9050, lng: 67.1950 },
  { name: 'Creek General Hospital (UMDC)', area: 'Korangi', lat: 24.8280, lng: 67.1120 },
  { name: 'Darul Sehat Hospital', area: 'Gulistan-e-Johar', lat: 24.9120, lng: 67.1220 },
  { name: 'Dow International Dental College Hospital', area: 'Gulshan-e-Iqbal', lat: 24.9390, lng: 67.1290 },
  { name: 'Dow University Hospital (Ojha Campus)', area: 'SUPARCO Road', lat: 24.9380, lng: 67.1280 },
  { name: 'Dr. Ruth K.M. Pfau Civil Hospital Karachi', area: 'Baba-e-Urdu Road', lat: 24.8569, lng: 67.0112 },
  { name: 'Dr. Ziauddin Hospital (Clifton)', area: 'Boat Basin, Clifton', lat: 24.8190, lng: 67.0320 },
  { name: 'Dr. Ziauddin Hospital (Kemari)', area: 'Kemari', lat: 24.8150, lng: 66.9850 },
  { name: 'Dr. Ziauddin Hospital (North Nazimabad)', area: 'North Nazimabad', lat: 24.9350, lng: 67.0380 },
  { name: 'Fatimiyah Hospital', area: 'Soldier Bazaar', lat: 24.8740, lng: 67.0270 },
  { name: 'Hashmanis Hospital (Clifton)', area: 'Clifton', lat: 24.8260, lng: 67.0350 },
  { name: 'Hashmanis Hospital (Ranchoor Line)', area: 'Ranchoor Line', lat: 24.8610, lng: 67.0110 },
  { name: 'Hashmanis Hospital (Saddar)', area: 'MA Jinnah Road', lat: 24.8660, lng: 67.0220 },
  { name: 'Holy Family Hospital', area: 'Soldier Bazaar', lat: 24.8720, lng: 67.0250 },
  { name: 'Imam Clinic', area: 'North Nazimabad', lat: 24.9320, lng: 67.0340 },
  { name: 'Indus Hospital & Health Network', area: 'Korangi Creek', lat: 24.8394, lng: 67.1147 },
  { name: 'Institute of Orthopaedics & Surgery (IOS)', area: 'PECHS', lat: 24.8680, lng: 67.0610 },
  { name: 'Jinnah Postgraduate Medical Centre (JPMC)', area: 'Rafiqui Shaheed Rd', lat: 24.8525, lng: 67.0514 },
  { name: 'Kharadar General Hospital', area: 'Kharadar', lat: 24.8540, lng: 66.9960 },
  { name: 'Kidney Centre Postgraduate Institute', area: 'PECHS', lat: 24.8620, lng: 67.0650 },
  { name: 'Kulsumbai Valika Social Security Hospital', area: 'SITE', lat: 24.8980, lng: 67.0120 },
  { name: 'Lady Dufferin Hospital', area: 'Chand Bibi Road, Saddar', lat: 24.8600, lng: 67.0150 },
  { name: 'Liaquat National Hospital (LNH)', area: 'Stadium Road', lat: 24.8940, lng: 67.0700 },
  { name: 'Lifeline Hospital', area: 'North Nazimabad', lat: 24.9340, lng: 67.0360 },
  { name: 'LRBT Free Eye Hospital', area: 'Korangi', lat: 24.8300, lng: 67.1280 },
  { name: 'Mamji Hospital', area: 'Federal B Area', lat: 24.9410, lng: 67.0680 },
  { name: 'Medicare Cardiac & General Hospital', area: 'Shaheed-e-Millat', lat: 24.8750, lng: 67.0620 },
  { name: 'Medwin Hospital', area: 'Gulshan-e-Iqbal', lat: 24.9230, lng: 67.0880 },
  { name: 'Memon Medical Institute Hospital (MMIH)', area: 'Safoora Goth', lat: 24.9450, lng: 67.1420 },
  { name: 'Midciti Hospital', area: 'North Nazimabad', lat: 24.9310, lng: 67.0380 },
  { name: 'Murshid Hospital & Health Care Centre', area: 'Baldia Town', lat: 24.9150, lng: 66.9250 },
  { name: 'National Institute of Cardiovascular Diseases (NICVD)', area: 'Rafiqui Shaheed Rd', lat: 24.8510, lng: 67.0505 },
  { name: 'National Institute of Child Health (NICH)', area: 'Rafiqui Shaheed Rd', lat: 24.8530, lng: 67.0520 },
  { name: 'National Medical Centre (NMC)', area: 'DHA Phase 1', lat: 24.8450, lng: 67.0680 },
  { name: 'OMI Hospital', area: 'Depot Lines, Saddar', lat: 24.8630, lng: 67.0280 },
  { name: 'PAF Hospital (Faisal Base)', area: 'Shahrah-e-Faisal', lat: 24.8790, lng: 67.1080 },
  { name: 'PAF Hospital (Masroor Base)', area: 'Mauripur', lat: 24.8850, lng: 66.9380 },
  { name: 'Park Lane Hospital', area: 'Clifton', lat: 24.8220, lng: 67.0290 },
  { name: 'Patel Hospital', area: 'Gulshan-e-Iqbal', lat: 24.9250, lng: 67.0980 },
  { name: 'PNS Shifa Naval Hospital', area: 'DHA Phase 2', lat: 24.8320, lng: 67.0580 },
  { name: 'Saifee Hospital', area: 'North Nazimabad', lat: 24.9280, lng: 67.0320 },
  { name: 'Sambros Hospital', area: 'Federal B Area', lat: 24.9390, lng: 67.0670 },
  { name: 'Services Hospital', area: 'MA Jinnah Road', lat: 24.8640, lng: 67.0190 },
  { name: 'Shaukat Omar Memorial (SOM) Fauji Foundation Hospital', area: 'Shah Faisal Colony', lat: 24.8841, lng: 67.1514, address: 'Shah Faisal Colony No. 2, Near Drigh Road, Karachi' },
  { name: 'Sindh Government Children Hospital', area: 'North Nazimabad', lat: 24.9380, lng: 67.0390 },
  { name: 'Sindh Government Hospital (Korangi)', area: 'Korangi #5', lat: 24.8250, lng: 67.1350 },
  { name: 'Sindh Government Hospital (Liaquatabad)', area: 'Liaquatabad', lat: 24.9020, lng: 67.0380 },
  { name: 'Sindh Government Hospital (New Karachi)', area: 'New Karachi', lat: 24.9850, lng: 67.0620 },
  { name: 'Sindh Government Hospital (Qatar)', area: 'Orangi Town', lat: 24.9520, lng: 66.9850 },
  { name: 'Sindh Government Hospital (Saudabad)', area: 'Malir', lat: 24.9080, lng: 67.1850 },
  { name: 'Sindh Institute of Urology & Transplantation (SIUT)', area: 'Civil Hospital Rd', lat: 24.8575, lng: 67.0105 },
  { name: 'SMBB Trauma Centre (Civil Hospital)', area: 'Baba-e-Urdu Road', lat: 24.8571, lng: 67.0115 },
  { name: 'South City Hospital', area: 'Clifton Block 3', lat: 24.8210, lng: 67.0270 },
  { name: 'Spencer Eye Hospital', area: 'Lea Market, Lyari', lat: 24.8630, lng: 66.9980 },
  { name: 'Tabba Heart Institute', area: 'Federal B Area', lat: 24.9360, lng: 67.0650 },
  { name: 'Taj Medical Complex', area: 'MA Jinnah Road', lat: 24.8650, lng: 67.0180 },
  { name: 'Usman Memorial Hospital', area: 'Federal B Area', lat: 24.9370, lng: 67.0660 },
  { name: 'Zubaida Medical Centre', area: 'Dhoraji Colony', lat: 24.8810, lng: 67.0720 },
];

/**
 * Setup interactive Apple HIG themed dropdown for Karachi Hospitals
 */
function setupHospitalDropdown() {
  const wrap = document.getElementById('hospital-dropdown-wrap');
  const input = document.getElementById('hospital-name');
  const menu = document.getElementById('hospital-dropdown-menu');
  const itemsList = document.getElementById('hospital-items-list');
  const toggleBtn = document.getElementById('hospital-dropdown-toggle');
  const countLabel = document.getElementById('hospital-count-label');

  if (!wrap || !input || !menu || !itemsList) return;

  let focusedIndex = -1;

  function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function highlightMatch(text, query) {
    if (!query) return text;
    const escaped = escapeRegex(query);
    const regex = new RegExp(`(${escaped})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  function updateFocus(items) {
    items.forEach((item, idx) => {
      if (idx === focusedIndex) {
        item.classList.add('focused');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('focused');
      }
    });
  }

  function selectHospital(hospitalObjOrName) {
    let name = typeof hospitalObjOrName === 'string' ? hospitalObjOrName : hospitalObjOrName.name;
    let found = typeof hospitalObjOrName === 'object' && hospitalObjOrName.lat
      ? hospitalObjOrName
      : KARACHI_HOSPITALS.find(h => `${h.name} (${h.area})` === name || h.name === name || name.toLowerCase().includes(h.name.toLowerCase()));

    input.value = found ? `${found.name} (${found.area})` : name;

    const latInput = document.getElementById('hospital-lat');
    const lngInput = document.getElementById('hospital-lng');
    const addrInput = document.getElementById('hospital-address');
    const locPreviewText = document.getElementById('loc-preview-text');
    const locPreviewIcon = document.getElementById('loc-preview-icon');

    const gmapVerifyBtn = document.getElementById('btn-view-on-google-maps');

    if (found && found.lat && found.lng) {
      if (latInput) latInput.value = found.lat;
      if (lngInput) lngInput.value = found.lng;
      if (addrInput) addrInput.value = found.address || `${found.name}, ${found.area}, Karachi`;
      if (locPreviewText) {
        locPreviewText.innerHTML = `Pinned: <strong>${found.name}</strong> (${found.area}) <span style="color:#2b8a3e; font-weight:600;">✓ Verified (${found.lat.toFixed(4)}, ${found.lng.toFixed(4)})</span>`;
      }
      if (locPreviewIcon) locPreviewIcon.innerText = '📍';
      if (gmapVerifyBtn) {
        const placeSearch = (found.name.includes('SOM') || found.name.includes('Fauji'))
          ? 'Fauji Foundation Hospital (SOMH) Karachi'
          : `${found.name}, Karachi`;
        gmapVerifyBtn.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeSearch)}`;
        gmapVerifyBtn.style.display = 'inline-flex';
      }
    } else {
      if (addrInput) addrInput.value = `${name}, Karachi`;
      if (locPreviewText) {
        locPreviewText.innerHTML = `Location: <strong>${name}</strong> <span style="color:#e67700;">(Tap "Use My Current GPS" if at the hospital)</span>`;
      }
      if (gmapVerifyBtn) {
        gmapVerifyBtn.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' Hospital Karachi')}`;
        gmapVerifyBtn.style.display = 'inline-flex';
      }
    }

    closeDropdown();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function renderHospitals(filterText = '') {
    const query = filterText.trim().toLowerCase();
    const matches = query
      ? KARACHI_HOSPITALS.filter(
          h => h.name.toLowerCase().includes(query) || h.area.toLowerCase().includes(query)
        )
      : KARACHI_HOSPITALS;

    focusedIndex = -1;

    if (matches.length === 0) {
      if (countLabel) countLabel.textContent = 'No matching hospitals';
      const safeQuery = escapeHtml(filterText.trim());
      itemsList.innerHTML = `
        <div class="dropdown-empty">
          <div>No hospitals found matching "<strong>${safeQuery}</strong>"</div>
          <div class="dropdown-custom-option" id="btn-use-custom-hospital" role="button" tabindex="0">
            ➕ Use "${safeQuery}" as Hospital Name
          </div>
        </div>
      `;
      const customBtn = document.getElementById('btn-use-custom-hospital');
      if (customBtn) {
        customBtn.addEventListener('click', () => {
          selectHospital(filterText.trim());
        });
      }
      return;
    }

    if (countLabel) {
      countLabel.textContent = query
        ? `${matches.length} matching hospital${matches.length > 1 ? 's' : ''}`
        : `Karachi Hospitals (${matches.length} A–Z)`;
    }

    itemsList.innerHTML = matches
      .map((h, idx) => {
        const fullDisplay = `${h.name} (${h.area})`;
        const isSelected = input.value === fullDisplay || input.value === h.name;
        const highlightedName = query ? highlightMatch(escapeHtml(h.name), query) : escapeHtml(h.name);
        const highlightedArea = query ? highlightMatch(escapeHtml(h.area), query) : escapeHtml(h.area);
        return `
          <div class="dropdown-item ${isSelected ? 'selected' : ''}" data-index="${idx}" data-hospital="${escapeHtml(fullDisplay)}" role="option">
            <div class="dropdown-item-left">
              <span class="dropdown-item-icon">🏥</span>
              <span class="dropdown-item-name">${highlightedName}</span>
            </div>
            <span class="dropdown-item-area">${highlightedArea}</span>
          </div>
        `;
      })
      .join('');

    itemsList.querySelectorAll('.dropdown-item').forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.getAttribute('data-index'), 10);
        const hospitalObj = matches[idx];
        selectHospital(hospitalObj || item.getAttribute('data-hospital'));
      });
    });
  }

  function openDropdown() {
    menu.style.display = 'block';
    wrap.classList.add('open');
    renderHospitals(input.value);
    const selectedItem = itemsList.querySelector('.dropdown-item.selected');
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'nearest' });
    }
  }

  function closeDropdown() {
    menu.style.display = 'none';
    wrap.classList.remove('open');
    focusedIndex = -1;
  }

  function isOpen() {
    return wrap.classList.contains('open');
  }

  input.addEventListener('focus', () => {
    openDropdown();
  });

  input.addEventListener('click', () => {
    if (!isOpen()) {
      openDropdown();
    }
  });

  input.addEventListener('input', () => {
    if (!isOpen()) {
      menu.style.display = 'block';
      wrap.classList.add('open');
    }
    renderHospitals(input.value);
  });

  input.addEventListener('keydown', (e) => {
    if (!isOpen() && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      openDropdown();
      return;
    }

    if (!isOpen()) return;

    const items = itemsList.querySelectorAll('.dropdown-item');
    if (items.length === 0) {
      if (e.key === 'Enter') {
        const customBtn = document.getElementById('btn-use-custom-hospital');
        if (customBtn) {
          e.preventDefault();
          customBtn.click();
        }
      } else if (e.key === 'Escape') {
        closeDropdown();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusedIndex = (focusedIndex + 1) % items.length;
      updateFocus(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusedIndex = (focusedIndex - 1 + items.length) % items.length;
      updateFocus(items);
    } else if (e.key === 'Enter') {
      if (focusedIndex >= 0 && focusedIndex < items.length) {
        e.preventDefault();
        items[focusedIndex].click();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeDropdown();
    }
  });

  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isOpen()) {
        closeDropdown();
      } else {
        input.focus();
        openDropdown();
      }
    });
  }

  // Setup GPS Button Listener
  const gpsBtn = document.getElementById('btn-use-gps-location');
  if (gpsBtn) {
    gpsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!navigator.geolocation) {
        showToast('Geolocation is not supported by your device', 'warning');
        return;
      }
      gpsBtn.disabled = true;
      const origText = gpsBtn.innerHTML;
      gpsBtn.innerHTML = '⏳ <span>Acquiring GPS...</span>';
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const latInput = document.getElementById('hospital-lat');
          const lngInput = document.getElementById('hospital-lng');
          const addrInput = document.getElementById('hospital-address');
          const locPreviewText = document.getElementById('loc-preview-text');
          const locPreviewIcon = document.getElementById('loc-preview-icon');

          if (latInput) latInput.value = lat;
          if (lngInput) lngInput.value = lng;
          if (addrInput) addrInput.value = `Current Device Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
          if (locPreviewText) {
            locPreviewText.innerHTML = `Pinned: <strong>Current Device GPS</strong> <span style="color:#1864ab; font-weight:600;">(${lat.toFixed(4)}, ${lng.toFixed(4)})</span>`;
          }
          if (locPreviewIcon) locPreviewIcon.innerText = '🎯';
          const gmapVerifyBtn = document.getElementById('btn-view-on-google-maps');
          if (gmapVerifyBtn) {
            gmapVerifyBtn.href = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
            gmapVerifyBtn.style.display = 'inline-flex';
          }
          showToast('Hospital location pinned to your current GPS position!', 'success');
          gpsBtn.disabled = false;
          gpsBtn.innerHTML = origText;
        },
        (err) => {
          showToast('Could not acquire GPS fix: ' + err.message, 'warning');
          gpsBtn.disabled = false;
          gpsBtn.innerHTML = origText;
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  }

  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) {
      closeDropdown();
    }
  });
}

