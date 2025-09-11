// PDF Compression Tool JS
// Handles drag-and-drop, preview, and compression upload

// --- DOM elements ---
const dragArea = document.getElementById('dragArea');
const pdfInput = document.getElementById('pdfInput');
const uploadBtn = document.getElementById('uploadBtn');
const previewList = document.getElementById('previewList');
const uploadContainer = document.getElementById('uploadContainer');
const mainPanels = document.getElementById('mainPanels');
const panelPreviewList = document.getElementById('panelPreviewList');
const compressBtn = document.getElementById('compressBtn');
const compressionLevel = document.getElementById('compressionLevel');

let pdfFile = null;

uploadBtn.addEventListener('click', () => pdfInput.click());
pdfInput.addEventListener('change', (e) => {
  handlePDF(e.target.files[0]);
});

// Drag & drop events for the whole page
document.addEventListener('dragover', (e) => {
  e.preventDefault();
  document.body.classList.add('dragover');
  dragArea.classList.add('dragover');
});
document.addEventListener('dragleave', (e) => {
  document.body.classList.remove('dragover');
  dragArea.classList.remove('dragover');
});
document.addEventListener('drop', (e) => {
  e.preventDefault();
  document.body.classList.remove('dragover');
  dragArea.classList.remove('dragover');
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    handlePDF(e.dataTransfer.files[0]);
  }
});
dragArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  dragArea.classList.add('dragover');
});
dragArea.addEventListener('dragleave', (e) => {
  dragArea.classList.remove('dragover');
});
dragArea.addEventListener('drop', (e) => {
  e.preventDefault();
  dragArea.classList.remove('dragover');
  if (e.dataTransfer.files) {
    handlePDF(e.dataTransfer.files[0]);
  }
});

function handlePDF(file) {
  if (!file || file.type !== 'application/pdf') {
    alert('Please upload a valid PDF file.');
    return;
  }
  pdfFile = file;
  renderPanelPreview();
  // Show main panels if hidden
  if (mainPanels.style.display !== 'flex') {
    uploadContainer.style.display = 'none';
    mainPanels.style.display = 'flex';
  }
}

function renderPanelPreview() {
  panelPreviewList.innerHTML = '';
  if (pdfFile) {
    const item = document.createElement('div');
    item.className = 'preview-item';
    // PDF icon or filename
    const nameDiv = document.createElement('div');
    nameDiv.className = 'image-name';
    nameDiv.textContent = pdfFile.name;
    item.appendChild(nameDiv);
    // Delete button
    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.innerHTML = '&times;';
    delBtn.title = 'Delete';
    delBtn.onclick = () => {
      pdfFile = null;
      panelPreviewList.innerHTML = '';
      mainPanels.style.display = 'none';
      uploadContainer.style.display = 'block';
    };
    item.appendChild(delBtn);
    panelPreviewList.appendChild(item);
  }
}

compressBtn.addEventListener('click', async () => {
  if (!pdfFile) {
    alert('Please upload a PDF first.');
    return;
  }
  compressBtn.disabled = true;
  compressBtn.textContent = 'Compressing...';
  try {
    const formData = new FormData();
    formData.append('pdf_file', pdfFile);
    formData.append('compression_level', compressionLevel.value);
    const response = await fetch('/compress', {
      method: 'POST',
      body: formData
    });
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'compressed.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } else {
      alert('PDF compression failed.');
    }
  } finally {
    compressBtn.disabled = false;
    compressBtn.textContent = 'Compress PDF';
  }
});
