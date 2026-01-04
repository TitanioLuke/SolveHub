// ===============================
//  LOAD LOGGED USER (TOPBAR)
// ===============================
async function loadLoggedUser() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "auth.html";
    return;
  }

  try {
    // apiGet já mete Authorization: Bearer <token> (vem do api.js)
    const user = await apiGet("/auth/me");

    // Cache local (opcional)
    localStorage.setItem("user", JSON.stringify(user));

    // Nome do utilizador
    const profileName = document.querySelector(".profile-name");
    if (profileName) {
      profileName.textContent = user.username;
    }

    // Avatar (imagem ou iniciais)
    updateAvatarDisplay(user);
  } catch (err) {
    console.error("Erro ao carregar utilizador:", err);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "auth.html";
  }
}

// ===============================
//  UPDATE AVATAR DISPLAY
// ===============================
function updateAvatarDisplay(user) {
  const avatar = document.querySelector(".avatar");
  if (!avatar) return;

  // Se o utilizador tem avatar, mostrar imagem
  if (user.avatar && user.avatar.trim() !== "") {
    // Limpar conteúdo anterior
    avatar.textContent = "";
    // Criar elemento img
    const img = document.createElement("img");
    img.src = `http://localhost:5050${user.avatar}`;
    img.alt = user.username || 'Avatar';
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    img.style.display = "block";
    img.style.borderRadius = "999px";
    avatar.appendChild(img);
    return;
  }

  // Caso contrário, mostrar iniciais
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

// ===============================
//  GLOBAL STATE
// ===============================
let allExercises = [];
let currentSort = "recent";
let currentFilter = null;

// ===============================
//  LOAD EXERCISES
// ===============================
async function loadExercises() {
  const container = document.getElementById("exerciseList");

  container.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>A carregar exercícios...</p>
    </div>
  `;

  try {
    const exercises = await apiGet("/exercises");
    allExercises = Array.isArray(exercises) ? exercises : [];

    updateStats(allExercises);
    container.innerHTML = "";

    if (allExercises.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="8" y="8" width="32" height="36" rx="4"/>
              <path d="M8 18h32M8 26h32M8 34h20"/>
            </svg>
          </div>
          <h3>Nenhum exercício encontrado</h3>
          <p>Ainda não existem exercícios disponíveis.</p>
        </div>
      `;
      return;
    }

    renderExercises(allExercises);
  } catch (error) {
    console.error("Erro ao carregar exercícios:", error);
    container.innerHTML = `
      <div class="empty-state">
        <h3>Erro ao carregar exercícios</h3>
        <p>${error?.message || "Erro desconhecido"}</p>
      </div>
    `;
  }
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
//  RENDER EXERCISES
// ===============================
function renderExercises(exercises) {
  const container = document.getElementById("exerciseList");
  container.innerHTML = "";

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
          ${ex.tags.map(tag => `<span class="exercise-tag">${tag}</span>`).join("")}
         </div>`
      : "";

    container.innerHTML += `
      <article class="exercise-card" onclick="openExercise('${ex._id}')">
        <div class="exercise-info">
          <div class="exercise-header">
            <h3>${ex.title}</h3>
          </div>
          
          ${isNewExercise(ex.createdAt) ? '<div class="badge-new-wrapper"><span class="badge-new"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>Novo</span></div>' : ""}

          <p class="subtitle">
            <span class="author">${ex.author?.username || "Anónimo"}</span>
            <span class="separator">•</span>
            <span class="subject">${ex.subject || "Geral"}</span>
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
                      (att) => `
                        <img
                          src="http://localhost:5050${att.url}"
                          alt="${att.filename}"
                          class="attachment-thumb"
                          loading="lazy"
                        >
                      `
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

          <p class="preview">${preview}</p>
        </div>

        <div class="exercise-meta">
          <span class="badge-subject">${ex.subject || "Geral"}</span>
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
//  UPDATE STATS
// ===============================
function updateStats(exercises) {
  const total = exercises.length;
  const solved = exercises.filter((ex) => (ex.answersCount || 0) > 0).length;
  const pending = total - solved;

  document.getElementById("exerciseCount").textContent = total;
  document.getElementById("solvedCount").textContent = solved;
  document.getElementById("pendingCount").textContent = pending;
}

// ===============================
//  SORT FUNCTIONALITY
// ===============================
function sortExercises(type) {
  // Usar allExercises como base, mas aplicar filtros ativos primeiro
  const searchQuery = document.getElementById("searchInput")?.value.toLowerCase() || "";
  let baseExercises = allExercises;
  
  // Aplicar filtro de disciplina se ativo
  if (currentFilter && currentFilter.type === "subject") {
    const subjectMap = {
      "BD": "Base de Dados",
      "SIR": "Sistemas",
      "POO": "Programação"
    };
    const filterValue = currentFilter.value;
    const fullSubjectName = subjectMap[filterValue] || filterValue;
    
    baseExercises = baseExercises.filter((ex) => {
      const exSubject = (ex.subject || "").toLowerCase();
      return exSubject.includes(filterValue.toLowerCase()) || 
             exSubject.includes(fullSubjectName.toLowerCase());
    });
  }
  
  // Se houver pesquisa, filtrar também
  if (searchQuery) {
    baseExercises = baseExercises.filter((ex) => {
      const title = (ex.title || "").toLowerCase();
      const description = (ex.description || "").toLowerCase();
      const author = (ex.author?.username || "").toLowerCase();
      const subject = (ex.subject || "").toLowerCase();
      const tags = (ex.tags || []).map((tag) => tag.toLowerCase()).join(" ");
      
      return (
        title.includes(searchQuery) ||
        description.includes(searchQuery) ||
        author.includes(searchQuery) ||
        subject.includes(searchQuery) ||
        tags.includes(searchQuery)
      );
    });
  }
  
  let sorted = [...baseExercises];

  switch (type) {
    case "recent":
      sorted.sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
      );
      break;
    case "popular":
      sorted.sort((a, b) => (b.votes || 0) - (a.votes || 0));
      break;
    case "answers":
      sorted.sort((a, b) => (b.answersCount || 0) - (a.answersCount || 0));
      break;
    case "unanswered":
      sorted = sorted.filter((ex) => (ex.answersCount || 0) === 0);
      break;
  }

  renderExercises(sorted);
}

// ===============================
//  SEARCH FUNCTIONALITY
// ===============================
const searchInput = document.getElementById("searchInput");
const clearSearch = document.getElementById("clearSearch");

if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();

    if (clearSearch) clearSearch.classList.toggle("hidden", !query);

    if (!query) {
      // Se não há pesquisa, aplicar apenas a ordenação atual
      if (currentSort) {
        sortExercises(currentSort);
      } else {
        renderExercises(allExercises);
      }
      return;
    }

    const filtered = allExercises.filter((ex) => {
      const title = (ex.title || "").toLowerCase();
      const description = (ex.description || "").toLowerCase();
      const author = (ex.author?.username || "").toLowerCase();
      const subject = (ex.subject || "").toLowerCase();
      const tags = (ex.tags || []).map((tag) => tag.toLowerCase()).join(" ");

      return (
        title.includes(query) ||
        description.includes(query) ||
        author.includes(query) ||
        subject.includes(query) ||
        tags.includes(query)
      );
    });

    if (filtered.length === 0) {
      const container = document.getElementById("exerciseList");
      container.innerHTML = `
        <div class="empty-state">
          <h3>Nenhum resultado encontrado</h3>
          <p>Não encontrámos exercícios com "${e.target.value}".</p>
        </div>
      `;
    } else {
      // Aplicar ordenação aos resultados filtrados
      if (currentSort) {
        sortExercises(currentSort);
      } else {
        renderExercises(filtered);
      }
    }
  });

  if (clearSearch) {
    clearSearch.addEventListener("click", () => {
      searchInput.value = "";
      clearSearch.classList.add("hidden");
      // Aplicar ordenação atual após limpar pesquisa
      if (currentSort) {
        sortExercises(currentSort);
      } else {
        renderExercises(allExercises);
      }
      searchInput.focus();
    });
  }
}

// ===============================
//  SUBJECT FILTER
// ===============================
function setupSubjectFilters() {
  // Usar event delegation para funcionar com elementos dinâmicos
  document.addEventListener("click", (e) => {
    const tag = e.target.closest(".tag[data-subject]");
    if (!tag) return;
    
    const subject = tag.dataset.subject;
    if (!subject) return;

    // Verificar se já está selecionado (toggle)
    const isActive = tag.classList.contains("active");
    
    // Remover active de todas as tags
    document.querySelectorAll(".tag[data-subject]").forEach((t) => {
      t.classList.remove("active");
    });

    // Se não estava selecionado, selecionar agora
    if (!isActive) {
      tag.classList.add("active");
      currentFilter = { type: "subject", value: subject };

      const filterChips = document.getElementById("activeFilters");
      if (filterChips) {
        filterChips.innerHTML = `
          <div class="filter-chip">
            <span>Disciplina: ${subject}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" onclick="clearFilters()">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </div>
        `;
      }
    } else {
      // Se estava selecionado, deselecionar
      currentFilter = null;
      const filterChips = document.getElementById("activeFilters");
      if (filterChips) {
        filterChips.innerHTML = "";
      }
    }

    // Mapear abreviações para nomes completos
    const subjectMap = {
      "BD": "Base de Dados",
      "SIR": "Sistemas",
      "POO": "Programação"
    };
    
    const fullSubjectName = subjectMap[subject] || subject;
    
    // Aplicar filtro e ordenação
    // A função sortExercises já considera o currentFilter, então basta chamá-la
    if (currentSort) {
      sortExercises(currentSort);
    } else if (currentFilter) {
      // Se não há ordenação mas há filtro, apenas filtrar
      const filtered = allExercises.filter((ex) => {
        const exSubject = (ex.subject || "").toLowerCase();
        return exSubject.includes(subject.toLowerCase()) || 
               exSubject.includes(fullSubjectName.toLowerCase());
      });
      renderExercises(filtered);
    } else {
      // Sem filtro nem ordenação, mostrar todos
      renderExercises(allExercises);
    }
  });
}

window.clearFilters = function() {
  document.getElementById("activeFilters").innerHTML = "";
  currentFilter = null;
  
  // Remover active de todas as tags
  document.querySelectorAll(".tag[data-subject]").forEach((t) => {
    t.classList.remove("active");
  });
  
  // Aplicar ordenação atual após limpar filtros
  if (currentSort) {
    sortExercises(currentSort);
  } else {
    renderExercises(allExercises);
  }
};

// ===============================
//  SORT DROPDOWN FUNCTIONALITY
// ===============================
function setupSortDropdown() {
  const sortBtn = document.getElementById("sortBtn");
  const sortMenu = document.getElementById("sortMenu");
  
  if (!sortBtn || !sortMenu) return;
  
  // Toggle dropdown ao clicar no botão
  sortBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    sortMenu.classList.toggle("hidden");
  });
  
  // Fechar dropdown ao clicar fora
  document.addEventListener("click", (e) => {
    if (!sortBtn.contains(e.target) && !sortMenu.contains(e.target)) {
      sortMenu.classList.add("hidden");
    }
  });
  
  // Event listeners para os itens do menu
  const menuItems = sortMenu.querySelectorAll(".dropdown-menu-item");
  menuItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const sortType = item.dataset.sort;
      if (!sortType) return;
      
      // Remover active de todos os itens
      menuItems.forEach((i) => i.classList.remove("active"));
      // Adicionar active ao item clicado
      item.classList.add("active");
      
      // Atualizar texto do botão
      const btnText = sortBtn.querySelector("span");
      if (btnText) {
        btnText.textContent = item.textContent.trim();
      }
      
      // Aplicar ordenação
      currentSort = sortType;
      sortExercises(sortType);
      
      // Fechar dropdown
      sortMenu.classList.add("hidden");
    });
  });
}

// ===============================
//  REDIRECT TO EXERCISE
// ===============================
function openExercise(id) {
  window.location.href = `exercise.html?id=${id}`;
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
//  PROFILE DROPDOWN TOGGLE
// ===============================
const profile = document.querySelector(".profile");
const dropdown = document.getElementById("profileMenu");

if (profile && dropdown) {
  profile.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("hidden");
  });

  document.addEventListener("click", () => {
    if (!dropdown.classList.contains("hidden")) dropdown.classList.add("hidden");
  });

  dropdown.addEventListener("click", (e) => e.stopPropagation());
}

// ===============================
//  LOGOUT FUNCTIONALITY
// ===============================
const logoutBtn = document.querySelector(".logout");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    if (confirm("Tens a certeza que queres terminar a sessão?")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "auth.html";
    }
  });
}

// ===============================
//  INITIALIZE (IMPORTANTE)
// ===============================
async function initApp() {
  await loadLoggedUser();
  await loadExercises();
  
  // Configurar dropdown de ordenação (usar setTimeout para garantir que o DOM está pronto)
  setTimeout(() => {
    setupSortDropdown();
    setupSubjectFilters();
  }, 100);
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
