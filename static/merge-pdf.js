// --- DOM elements ---
const dragArea = document.getElementById('dragArea');
const pdfInput = document.getElementById('pdfInput');
const uploadBtn = document.getElementById('uploadBtn');
const previewList = document.getElementById('previewList');
const uploadContainer = document.getElementById('uploadContainer');
const mainPanels = document.getElementById('mainPanels');
const panelPreviewList = document.getElementById('panelPreviewList');
const addPdfBtn = document.getElementById('addPdfBtn');

// --- State: pdfs array ---
let pdfs = [];

// --- Upload button opens file dialog ---
uploadBtn.addEventListener('click', () => pdfInput.click());
addPdfBtn.addEventListener('click', () => pdfInput.click());

// --- File input change: add PDFs to preview ---
pdfInput.addEventListener('change', (e) => {
  handleFiles(e.target.files);
});

// --- Drag & drop events for the whole page ---
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
    addPdfsToPreview(e.dataTransfer.files);
    // Show main panels if hidden
    if (mainPanels.style.display !== 'flex') {
      uploadContainer.style.display = 'none';
      mainPanels.style.display = 'flex';
    }
  }
});

// --- Drag events for dragArea (visual feedback only) ---
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
    handleFiles(e.dataTransfer.files);
  }
});

// --- Add PDFs to preview (append, do not replace) ---
function addPdfsToPreview(files) {
  let filesArr = Array.from(files);
  let loadedCount = 0;
  let newPdfs = [];
  filesArr.forEach((file, i) => {
    if (file.type === 'application/pdf') {
      // For preview, just show the file name and maybe icon
      newPdfs.push({ name: file.name, file: file });
      loadedCount++;
      if (loadedCount === filesArr.length) {
        pdfs = pdfs.concat(newPdfs);
        renderPanelPreview();
      }
    }
  });
}

// --- Initial file upload handler (also appends PDFs) ---
function handleFiles(files) {
  addPdfsToPreview(files);
  // Show main panels if hidden
  if (mainPanels.style.display !== 'flex') {
    uploadContainer.style.display = 'none';
    mainPanels.style.display = 'flex';
  }
}

// --- Drag-and-drop reordering logic ---
let draggedIdx = null;

function renderPanelPreview() {
  panelPreviewList.innerHTML = '';
  pdfs.forEach((pdfObj, idx) => {
    const item = document.createElement('div');
    item.className = 'preview-item';
    item.draggable = true;
    item.dataset.idx = idx;

    // --- Drag events for reordering ---
    item.addEventListener('dragstart', (e) => {
      draggedIdx = idx;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = "move";
    });
    item.addEventListener('dragend', (e) => {
      item.classList.remove('dragging');
      Array.from(panelPreviewList.children).forEach(child => child.classList.remove('drag-over'));
      draggedIdx = null;
    });
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      item.classList.add('drag-over');
    });
    item.addEventListener('dragleave', (e) => {
      item.classList.remove('drag-over');
    });
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      if (draggedIdx !== null && draggedIdx !== idx) {
        const moved = pdfs.splice(draggedIdx, 1)[0];
        pdfs.splice(idx, 0, moved);
        renderPanelPreview();
      }
    });
    item.addEventListener('drop', (e) => {
      e.stopPropagation();
    });

    // --- PDF icon preview ---
    const icon = document.createElement('div');
    icon.className = 'pdf-icon';
    icon.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="#1976d2"><path d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.83A2 2 0 0 0 19.41 8L15 3.59A2 2 0 0 0 13.17 3H6zm7 1.5V9a1 1 0 0 0 1 1h4.5L13 3.5zM6 4h6v5a2 2 0 0 0 2 2h5v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4zm2 7v2h2v-2H8zm0 4v2h8v-2H8z"/></svg>';
    item.appendChild(icon);

    // --- PDF name at bottom ---
    const nameDiv = document.createElement('div');
    nameDiv.className = 'image-name';
    nameDiv.textContent = pdfObj.name;

    // --- Delete button ---
    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.innerHTML = '&times;';
    delBtn.title = 'Delete';
    delBtn.onclick = () => {
      pdfs.splice(idx, 1);
      renderPanelPreview();
      if (pdfs.length === 0) {
        mainPanels.style.display = 'none';
        uploadContainer.style.display = 'block';
      }
    };

    item.appendChild(delBtn);
    item.appendChild(nameDiv);
    panelPreviewList.appendChild(item);
  });
}

// --- Allow dropping PDFs directly onto preview panel to append ---
panelPreviewList.addEventListener('dragover', (e) => {
  e.preventDefault();
});
panelPreviewList.addEventListener('drop', (e) => {
  e.preventDefault();
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    addPdfsToPreview(e.dataTransfer.files);
  }
});

let isMerging = false;

document.getElementById('mergeBtn').addEventListener('click', async () => {
  // Prevent double submit
  if (isMerging) return;

  // Check if PDFs are present
  if (pdfs.length === 0) {
    alert("Please add PDF files first.");
    return;
  }

  isMerging = true;
  const mergeBtn = document.getElementById('mergeBtn');
  mergeBtn.disabled = true;
  mergeBtn.textContent = "Merging...";

  try {
    // Prepare form data with PDF files
    const formData = new FormData();
    pdfs.forEach(pdfObj => {
      formData.append('pdfs', pdfObj.file);
    });

    // Send PDFs to backend for merging
    const response = await fetch('/merge-pdfs', {
      method: 'POST',
      body: formData
    });

    // Handle response
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "merged.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } else {
      alert("PDF merge failed.");
    }
  } finally {
    isMerging = false;
    mergeBtn.disabled = false;
    mergeBtn.textContent = "Merge PDFs";
  }
});
