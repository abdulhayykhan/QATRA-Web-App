/**
 * QATRA — Emergency Hospital Slip Upload & Verification (Feature 2)
 * Connects file drop, OCR feedback, and request broadcast.
 */
import { apiUpload, showToast } from './api.js';

let selectedFile = null;

document.addEventListener('DOMContentLoaded', () => {
  setupFileUpload();
  setupBloodPills();
  setupFormSubmit();
});

function setupFileUpload() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('slip-file-input');
  const previewWrap = document.getElementById('file-preview-wrap');
  const previewImg = document.getElementById('file-preview-img');
  const fileName = document.getElementById('file-name');
  const fileSize = document.getElementById('file-size');
  const removeBtn = document.getElementById('remove-file-btn');
  const ocrBox = document.getElementById('ocr-status-box');

  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) {
      handleFile(fileInput.files[0]);
    }
  });

  removeBtn.addEventListener('click', () => {
    selectedFile = null;
    fileInput.value = '';
    previewWrap.style.display = 'none';
    dropZone.style.display = 'block';
    ocrBox.classList.remove('active');
  });

  function handleFile(file) {
    selectedFile = file;
    fileName.innerText = file.name;
    fileSize.innerText = `${(file.size / 1024).toFixed(1)} KB`;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImg.src = e.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      previewImg.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="%23C92A2A"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>';
    }

    dropZone.style.display = 'none';
    previewWrap.style.display = 'flex';

    // Simulate OCR preview feedback
    ocrBox.classList.add('active');
    document.getElementById('ocr-feedback-text').innerText = 'Slip ready for upload. Official stamp and MRN will be parsed on submission.';
  }
}

function setupBloodPills() {
  const pills = document.querySelectorAll('#blood-group-pills .blood-pill');
  const hiddenInput = document.getElementById('blood-group');

  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('selected'));
      pill.classList.add('selected');
      hiddenInput.value = pill.getAttribute('data-value');
    });
  });
}

function setupFormSubmit() {
  const form = document.getElementById('emergency-request-form');
  const submitBtn = document.getElementById('submit-request-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const patientName = document.getElementById('patient-name').value.trim();
    const hospitalName = document.getElementById('hospital-name').value.trim();
    const bloodGroup = document.getElementById('blood-group').value;
    const componentType = document.getElementById('component-type').value;
    const unitsNeeded = parseInt(document.getElementById('units-needed').value, 10);
    const urgency = document.getElementById('urgency-tier').value;

    if (!patientName || !hospitalName) {
      showToast('Please fill in patient name and hospital.', 'warning');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerText = 'Analyzing Slip & Broadcasting... ⏳';

    const formData = new FormData();
    if (selectedFile) {
      formData.append('file', selectedFile);
    }
    formData.append('patient_name', patientName);
    formData.append('hospital_name', hospitalName);
    formData.append('blood_group', bloodGroup);
    formData.append('component_type', componentType);
    formData.append('units_needed', unitsNeeded.toString());
    formData.append('urgency', urgency);

    try {
      const result = await apiUpload('/auth/hospital-slip/upload', formData);
      const isVerified = result.status === 'verified';

      if (isVerified) {
        showToast('Hospital slip verified! Broadcast alert dispatched to nearby donors.', 'success');
        setTimeout(() => {
          window.location.href = '/seeker/map.html';
        }, 1500);
      } else {
        showToast('Slip routed to Alkhidmat 24/7 Desk for rapid manual review.', 'info');
        setTimeout(() => {
          window.location.href = '/seeker/feed.html';
        }, 1500);
      }
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.innerText = 'Broadcast Emergency Request 🚨';
    }
  });
}
