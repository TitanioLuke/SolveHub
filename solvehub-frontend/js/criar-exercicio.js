const overlay = document.getElementById('create-exercise-overlay');
const openBtn = document.getElementById('open-create-modal');
const closeBtn = document.getElementById('close-create-modal');
const cancelBtn = document.getElementById('cancel-create');
const form = document.getElementById('create-exercise-form');
const messageEl = document.getElementById('form-message');

// novos elementos
const subjectHiddenInput = document.getElementById('subject');
const subjectPillsContainer = document.getElementById('subjectPills');
const subjectIdHiddenInput = document.getElementById('subjectId') || (() => {
  // Criar input hidden para subjectId se não existir
  const input = document.createElement('input');
  input.type = 'hidden';
  input.id = 'subjectId';
  input.name = 'subjectId';
  const form = document.getElementById('create-exercise-form');
  if (form) {
    const subjectGroup = form.querySelector('.form-group');
    if (subjectGroup) {
      subjectGroup.appendChild(input);
    }
  }
  return input;
})();
const tagInput = document.getElementById('tagInput');
const tagsListEl = document.getElementById('tagsList');
let currentTags = [];
let allSubjects = [];

// ficheiros (para mais tarde ligar ao upload real)
const attachmentsInput = document.getElementById('attachments');
const uploadPreviewsEl = document.getElementById('uploadPreviews');
const uploadTriggerBtn = document.getElementById('uploadTrigger');
let currentFiles = [];

// -------- MODAL --------
async function openModal() {
  // Mostrar modal primeiro para não bloquear a UI
  overlay.classList.remove('hidden');
  
  form.reset();
  if (messageEl) {
    messageEl.textContent = '';
    messageEl.className = 'form-message';
  }

  // Carregar subjects
  try {
    // Usar window.fetchSubjects se disponível, senão usar fetchSubjects local
    const fetchFn = window.fetchSubjects || (typeof fetchSubjects === 'function' ? fetchSubjects : null);
    if (!fetchFn) {
      throw new Error('fetchSubjects não está disponível. Certifica-te que subjects.js é carregado antes.');
    }
    allSubjects = await fetchFn();
    
    if (subjectPillsContainer && window.renderSubjectPills) {
      const renderFn = window.renderSubjectPills;
      renderFn(subjectPillsContainer, allSubjects, null, null, (subjectId, subjectName) => {
        if (subjectIdHiddenInput) subjectIdHiddenInput.value = subjectId;
        if (subjectHiddenInput) subjectHiddenInput.value = subjectName; // Manter compatibilidade
      });
      
      // Selecionar primeiro por padrão
      if (allSubjects.length > 0) {
        const firstPill = subjectPillsContainer.querySelector('.subject-pill');
        if (firstPill) {
          if (subjectIdHiddenInput) subjectIdHiddenInput.value = firstPill.dataset.subjectId;
          if (subjectHiddenInput) subjectHiddenInput.value = firstPill.dataset.subject;
        }
      }
    } else {
      console.warn('renderSubjectPills não está disponível ou subjectPillsContainer não encontrado');
      if (subjectPillsContainer) {
        subjectPillsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 13px;">A carregar disciplinas...</p>';
      }
    }
  } catch (error) {
    console.error('Erro ao carregar disciplinas:', error);
    if (subjectPillsContainer) {
      subjectPillsContainer.innerHTML = '<p style="color: var(--text-error, #ef4444); font-size: 13px;">Erro ao carregar disciplinas. Recarrega a página.</p>';
    }
    if (messageEl) {
      messageEl.textContent = 'Erro ao carregar disciplinas. Tenta novamente.';
      messageEl.className = 'form-message error';
    }
  }

  // reset tags
  currentTags = [];
  renderTags();

  // reset ficheiros
  currentFiles = [];
  refreshFilesView();
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
// Event delegation para pills dinâmicas
if (subjectPillsContainer) {
  subjectPillsContainer.addEventListener('click', (e) => {
    const pill = e.target.closest('.subject-pill');
    if (pill) {
      subjectIdHiddenInput.value = pill.dataset.subjectId;
      subjectHiddenInput.value = pill.dataset.subject;
    }
  });
}

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
  
  // Enviar subjectId se disponível, senão subject (string) para compatibilidade
  if (subjectIdHiddenInput.value) {
    formData.append('subjectId', subjectIdHiddenInput.value);
  }
  if (subjectHiddenInput.value) {
    formData.append('subject', subjectHiddenInput.value);
  }
  
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