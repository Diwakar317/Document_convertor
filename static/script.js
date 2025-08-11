// --- DOM elements ---
const dragArea = document.getElementById('dragArea');
const imageInput = document.getElementById('imageInput');
const uploadBtn = document.getElementById('uploadBtn');
const previewList = document.getElementById('previewList');
const uploadContainer = document.getElementById('uploadContainer');
const mainPanels = document.getElementById('mainPanels');
const panelPreviewList = document.getElementById('panelPreviewList');
const marginType = document.getElementById('marginType');
const customMargin = document.getElementById('customMargin');
const addImageBtn = document.getElementById('addImageBtn');

// --- State: images array ---
let images = [];

// --- Upload button opens file dialog ---
uploadBtn.addEventListener('click', () => imageInput.click());
addImageBtn.addEventListener('click', () => imageInput.click());

// --- File input change: add images to preview ---
imageInput.addEventListener('change', (e) => {
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

// Drop images anywhere on the page to append to preview
document.addEventListener('drop', (e) => {
  e.preventDefault();
  document.body.classList.remove('dragover');
  dragArea.classList.remove('dragover');
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    addImagesToPreview(e.dataTransfer.files);
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

// --- Show/hide custom margin input ---
marginType.addEventListener('change', function() {
  customMargin.style.display = this.value === 'custom' ? 'inline-block' : 'none';
});

// --- Add images to preview (append, do not replace) ---
function addImagesToPreview(files) {
  let filesArr = Array.from(files);
  let loadedCount = 0;
  let newImages = [];
  filesArr.forEach((file, i) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = function(e) {
        newImages.push({ name: file.name, dataUrl: e.target.result });
        loadedCount++;
        if (loadedCount === filesArr.length) {
          images = images.concat(newImages);
          renderPanelPreview();
        }
      };
      reader.readAsDataURL(file);
    }
  });
}

// --- Initial file upload handler (also appends images) ---
function handleFiles(files) {
  addImagesToPreview(files);
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
  images.forEach((imgObj, idx) => {
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
        const moved = images.splice(draggedIdx, 1)[0];
        images.splice(idx, 0, moved);
        renderPanelPreview();
      }
    });
    item.addEventListener('drop', (e) => {
      e.stopPropagation();
    });

    // --- Image preview ---
    const img = document.createElement('img');
    img.src = imgObj.dataUrl;
    img.className = 'preview-img';

    // --- Delete button ---
    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.innerHTML = '&times;';
    delBtn.title = 'Delete';
    delBtn.onclick = () => {
      images.splice(idx, 1);
      renderPanelPreview();
      if (images.length === 0) {
        mainPanels.style.display = 'none';
        uploadContainer.style.display = 'block';
      }
    };

    // --- Image name at bottom ---
    const nameDiv = document.createElement('div');
    nameDiv.className = 'image-name';
    nameDiv.textContent = imgObj.name;

    item.appendChild(img);
    item.appendChild(delBtn);
    item.appendChild(nameDiv);
    panelPreviewList.appendChild(item);
  });
}

// --- Allow dropping images directly onto preview panel to append ---
panelPreviewList.addEventListener('dragover', (e) => {
  e.preventDefault();
});
panelPreviewList.addEventListener('drop', (e) => {
  e.preventDefault();
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    addImagesToPreview(e.dataTransfer.files);
  }
});

let isConverting = false;

document.getElementById('convertBtn').addEventListener('click', async () => {
  // Prevent double submit
  if (isConverting) return;

  // Check if images are present
  if (images.length === 0) {
    alert("Please add images first.");
    return;
  }

  isConverting = true;
  const convertBtn = document.getElementById('convertBtn');
  convertBtn.disabled = true;
  convertBtn.textContent = "Converting...";

  try {
    // Prepare form data with image files
    const formData = new FormData();
    images.forEach(imgObj => {
      // Convert base64 to Blob
      const [header, base64] = imgObj.dataUrl.split(',');
      const mime = header.match(/:(.*?);/)[1];
      const binary = atob(base64);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
      }
      const file = new File([array], imgObj.name, { type: mime });
      formData.append('images', file);
    });

    // Send images to backend for PDF conversion
    const response = await fetch('/convert-images', {
      method: 'POST',
      body: formData
    });

    // Handle response
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "converted.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } else {
      alert("PDF conversion failed.");
    }
  } finally {
    isConverting = false;
    convertBtn.disabled = false;
    convertBtn.textContent = "Convert to PDF";
  }
});