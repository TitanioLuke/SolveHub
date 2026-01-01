const overlay = document.getElementById('create-exercise-overlay');
const openBtn = document.getElementById('open-create-modal');
const closeBtn = document.getElementById('close-create-modal');
const cancelBtn = document.getElementById('cancel-create');
const form = document.getElementById('create-exercise-form');
const messageEl = document.getElementById('form-message');

// novos elementos
const subjectHiddenInput = document.getElementById('subject');
const subjectPills = document.querySelectorAll('.subject-pill');
const tagInput = document.getElementById('tagInput');
const tagsListEl = document.getElementById('tagsList');
let currentTags = [];

// ficheiros (para mais tarde ligar ao upload real)
const attachmentsInput = document.getElementById('attachments');
const uploadPreviewsEl = document.getElementById('uploadPreviews');
const uploadTriggerBtn = document.getElementById('uploadTrigger');
let currentFiles = [];

// -------- MODAL --------
function openModal() {
  form.reset();
  messageEl.textContent = '';
  messageEl.className = 'form-message';

  // reset pills
  subjectPills.forEach((pill, index) => {
    pill.classList.toggle('active', index === 0);
  });
  subjectHiddenInput.value = subjectPills[0].dataset.subject;

  // reset tags
  currentTags = [];
  renderTags();

  // reset ficheiros
  currentFiles = [];
  refreshFilesView();

  overlay.classList.remove('hidden');
}

function closeModal() {
  overlay.classList.add('hidden');
}

openBtn.addEventListener('click', openModal);
closeBtn.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);

overlay.addEventListener('click', (e) => {
  if (e.target === overlay) closeModal();
});

// -------- DISCIPLINA --------
subjectPills.forEach((pill) => {
  pill.addEventListener('click', () => {
    subjectPills.forEach((p) => p.classList.remove('active'));
    pill.classList.add('active');
    subjectHiddenInput.value = pill.dataset.subject;
  });
});

// -------- TAGS --------
function renderTags() {
  tagsListEl.innerHTML = '';
  currentTags.forEach((tag, index) => {
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.innerHTML = `${tag}<button type="button" data-index="${index}">&times;</button>`;
    tagsListEl.appendChild(chip);
  });
}

tagInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const value = tagInput.value.trim();
    if (value && !currentTags.includes(value)) {
      currentTags.push(value);
      renderTags();
    }
    tagInput.value = '';
  }
});

tagsListEl.addEventListener('click', (e) => {
  if (e.target.tagName === 'BUTTON') {
    const index = Number(e.target.dataset.index);
    currentTags.splice(index, 1);
    renderTags();
  }
});

// -------- SUBMIT: CRIAR EXERCÍCIO --------
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // FormData para ficheiros + campos
  const formData = new FormData();
  formData.append('title', form.title.value.trim());
  formData.append('subject', subjectHiddenInput.value);
  formData.append('description', form.description.value.trim());
  formData.append('tags', JSON.stringify(currentTags));

  // Adicionar ficheiros
  currentFiles.forEach(file => {
    formData.append('attachments', file);
  });

  messageEl.textContent = 'A criar exercício...';
  messageEl.className = 'form-message';

  try {
    const token = localStorage.getItem('token');

    const res = await fetch('http://localhost:5050/exercises', {
      method: 'POST',
      headers: {
        Authorization: token ? `Bearer ${token}` : ''
        // NÃO colocar Content-Type aqui - o browser define automaticamente
      },
      body: formData
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Erro ao criar exercício');
    }

    const created = await res.json();
    console.log('Exercício criado COM FOTOS:', created);

    messageEl.textContent = 'Exercício criado com sucesso!';
    messageEl.className = 'form-message success';

    setTimeout(() => {
      closeModal();
      if (typeof loadExercises === 'function') {
        loadExercises();
      }
    }, 1500);

  } catch (err) {
    console.error(err);
    messageEl.textContent = err.message;
    messageEl.className = 'form-message error';
  }
});

// -------- FICHEIROS (pré-visualização) --------
uploadTriggerBtn.addEventListener('click', () => {
  attachmentsInput.click();
});

function refreshFilesView() {
  uploadPreviewsEl.innerHTML = '';

  currentFiles.forEach((file, index) => {
    const preview = document.createElement('div');
    preview.className = 'preview-item';

    if (file.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      preview.appendChild(img);
    } else {
      preview.textContent = 'PDF';
    }

    const badge = document.createElement('span');
    badge.className = 'preview-badge';
    badge.textContent = file.type.startsWith('image/') ? 'IMG' : 'PDF';
    preview.appendChild(badge);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'preview-remove';
    removeBtn.textContent = '×';
    removeBtn.dataset.index = index;
    preview.appendChild(removeBtn);

    uploadPreviewsEl.appendChild(preview);
  });

  // manter o input sincronizado (para quando o upload real existir)
  const dataTransfer = new DataTransfer();
  currentFiles.forEach((file) => dataTransfer.items.add(file));
  attachmentsInput.files = dataTransfer.files;
}

attachmentsInput.addEventListener('change', () => {
  const files = Array.from(attachmentsInput.files);
  currentFiles = currentFiles.concat(files);
  refreshFilesView();
});

uploadPreviewsEl.addEventListener('click', (e) => {
  if (e.target.classList.contains('preview-remove')) {
    const index = Number(e.target.dataset.index);
    currentFiles.splice(index, 1);
    refreshFilesView();
  }
});