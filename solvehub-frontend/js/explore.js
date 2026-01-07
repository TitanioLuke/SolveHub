// ===============================
//  LOAD LOGGED USER (TOPBAR)
// ===============================
async function loadLoggedUser() {
  const token = localStorage.getItem("token");
  if (!token) {
    // Não redirecionar, apenas não mostrar perfil
    return;
  }

  try {
    // Verificar se apiGet está disponível
    if (typeof apiGet !== 'function') {
      console.warn('apiGet não está disponível em explore.js');
      return;
    }
    
    const user = await apiGet("/auth/me");
    localStorage.setItem("user", JSON.stringify(user));

    const profileName = document.querySelector(".profile-name");
    if (profileName) {
      profileName.textContent = user.username;
    }

    // Avatar
    const avatar = document.querySelector(".avatar");
    if (avatar) {
      if (user.avatar && user.avatar.trim() !== "") {
        avatar.textContent = "";
        const img = document.createElement("img");
        img.src = typeof resolveUrl !== 'undefined' ? resolveUrl(user.avatar) : `${typeof API_URL !== 'undefined' ? API_URL : 'http://localhost:5050'}${user.avatar}`;
        img.alt = user.username || 'Avatar';
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";
        img.style.display = "block";
        img.style.borderRadius = "999px";
        avatar.appendChild(img);
      } else {
        if (user.username) {
          const initials = user.username
            .trim()
            .split(" ")
            .map((word) => word[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();
          avatar.textContent = initials;
        } else {
          avatar.textContent = "A";
        }
      }
    }

    // Mostrar link Admin se autorizado
    if (window.showAdminLinkIfAuthorized) {
      window.showAdminLinkIfAuthorized();
    }
  } catch (err) {
    console.error("Erro ao carregar utilizador:", err);
  }
}

// ===============================
//  GLOBAL STATE
// ===============================
let allExercises = [];
let subjectsData = [];
let currentSubject = null;

// Imagens/Ícones SVG para cada disciplina (clean e minimalistas)
const subjectIcons = {
  "Cálculo": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
    <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
  </svg>`,
  "Base de Dados": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
  </svg>`,
  "Redes": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
    <path d="M2 12a10 10 0 0110-10 10 10 0 0110 10"/>
  </svg>`,
  "Sistemas": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <path d="M8 21h8M12 17v4"/>
  </svg>`,
  "Programação": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="16 18 22 12 16 6"/>
    <polyline points="8 6 2 12 8 18"/>
  </svg>`,
  "default": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
    <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
  </svg>`
};

// Cores de gradiente para cada disciplina
const subjectColors = {
  "Cálculo": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "Base de Dados": "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "Redes": "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "Sistemas": "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "Programação": "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "default": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
};

// ===============================
//  LOAD EXERCISES
// ===============================
async function loadExercises() {
  const grid = document.getElementById("subjectsGrid");
  
  grid.innerHTML = `
    <div class="loading-state" style="grid-column: 1 / -1;">
      <div class="loading-spinner"></div>
      <p>A carregar disciplinas...</p>
    </div>
  `;

  try {
    // Carregar subjects e exercises em paralelo
    const [exercises, subjects] = await Promise.all([
      apiGet("/exercises"),
      fetchSubjects()
    ]);
    
    allExercises = Array.isArray(exercises) ? exercises : [];
    
    // Agrupar por disciplina usando subjects da API
    subjectsData = groupExercisesBySubject(allExercises, subjects);
    
    // Verificar se há parâmetro de disciplina na URL
    const params = new URLSearchParams(window.location.search);
    const subjectParam = params.get("subject");
    
    if (subjectParam) {
      showExercisesForSubject(subjectParam);
    } else {
      renderSubjectsGrid();
    }
  } catch (error) {
    console.error("Erro ao carregar exercícios:", error);
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <h3>Erro ao carregar disciplinas</h3>
        <p>Não foi possível carregar os exercícios. Tenta novamente mais tarde.</p>
      </div>
    `;
  }
}

// ===============================
//  GROUP EXERCISES BY SUBJECT
// ===============================
function groupExercisesBySubject(exercises, subjectsFromAPI = []) {
  const grouped = {};
  
  // Criar mapa de subjectId para subject name
  const subjectMap = new Map();
  subjectsFromAPI.forEach(subject => {
    subjectMap.set(subject._id?.toString() || subject.id?.toString(), subject);
  });
  
  exercises.forEach(exercise => {
    // Tentar obter subject do subjectId populado ou do subject string
    let subjectName = "Outros";
    let subjectId = null;
    
    if (exercise.subjectId) {
      const id = exercise.subjectId._id?.toString() || exercise.subjectId.toString();
      const subjectDoc = subjectMap.get(id);
      if (subjectDoc) {
        subjectName = subjectDoc.name;
        subjectId = id;
      } else {
        subjectName = exercise.subject?.name || exercise.subject || "Outros";
      }
    } else if (exercise.subject) {
      subjectName = exercise.subject.name || exercise.subject;
    }
    
    if (!grouped[subjectName]) {
      grouped[subjectName] = {
        name: subjectName,
        id: subjectId,
        exercises: [],
        totalExercises: 0,
        totalLikes: 0,
        lastUpdated: null
      };
    }
    
    grouped[subjectName].exercises.push(exercise);
    grouped[subjectName].totalExercises++;
    
    // Calcular total de likes
    const likesCount = exercise.likes?.length || 0;
    grouped[subjectName].totalLikes += likesCount;
    
    // Calcular última atualização
    const updatedAt = exercise.updatedAt || exercise.createdAt;
    if (updatedAt) {
      const date = new Date(updatedAt);
      if (!grouped[subjectName].lastUpdated || date > new Date(grouped[subjectName].lastUpdated)) {
        grouped[subjectName].lastUpdated = updatedAt;
      }
    }
  });
  
  // Converter para array e ordenar por número de exercícios
  return Object.values(grouped).sort((a, b) => b.totalExercises - a.totalExercises);
}

// ===============================
//  RENDER SUBJECTS GRID
// ===============================
function renderSubjectsGrid(subjects = subjectsData) {
  const grid = document.getElementById("subjectsGrid");
  
  if (subjects.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <h3>Nenhuma disciplina encontrada</h3>
        <p>Não há exercícios disponíveis no momento.</p>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = subjects.map(subject => {
    const icon = subjectIcons[subject.name] || subjectIcons.default;
    const gradient = subjectColors[subject.name] || subjectColors.default;
    const lastUpdatedText = subject.lastUpdated 
      ? formatDate(subject.lastUpdated)
      : "Nunca";
    
    return `
      <div class="subject-card" data-subject="${escapeHtml(subject.name)}">
        <div class="subject-card-image" style="background: ${gradient};">
          ${icon}
        </div>
        <div class="subject-card-content">
          <h3 class="subject-card-title">${escapeHtml(subject.name)}</h3>
          <div class="subject-card-stats">
            <div class="subject-card-stat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <span class="subject-card-stat-value">${subject.totalExercises}</span>
              <span>exercícios</span>
            </div>
            <div class="subject-card-stat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
              <span class="subject-card-stat-value">${subject.totalLikes}</span>
              <span>likes</span>
            </div>
            <div class="subject-card-stat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>Atualizado ${lastUpdatedText}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");
  
  // Adicionar event listeners aos cards
  grid.querySelectorAll(".subject-card").forEach(card => {
    card.addEventListener("click", () => {
      const subject = card.dataset.subject;
      showExercisesForSubject(subject);
    });
  });
}

// ===============================
//  SHOW EXERCISES FOR SUBJECT
// ===============================
function showExercisesForSubject(subjectName) {
  currentSubject = subjectName;
  
  // Atualizar URL sem recarregar
  const url = new URL(window.location);
  url.searchParams.set("subject", subjectName);
  window.history.pushState({ subject: subjectName }, "", url);
  
  // Esconder grid e mostrar lista
  document.getElementById("subjectsGrid").style.display = "none";
  const container = document.getElementById("exercisesListContainer");
  container.classList.remove("hidden");
  
  // Atualizar título
  document.getElementById("selectedSubjectTitle").textContent = subjectName;
  
  // Verificar se há pesquisa ativa e aplicar filtro
  const searchInput = document.getElementById("exploreSearchInput");
  const query = searchInput ? searchInput.value : "";
  
  // Filtrar exercícios
  let exercises = allExercises.filter(ex => ex.subject === subjectName);
  
  // Se há pesquisa, aplicar filtro nos exercícios
  if (query.trim()) {
    filterExercisesInSubject(query);
  } else {
    renderExercisesList(exercises);
  }
}

// ===============================
//  RENDER EXERCISES LIST (igual à página principal)
// ===============================
function renderExercisesList(exercises) {
  const list = document.getElementById("exercisesList");
  
  if (exercises.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <h3>Nenhum exercício encontrado</h3>
        <p>Não há exercícios disponíveis nesta disciplina.</p>
      </div>
    `;
    return;
  }
  
  list.innerHTML = "";
  
  // Obter ID do usuário atual
  let currentUserId = null;
  try {
    const cachedUser = localStorage.getItem("user");
    if (cachedUser) {
      const user = JSON.parse(cachedUser);
      currentUserId = user._id || user.id;
    }
  } catch (e) {
    console.error("Erro ao obter usuário:", e);
  }
  
  exercises.forEach((ex) => {
    const preview =
      ex.description && ex.description.length > 150
        ? ex.description.substring(0, 150) + "..."
        : ex.description || "Sem descrição disponível.";
    
    const answersCount = ex.answersCount || 0;
    const votes = ex.votes || 0;
    
    // Verificar se o usuário deu like ou dislike
    const hasLiked = currentUserId && ex.likes && ex.likes.length > 0 && ex.likes.some(like => {
      const likeId = typeof like === 'object' ? (like._id || like.id) : like;
      return likeId && likeId.toString() === currentUserId.toString();
    });
    
    const hasDisliked = currentUserId && ex.dislikes && ex.dislikes.length > 0 && ex.dislikes.some(dislike => {
      const dislikeId = typeof dislike === 'object' ? (dislike._id || dislike.id) : dislike;
      return dislikeId && dislikeId.toString() === currentUserId.toString();
    });
    
    // Renderizar tags
    const tagsHtml = ex.tags && ex.tags.length > 0
      ? `<div class="exercise-tags">
          ${ex.tags.map(tag => `<span class="exercise-tag">${escapeHtml(tag)}</span>`).join("")}
         </div>`
      : "";
    
    // Verificar se é novo (3 dias)
    const isNew = isNewExercise(ex.createdAt);
    
    list.innerHTML += `
      <article class="exercise-card" onclick="openExercise('${ex._id}')">
        <div class="exercise-info">
          <div class="exercise-header">
            <h3>${escapeHtml(ex.title || "Sem título")}</h3>
          </div>
          
          ${isNew ? '<div class="badge-new-wrapper"><span class="badge-new"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>Novo</span></div>' : ""}
          
          <p class="subtitle">
            <span class="author">${escapeHtml(ex.author?.username || "Anónimo")}</span>
            <span class="separator">•</span>
            <span class="subject">${escapeHtml(ex.subject || "Geral")}</span>
            <span class="separator">•</span>
            <span class="time">${timeAgo(ex.createdAt)}</span>
          </p>
          
          ${tagsHtml}
          
          ${
            ex.attachments && ex.attachments.length > 0
              ? `
                <div class="exercise-attachments">
                  ${ex.attachments
                    .slice(0, 1)
                    .map(
                      (att) => {
                        if (att.type === 'image') {
                          // Usar resolveUrl para URLs do Cloudinary ou anexos locais
                          const imageUrl = typeof resolveUrl !== 'undefined' ? resolveUrl(att.url) : (att.url && (att.url.startsWith('http://') || att.url.startsWith('https://')) ? att.url : `${typeof API_URL !== 'undefined' ? API_URL : 'http://localhost:5050'}${att.url}`);
                          return `
                            <img
                              src="${imageUrl}"
                              alt="${escapeHtml(att.filename)}"
                              class="attachment-thumb"
                              loading="lazy"
                            >
                          `;
                        } else {
                          return `
                            <div class="attachment-thumb-file">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
                              </svg>
                            </div>
                          `;
                        }
                      }
                    )
                    .join("")}
                  ${
                    ex.attachments.length > 1
                      ? `<span class="attachments-count">+${
                          ex.attachments.length - 1
                        }</span>`
                      : ""
                  }
                </div>
              `
              : ""
          }
          
          <p class="preview">${escapeHtml(preview)}</p>
        </div>
        
        <div class="exercise-meta">
          <span class="badge-subject">${escapeHtml(ex.subject || "Geral")}</span>
          <div class="meta-stats">
            <span class="meta-stat ${answersCount > 0 ? "has-answers" : ""}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              ${answersCount}
            </span>
            <span class="meta-stat ${hasLiked ? 'has-liked' : ''} ${hasDisliked ? 'has-disliked' : ''}">
              <svg viewBox="0 0 24 24" fill="currentColor" style="pointer-events: none;">
                <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
              </svg>
              ${votes}
            </span>
          </div>
        </div>
      </article>
    `;
  });
}

// ===============================
//  BACK TO SUBJECTS
// ===============================
function backToSubjects() {
  currentSubject = null;
  
  // Limpar URL
  const url = new URL(window.location);
  url.searchParams.delete("subject");
  window.history.pushState({}, "", url);
  
  // Esconder lista e mostrar grid
  document.getElementById("exercisesListContainer").classList.add("hidden");
  document.getElementById("subjectsGrid").style.display = "grid";
  
  // Limpar pesquisa
  const searchInput = document.getElementById("exploreSearchInput");
  if (searchInput) {
    searchInput.value = "";
    const clearSearch = document.getElementById("clearExploreSearch");
    if (clearSearch) {
      clearSearch.classList.add("hidden");
    }
    filterSubjects("");
  }
}

// ===============================
//  FILTER SUBJECTS
// ===============================
function filterSubjects(query) {
  if (!query.trim()) {
    renderSubjectsGrid(subjectsData);
    return;
  }
  
  const lowerQuery = query.toLowerCase();
  
  const filtered = subjectsData.filter(subject => {
    // Filtrar apenas por nome de disciplina quando nenhuma disciplina está aberta
    return subject.name.toLowerCase().includes(lowerQuery);
  });
  
  renderSubjectsGrid(filtered);
}

// ===============================
//  FILTER EXERCISES IN SUBJECT
// ===============================
function filterExercisesInSubject(query) {
  if (!currentSubject) return;
  
  // Obter exercícios da disciplina atual
  let exercises = allExercises.filter(ex => ex.subject === currentSubject);
  
  if (query.trim()) {
    const lowerQuery = query.toLowerCase();
    
    // Filtrar por título, descrição, tags, autor
    exercises = exercises.filter((ex) => {
      const title = (ex.title || "").toLowerCase();
      const description = (ex.description || "").toLowerCase();
      const author = (ex.author?.username || "").toLowerCase();
      const tags = (ex.tags || []).map((tag) => tag.toLowerCase()).join(" ");
      
      return (
        title.includes(lowerQuery) ||
        description.includes(lowerQuery) ||
        author.includes(lowerQuery) ||
        tags.includes(lowerQuery)
      );
    });
  }
  
  renderExercisesList(exercises);
}

// ===============================
//  TIME AGO FORMATTER
// ===============================
function timeAgo(dateString) {
  const diff = (Date.now() - new Date(dateString)) / 1000;
  
  if (diff < 60) return "agora mesmo";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `há ${Math.floor(diff / 86400)} dias`;
  return new Date(dateString).toLocaleDateString("pt-PT");
}

// ===============================
//  CHECK IF EXERCISE IS NEW (3 days)
// ===============================
function isNewExercise(createdAt) {
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  const exerciseDate = new Date(createdAt).getTime();
  const now = Date.now();
  return now - exerciseDate < THREE_DAYS_MS;
}

// ===============================
//  OPEN EXERCISE
// ===============================
function openExercise(id) {
  window.location.href = `exercise.html?id=${id}`;
}

// ===============================
//  FORMAT DATE
// ===============================
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = (now - date) / 1000; // diferença em segundos
  
  if (diff < 60) return "agora mesmo";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `há ${Math.floor(diff / 86400)} dias`;
  
  return date.toLocaleDateString("pt-PT", { 
    day: "numeric", 
    month: "short" 
  });
}

// ===============================
//  ESCAPE HTML
// ===============================
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ===============================
//  INITIALIZE
// ===============================
document.addEventListener("DOMContentLoaded", async () => {
  // Carregar utilizador
  await loadLoggedUser();
  
  // Setup search
  const searchInput = document.getElementById("exploreSearchInput");
  const clearSearch = document.getElementById("clearExploreSearch");
  
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value;
      if (clearSearch) {
        clearSearch.classList.toggle("hidden", !query);
      }
      
      // Se há uma disciplina aberta, filtrar exercícios
      // Caso contrário, filtrar disciplinas
      if (currentSubject) {
        filterExercisesInSubject(query);
      } else {
        filterSubjects(query);
      }
    });
  }
  
  if (clearSearch) {
    clearSearch.addEventListener("click", () => {
      searchInput.value = "";
      clearSearch.classList.add("hidden");
      
      // Se há uma disciplina aberta, limpar filtro de exercícios
      // Caso contrário, limpar filtro de disciplinas
      if (currentSubject) {
        filterExercisesInSubject("");
      } else {
        filterSubjects("");
      }
    });
  }
  
  // Setup back button
  const backBtn = document.getElementById("backToSubjects");
  if (backBtn) {
    backBtn.addEventListener("click", backToSubjects);
  }
  
  // Handle browser back/forward
  window.addEventListener("popstate", (e) => {
    const params = new URLSearchParams(window.location.search);
    const subjectParam = params.get("subject");
    
    if (subjectParam) {
      showExercisesForSubject(subjectParam);
    } else {
      backToSubjects();
    }
  });
  
  // Carregar exercícios
  loadExercises();
});

