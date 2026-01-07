// ===============================
//  SUBJECTS UTILITIES
// ===============================

// Cache de subjects em memória
let cachedSubjects = null;
let subjectsLoading = false;
let subjectsLoadPromise = null;

// ===============================
//  FETCH SUBJECTS
// ===============================
async function fetchSubjects(forceRefresh = false, popularOnly = false) {
  // Se já está a carregar, retornar a promise existente
  if (subjectsLoading && subjectsLoadPromise) {
    return subjectsLoadPromise;
  }

  // Se já temos cache e não forçamos refresh, retornar cache (mas filtrar se popularOnly)
  if (cachedSubjects && !forceRefresh) {
    if (popularOnly) {
      return cachedSubjects.filter(s => s.isPopular === true);
    }
    return cachedSubjects;
  }

  // Criar nova promise de carregamento
  subjectsLoading = true;
  subjectsLoadPromise = (async () => {
    try {
      // Verificar se apiGet está disponível
      if (typeof apiGet !== 'function' && typeof window.apiGet !== 'function') {
        throw new Error('apiGet não está disponível. Certifica-te que api.js é carregado antes de subjects.js');
      }
      
      // Usar apiGet global ou local
      const apiGetFn = typeof apiGet === 'function' ? apiGet : window.apiGet;
      const url = popularOnly ? "/subjects?popular=true" : "/subjects";
      const subjects = await apiGetFn(url);
      cachedSubjects = subjects;
      return subjects;
    } catch (error) {
      console.error("Erro ao carregar disciplinas:", error);
      throw error;
    } finally {
      subjectsLoading = false;
      subjectsLoadPromise = null;
    }
  })();

  return subjectsLoadPromise;
}

// ===============================
//  RENDER SUBJECT OPTIONS
// ===============================
function renderSubjectOptions(container, subjects, selectedId = null, selectedName = null) {
  if (!container) return;

  // Limpar container
  container.innerHTML = "";

  if (!subjects || subjects.length === 0) {
    container.innerHTML = '<option value="">Nenhuma disciplina disponível</option>';
    return;
  }

  // Criar opções
  subjects.forEach(subject => {
    const option = document.createElement("option");
    option.value = subject._id || subject.id;
    option.textContent = subject.name;
    
    // Selecionar se for o selectedId ou selectedName
    if (selectedId && (subject._id === selectedId || subject.id === selectedId)) {
      option.selected = true;
    } else if (selectedName && subject.name === selectedName) {
      option.selected = true;
    }
    
    container.appendChild(option);
  });
}

// ===============================
//  RENDER SUBJECT PILLS
// ===============================
function renderSubjectPills(container, subjects, selectedId = null, selectedName = null, onSelect = null) {
  if (!container) return;

  // Limpar container
  container.innerHTML = "";

  if (!subjects || subjects.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted); font-size: 14px;">Nenhuma disciplina disponível</p>';
    return;
  }

  // Criar pills
  subjects.forEach((subject, index) => {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "subject-pill";
    pill.dataset.subjectId = subject._id || subject.id;
    pill.dataset.subject = subject.name;
    pill.textContent = subject.name;

    // Verificar se está selecionado
    const isSelected = (selectedId && (subject._id === selectedId || subject.id === selectedId)) ||
                      (selectedName && subject.name === selectedName) ||
                      (index === 0 && !selectedId && !selectedName);

    if (isSelected) {
      pill.classList.add("active");
    }

    // Event listener
    pill.addEventListener("click", () => {
      // Remover active de todos
      container.querySelectorAll(".subject-pill").forEach(p => p.classList.remove("active"));
      // Adicionar active ao clicado
      pill.classList.add("active");
      
      // Chamar callback se fornecido
      if (onSelect) {
        onSelect(subject._id || subject.id, subject.name);
      }
    });

    container.appendChild(pill);
  });
}

// ===============================
//  RENDER SUBJECT TAGS (Sidebar)
// ===============================
function renderSubjectTags(container, subjects, onSelect = null) {
  if (!container) return;

  // Limpar container
  container.innerHTML = "";

  if (!subjects || subjects.length === 0) {
    return;
  }

  // Criar tags para todas as disciplinas populares (sem limite)
  subjects.forEach(subject => {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.dataset.subjectId = subject._id || subject.id;
    tag.dataset.subject = subject.name;
    tag.style.cursor = "pointer"; // Adicionar cursor pointer
    tag.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
      </svg>
      ${escapeHtml(subject.name)}
    `;

    // Event listener - usar event delegation para funcionar mesmo ao clicar no SVG
    tag.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("Tag clicada no sidemenu:", subject.name, "onSelect:", typeof onSelect);
      if (onSelect && typeof onSelect === 'function') {
        onSelect(subject._id || subject.id, subject.name);
      } else {
        console.warn("onSelect callback não fornecido ou não é uma função");
      }
    });

    container.appendChild(tag);
  });
}

// ===============================
//  HELPER: ESCAPE HTML
// ===============================
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ===============================
//  CLEAR CACHE
// ===============================
function clearSubjectsCache() {
  cachedSubjects = null;
}

// Tornar funções globais
window.fetchSubjects = fetchSubjects;
window.renderSubjectOptions = renderSubjectOptions;
window.renderSubjectPills = renderSubjectPills;
window.renderSubjectTags = renderSubjectTags;
window.clearSubjectsCache = clearSubjectsCache;

