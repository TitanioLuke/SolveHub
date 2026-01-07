// ===============================
//  GLOBAL STATE
// ===============================
const params = new URLSearchParams(window.location.search);
const exerciseId = params.get("id");
let currentUser = null;
let currentExercise = null; // Armazenar exercício atual para atualizar sidebar quando user carregar
let expandedReplies = new Set(); // IDs dos comentários com respostas expandidas
let openReplyForms = new Set(); // IDs dos comentários com formulários de resposta abertos
let replyFormContents = new Map(); // Conteúdo dos formulários de resposta (commentId -> content)
let focusedTextareaId = null; // ID do textarea que está focado
let commentsSortMode = localStorage.getItem("commentsSortMode") || "best"; // Modo de ordenação: "best" ou "recent"
let lastLoadedComments = []; // Guardar comentários em memória para re-ordenar sem recarregar
let selectedFiles = []; // Guardar ficheiros selecionados para o formulário de resposta principal
let replyFiles = new Map(); // Guardar ficheiros selecionados para cada resposta (commentId -> files[])
let exerciseSocket = null; // Socket.IO para comentários do exercício

// ===============================
//  LOAD LOGGED USER
// ===============================
async function loadLoggedUser() {
  const token = localStorage.getItem("token");
  if (!token) {
    console.log("Nenhum token encontrado, redirecionando para login");
    window.location.href = "auth.html";
    return;
  }

  console.log("Token encontrado, tentando carregar utilizador...");
  try {
    const user = await apiGet("/auth/me");
    currentUser = user;
    localStorage.setItem("user", JSON.stringify(user));

    // Calcular iniciais uma vez
    let initials = "A";
    if (user.username) {
      initials = user.username
        .trim()
        .split(" ")
        .map((word) => word[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();
    }

    // Atualizar topbar
    const profileName = document.querySelector(".profile-name");
    if (profileName) {
      profileName.textContent = user.username || "Utilizador";
    }

    // Atualizar avatar (imagem ou iniciais)
    updateAvatarDisplay(user);

    // Mostrar link Admin se for admin
    showAdminLink(user);
    // Também chamar a função global centralizada
    if (window.showAdminLinkIfAuthorized) {
        window.showAdminLinkIfAuthorized();
    }

    // Atualizar avatar do formulário de comentário
    const commentAvatar = document.getElementById("commentAuthorAvatar");
    const commentName = document.getElementById("commentAuthorName");
    if (commentAvatar) {
      // Limpar conteúdo anterior
      commentAvatar.textContent = "";
      
      if (user.avatar && user.avatar.trim() !== "") {
        // Criar elemento img
        const img = document.createElement("img");
        img.src = `http://localhost:5050${user.avatar}`;
        img.alt = user.username || 'Avatar';
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";
        img.style.display = "block";
        img.style.borderRadius = "999px";
        commentAvatar.appendChild(img);
      } else {
        commentAvatar.textContent = initials;
      }
    }
    if (commentName) {
      commentName.textContent = user.username || "Utilizador";
    }
    console.log("Utilizador carregado com sucesso:", user.username);
    
    // Habilitar botões de like/dislike do exercício se existirem
    enableExerciseVotingButtons();
    
    // Se houver um exercício carregado, atualizar UI completa (incluindo botões de editar/remover)
    if (currentExercise) {
      console.log("Atualizando UI após carregar utilizador...");
      refreshExerciseUI();
    }
  } catch (err) {
    console.error("Erro ao carregar utilizador:", err);
    console.error("Status do erro:", err.status);
    console.error("Mensagem do erro:", err.message);
    
    // Só redirecionar se for erro de autenticação (401 ou 403)
    if (err.status === 401 || err.status === 403 || 
        (err.message && (err.message.includes('401') || err.message.includes('403')))) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "auth.html";
      return;
    } else {
      // Para outros erros, apenas logar mas não redirecionar
      console.warn("Erro ao carregar utilizador, mas continuando...");
      // Tentar usar dados do localStorage se disponível
      const cachedUser = localStorage.getItem("user");
      if (cachedUser) {
        try {
          currentUser = JSON.parse(cachedUser);
          // Habilitar botões se houver utilizador em cache
          enableExerciseVotingButtons();
          // Atualizar UI se houver exercício carregado
          if (currentExercise) {
            refreshExerciseUI();
          }
        } catch (e) {
          console.error("Erro ao parsear user do cache:", e);
        }
      }
    }
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
//  ENABLE EXERCISE VOTING BUTTONS
// ===============================
function enableExerciseVotingButtons() {
  if (!currentUser) return;
  
  const likeBtn = document.querySelector('.youtube-like-btn[data-action="like"]');
  const dislikeBtn = document.querySelector('.youtube-dislike-btn[data-action="dislike"]');
  
  if (likeBtn) {
    likeBtn.disabled = false;
    console.log("Like button enabled");
  }
  if (dislikeBtn) {
    dislikeBtn.disabled = false;
    console.log("Dislike button enabled");
  }
}

// ===============================
//  LOAD EXERCISE
// ===============================
async function loadExercise() {
  if (!exerciseId) {
    document.getElementById("exerciseDetail").innerHTML = `
      <div class="loading-state">
        <h3>Exercício não encontrado</h3>
        <p>O ID do exercício não foi fornecido.</p>
      </div>
    `;
    return;
  }

  const container = document.getElementById("exerciseDetail");
  container.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>A carregar exercício...</p>
    </div>
  `;

  try {
    const exercise = await apiGet(`/exercises/${exerciseId}`);
    currentExercise = exercise; // Armazenar exercício atual
    // Usar refreshExerciseUI para garantir que os botões aparecem quando currentUser estiver pronto
    refreshExerciseUI();
  } catch (error) {
    console.error("Erro ao carregar exercício:", error);
    container.innerHTML = `
      <div class="empty-state">
        <h3>Erro ao carregar exercício</h3>
        <p>${error?.message || "Erro desconhecido"}</p>
      </div>
    `;
  }
}

// ===============================
//  CHECK IF EXERCISE OWNER
// ===============================
function isExerciseOwner(exercise) {
  if (!currentUser || !exercise) return false;
  
  const userId = currentUser?.id || currentUser?._id;
  const authorId = exercise.author?._id || exercise.author?.id || exercise.author;
  
  if (!userId || !authorId) return false;
  
  return userId.toString() === authorId.toString();
}

// ===============================
//  REFRESH EXERCISE UI
// ===============================
function refreshExerciseUI() {
  if (currentExercise) {
    renderExercise(currentExercise);
    updateSidebar(currentExercise);
  }
}

// ===============================
//  RENDER EXERCISE
// ===============================
function renderExercise(exercise) {
  const container = document.getElementById("exerciseDetail");
  
  // Verificar se o utilizador é o dono do exercício
  const isOwner = isExerciseOwner(exercise);
  const userRole = currentUser ? (currentUser.role || "").toUpperCase() : "";
  const isAdmin = currentUser && userRole === "ADMIN";
  const canReport = currentUser && !isOwner;
  
  // Botões de ação
  let actionsHtml = "";
  const hasActions = isOwner || isAdmin || canReport;
  
  if (hasActions) {
    actionsHtml = `<div class="exercise-actions">`;
    
    // Botões do dono/admin
    if (isOwner || isAdmin) {
      if (isOwner) {
        actionsHtml += `
          <button type="button" class="exercise-action-btn" onclick="editExercise('${exercise._id}')" title="Editar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>`;
      }
      if (isOwner) {
        actionsHtml += `
          <button type="button" class="exercise-action-btn delete" onclick="deleteExercise('${exercise._id}')" title="Remover">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>`;
      } else if (isAdmin) {
        actionsHtml += `
          <button type="button" class="exercise-action-btn delete" onclick="adminDeleteExercise('${exercise._id}')" title="Eliminar (Admin)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>`;
      }
    }
    
    // Botão de report (se não for dono e estiver autenticado)
    if (canReport) {
      actionsHtml += `
        <button type="button" class="exercise-action-btn report-btn" onclick="openReportModal('EXERCISE', '${exercise._id}')" title="Reportar exercício">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
            <line x1="4" y1="22" x2="4" y2="15"/>
          </svg>
        </button>`;
    }
    
    actionsHtml += `</div>`;
  }
  
  // Renderizar anexos com botões de download
  const attachmentsHtml = exercise.attachments && exercise.attachments.length > 0
    ? `<div class="exercise-attachments-grid">
        ${exercise.attachments.map(att => {
          const fileUrl = `http://localhost:5050${att.url}`;
          if (att.type === 'image') {
            return `<div class="attachment-card">
              <img src="${fileUrl}" alt="${att.filename}" class="attachment-preview" />
              <div class="attachment-info">
                <button type="button" onclick="downloadFile('${fileUrl}', '${att.filename}')" class="download-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                  </svg>
                  Descarregar
                </button>
              </div>
            </div>`;
          } else {
            return `<div class="attachment-card">
              <div class="attachment-pdf-preview">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
                </svg>
              </div>
              <div class="attachment-info">
                <button type="button" onclick="downloadFile('${fileUrl}', '${att.filename}')" class="download-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                  </svg>
                  Descarregar
                </button>
              </div>
            </div>`;
          }
        }).join("")}
       </div>`
    : "";

  container.innerHTML = `
    <div class="exercise-detail-header">
      <h1 class="exercise-detail-title">${exercise.title}</h1>
      ${actionsHtml}
    </div>
    ${attachmentsHtml}
    <div class="exercise-detail-description">${exercise.description || ""}</div>
  `;

  // Atualizar sidebar
  updateSidebar(exercise);
}

// ===============================
//  UPDATE SIDEBAR
// ===============================
function updateSidebar(exercise) {
  const sidebarContainer = document.getElementById("exerciseSidebar");
  if (!sidebarContainer) return;
  
  // Verificar se há utilizador no localStorage antes de desabilitar botões
  let userForButtons = currentUser;
  if (!userForButtons) {
    const cachedUser = localStorage.getItem("user");
    if (cachedUser) {
      try {
        userForButtons = JSON.parse(cachedUser);
      } catch (e) {
        // Ignorar erro
      }
    }
  }

  const tagsHtml = exercise.tags && exercise.tags.length > 0
    ? `<div class="sidebar-tags">
        ${exercise.tags.map(tag => `<span class="sidebar-tag">${tag}</span>`).join("")}
       </div>`
    : '<span style="color: var(--text-muted); font-size: 13px;">Sem tags</span>';

  const createdAt = new Date(exercise.createdAt).toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  // Usar userForButtons (que verifica localStorage) em vez de currentUser
  const userId = userForButtons?._id || userForButtons?.id || currentUser?._id || currentUser?.id;
  
  // Verificar se o usuário votou - precisa verificar tanto objetos populados quanto IDs
  const hasLiked = userId && exercise.likes && exercise.likes.length > 0 && exercise.likes.some(like => {
    if (!like) return false;
    const likeId = typeof like === 'object' ? (like._id || like.id) : like;
    return likeId && (likeId.toString() === userId.toString());
  });
  
  const hasDisliked = userId && exercise.dislikes && exercise.dislikes.length > 0 && exercise.dislikes.some(dislike => {
    if (!dislike) return false;
    const dislikeId = typeof dislike === 'object' ? (dislike._id || dislike.id) : dislike;
    return dislikeId && (dislikeId.toString() === userId.toString());
  });
  
  // Log apenas para debug se necessário
  if (userId) {
    console.log("Verificando voto - userId:", userId, "hasLiked:", hasLiked, "hasDisliked:", hasDisliked);
  }

  const likesCount = exercise.likes?.length || 0;
  const dislikesCount = exercise.dislikes?.length || 0;

  sidebarContainer.innerHTML = `
    <!-- Informações pessoais no topo -->
    <div class="sidebar-info-section sidebar-top">
      <div class="sidebar-info-row">
        <svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <div class="sidebar-info-content">
          <div class="sidebar-info-label">Publicado por</div>
          <div class="sidebar-info-value">${exercise.author?.username || "Anónimo"}</div>
        </div>
      </div>

      <div class="sidebar-info-row">
        <svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        <div class="sidebar-info-content">
          <div class="sidebar-info-label">Data</div>
          <div class="sidebar-info-value sidebar-date">${createdAt}</div>
        </div>
      </div>

      <div class="sidebar-info-row">
        <svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        <div class="sidebar-info-content">
          <div class="sidebar-info-label">Disciplina</div>
          <div class="sidebar-info-value">${exercise.subject || "Geral"}</div>
        </div>
      </div>
    </div>

    <!-- Tags -->
    <div class="sidebar-info-section">
      <div class="sidebar-info-label" style="margin-bottom: 12px;">Tags</div>
      ${tagsHtml}
    </div>

    <!-- Botões de Like/Dislike -->
    <div class="sidebar-info-section">
      <div class="sidebar-voting-section" data-exercise-id="${exercise._id}">
        <button type="button" class="youtube-like-btn ${hasLiked ? 'active' : ''}" 
                data-action="like"
                data-exercise-id="${exercise._id}"
                ${!userForButtons ? 'disabled' : ''}
                title="Gostar">
          <svg viewBox="0 0 24 24" fill="currentColor" style="pointer-events: none;">
            <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
          </svg>
          <span class="exercise-likes-count">${likesCount}</span>
        </button>
        <div class="voting-divider"></div>
        <button type="button" class="youtube-dislike-btn ${hasDisliked ? 'active' : ''}" 
                data-action="dislike"
                data-exercise-id="${exercise._id}"
                ${!userForButtons ? 'disabled' : ''}
                title="Não gostar">
          <svg viewBox="0 0 24 24" fill="currentColor" style="pointer-events: none;">
            <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/>
          </svg>
          <span class="exercise-dislikes-count">${dislikesCount}</span>
        </button>
      </div>
    </div>

    ${!isExerciseOwner(exercise) && userForButtons ? `
    <!-- Botão Guardar -->
    <div class="sidebar-info-section">
      <button type="button" class="sidebar-save-btn" id="saveExerciseBtn" data-exercise-id="${exercise._id}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
        </svg>
        <span id="saveExerciseText">Guardar</span>
      </button>
    </div>
    ` : ''}

    <!-- Estatísticas -->
    <div class="sidebar-info-section">
      <div class="sidebar-stats">
        <div class="sidebar-stat">
          <span class="sidebar-stat-value" id="sidebarComments">0</span>
          <span class="sidebar-stat-label">Comentários</span>
        </div>
      </div>
    </div>
  `;
  
  // Anexar event listeners diretamente aos botões após renderizar
  setTimeout(async () => {
    attachVotingButtonListeners(exercise._id);
    
    // Configurar botão de guardar se existir (apenas se não for o dono)
    if (!isExerciseOwner(exercise) && userForButtons) {
      await setupSaveButton(exercise._id);
    }
    
    // Debug: verificar se os botões existem e são clicáveis
    const likeBtn = document.querySelector(`.youtube-like-btn[data-exercise-id="${exercise._id}"]`);
    const dislikeBtn = document.querySelector(`.youtube-dislike-btn[data-exercise-id="${exercise._id}"]`);
    
    console.log("=== DEBUG VOTING BUTTONS ===");
    console.log("Like button:", likeBtn);
    console.log("Dislike button:", dislikeBtn);
    if (likeBtn) {
      console.log("Like button disabled:", likeBtn.disabled);
      console.log("Like button style:", window.getComputedStyle(likeBtn));
      console.log("Like button pointer-events:", window.getComputedStyle(likeBtn).pointerEvents);
    }
    if (dislikeBtn) {
      console.log("Dislike button disabled:", dislikeBtn.disabled);
      console.log("Dislike button style:", window.getComputedStyle(dislikeBtn));
      console.log("Dislike button pointer-events:", window.getComputedStyle(dislikeBtn).pointerEvents);
    }
    console.log("===========================");
  }, 100);
}

// ===============================
//  SETUP SAVE BUTTON
// ===============================
async function setupSaveButton(exerciseId) {
  const saveBtn = document.getElementById("saveExerciseBtn");
  const saveText = document.getElementById("saveExerciseText");
  
  if (!saveBtn || !saveText) return;

  try {
    // Verificar se o exercício já está guardado
    const savedExercises = await apiGet("/auth/me/saved");
    const isSaved = Array.isArray(savedExercises) && savedExercises.some(ex => ex._id === exerciseId);
    
    // Atualizar estado do botão
    if (isSaved) {
      saveBtn.classList.add("saved");
      saveText.textContent = "Guardado";
      saveBtn.title = "Tirar de guardado";
    } else {
      saveBtn.classList.remove("saved");
      saveText.textContent = "Guardar";
      saveBtn.title = "Guardar exercício";
    }

    // Adicionar event listener
    saveBtn.addEventListener("click", async () => {
      await toggleSaveExercise(exerciseId, saveBtn, saveText);
    });
  } catch (error) {
    console.error("Erro ao verificar estado de guardado:", error);
    // Mesmo com erro, permitir tentar guardar
    saveBtn.addEventListener("click", async () => {
      await toggleSaveExercise(exerciseId, saveBtn, saveText);
    });
  }
}

// ===============================
//  TOGGLE SAVE EXERCISE
// ===============================
async function toggleSaveExercise(exerciseId, buttonEl, textEl) {
  if (!currentUser) {
    alert("Precisas de estar autenticado para guardar exercícios.");
    return;
  }

  // Prevenir múltiplos cliques simultâneos
  if (buttonEl.disabled || buttonEl.dataset.processing === "true") {
    return;
  }

  const isCurrentlySaved = buttonEl.classList.contains("saved");
  const originalText = textEl.textContent;
  
  try {
    // Marcar como processando e desativar botão
    buttonEl.dataset.processing = "true";
    buttonEl.disabled = true;
    textEl.textContent = isCurrentlySaved ? "A remover..." : "A guardar...";

    if (isCurrentlySaved) {
      // Remover dos guardados
      await apiDelete(`/exercises/${exerciseId}/save`);
      buttonEl.classList.remove("saved");
      textEl.textContent = "Guardar";
      buttonEl.title = "Guardar exercício";
    } else {
      // Guardar
      await apiPost(`/exercises/${exerciseId}/save`, {});
      buttonEl.classList.add("saved");
      textEl.textContent = "Guardado";
      buttonEl.title = "Tirar de guardado";
    }
  } catch (error) {
    console.error("Erro ao guardar/remover exercício:", error);
    
    // Se o erro for que já está guardado, atualizar o estado do botão
    if (error?.message && error.message.includes("já está guardado")) {
      buttonEl.classList.add("saved");
      textEl.textContent = "Guardado";
      buttonEl.title = "Tirar de guardado";
    } else {
      alert(error?.message || "Erro ao guardar exercício. Tenta novamente.");
      textEl.textContent = originalText;
    }
  } finally {
    buttonEl.disabled = false;
    buttonEl.dataset.processing = "false";
  }
}

// ===============================
//  LOAD COMMENTS
// ===============================
async function loadComments() {
  if (!exerciseId) return;

  // Verificar se há algum textarea focado ou com conteúdo
  const activeTextarea = document.activeElement;
  const isTextareaFocused = activeTextarea && activeTextarea.tagName === 'TEXTAREA' && activeTextarea.id.startsWith('reply-content-');
  const hasTextareaContent = Array.from(document.querySelectorAll('textarea[id^="reply-content-"]')).some(
    ta => ta.value.trim().length > 0
  );
  
  // Se o usuário está escrevendo, não recarregar
  if (isTextareaFocused || hasTextareaContent) {
    console.log("Polling pausado - usuário está escrevendo");
    return;
  }

  // Salvar estado atual antes de recarregar
  saveCommentsState();

  try {
    const comments = await apiGet(`/answers/exercise/${exerciseId}`);
    // Guardar em memória para re-ordenar sem recarregar
    lastLoadedComments = comments;
    
    // Aplicar ordenação e renderizar
    const sortedComments = applyCommentsSort([...comments]);
    renderComments(sortedComments);
    
    // Restaurar estado após renderizar
    restoreCommentsState();
    
    // Contar total de respostas (incluindo aninhadas)
    const totalCount = comments.reduce((sum, comment) => {
      return sum + 1 + (comment.replies?.length || 0);
    }, 0);
    updateCommentsCount(totalCount);
    
    // Atualizar sidebar - apenas comentários (likes do exercício já estão na sidebar)
    const sidebarComments = document.getElementById("sidebarComments");
    if (sidebarComments) {
      sidebarComments.textContent = totalCount;
    }
  } catch (error) {
    console.error("Erro ao carregar comentários:", error);
    document.getElementById("commentsList").innerHTML = `
      <div class="empty-comments">
        <h3>Erro ao carregar comentários</h3>
        <p>${error?.message || "Erro desconhecido"}</p>
      </div>
    `;
  }
}

// ===============================
//  SAVE COMMENTS STATE
// ===============================
function saveCommentsState() {
  expandedReplies.clear();
  openReplyForms.clear();
  replyFormContents.clear();
  focusedTextareaId = null;
  
  // Salvar quais respostas estão expandidas
  document.querySelectorAll('.replies-toggle[data-expanded="true"]').forEach(btn => {
    const commentId = btn.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
    if (commentId) {
      expandedReplies.add(commentId);
    }
  });
  
  // Salvar quais formulários estão abertos e seu conteúdo
  document.querySelectorAll('[id^="reply-form-"]').forEach(form => {
    if (form.style.display !== 'none' && form.innerHTML.trim() !== '') {
      const commentId = form.id.replace('reply-form-', '');
      openReplyForms.add(commentId);
      
      // Salvar conteúdo do textarea
      const textarea = document.getElementById(`reply-content-${commentId}`);
      if (textarea) {
        replyFormContents.set(commentId, textarea.value);
        
        // Verificar se está focado
        if (document.activeElement === textarea) {
          focusedTextareaId = commentId;
        }
      }
      
      // Salvar ficheiros do input se existirem
      const fileInput = document.getElementById(`reply-attachments-${commentId}`);
      if (fileInput && fileInput.files.length > 0) {
        replyFiles.set(commentId, Array.from(fileInput.files));
      }
    }
  });
}

// ===============================
//  RESTORE COMMENTS STATE
// ===============================
function restoreCommentsState() {
  // Restaurar respostas expandidas
  expandedReplies.forEach(commentId => {
    const toggleBtn = document.querySelector(`button[onclick="toggleReplies('${commentId}')"]`);
    const hiddenReplies = document.getElementById(`hidden-replies-${commentId}`);
    
    if (toggleBtn && hiddenReplies) {
      hiddenReplies.style.display = 'block';
      toggleBtn.dataset.expanded = 'true';
      const count = hiddenReplies.querySelectorAll('.reply-item').length;
      toggleBtn.querySelector('span').textContent = 'Ocultar comentários';
      toggleBtn.querySelector('svg').style.transform = 'rotate(180deg)';
    }
  });
  
  // Restaurar formulários abertos
  openReplyForms.forEach(commentId => {
    const formContainer = document.getElementById(`reply-form-${commentId}`);
    if (formContainer) {
      formContainer.style.display = 'block';
      
      // Recriar formulário se necessário
      const savedContent = replyFormContents.get(commentId) || '';
      const savedFiles = replyFiles.get(commentId) || [];
      formContainer.innerHTML = `
        <div class="reply-form">
          <textarea id="reply-content-${commentId}" placeholder="Escreve a tua resposta..." rows="3">${savedContent}</textarea>
          
          <!-- FILE UPLOAD -->
          <div class="comment-upload-area">
            <div class="upload-preview-container" id="reply-upload-preview-${commentId}"></div>
            <label for="reply-attachments-${commentId}" class="upload-label">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
              <span>Adicionar ficheiros</span>
            </label>
            <input 
              type="file" 
              id="reply-attachments-${commentId}" 
              name="attachments"
              accept="image/*,application/pdf"
              multiple
              class="upload-input-hidden"
            />
          </div>
          
          <div class="reply-form-actions">
            <button type="button" class="btn-outline" onclick="cancelReply('${commentId}')">Cancelar</button>
            <button type="button" class="btn-primary" onclick="submitReply('${commentId}')">Publicar</button>
          </div>
        </div>
      `;
      
      // Setup file upload para esta resposta
      setupReplyFileUpload(commentId);
      
      // Restaurar foco se este era o textarea focado
      if (focusedTextareaId === commentId) {
        setTimeout(() => {
          const textarea = document.getElementById(`reply-content-${commentId}`);
          if (textarea) {
            textarea.focus();
            // Mover cursor para o final do texto
            const length = textarea.value.length;
            textarea.setSelectionRange(length, length);
          }
        }, 50);
      }
    }
  });
}

// ===============================
//  APPLY COMMENTS SORT
// ===============================
function applyCommentsSort(comments) {
  // Clonar array para não mutar o original
  const sorted = [...comments];
  
  if (commentsSortMode === "best") {
    // Melhor: ordenar por score = (likesCount - dislikesCount) desc; em empate por createdAt desc
    sorted.sort((a, b) => {
      const scoreA = (a.likesCount || 0) - (a.dislikesCount || 0);
      const scoreB = (b.likesCount || 0) - (b.dislikesCount || 0);
      
      if (scoreB !== scoreA) {
        return scoreB - scoreA; // Maior score primeiro
      }
      
      // Em empate, mais recente primeiro
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  } else if (commentsSortMode === "recent") {
    // Mais recentes: ordenar por createdAt desc
    sorted.sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }
  
  // Nota: não ordenar as replies (replies continuam por createdAt asc como já está no renderComment)
  return sorted;
}

// ===============================
//  SET COMMENTS SORT MODE
// ===============================
function setCommentsSortMode(mode) {
  if (mode !== "best" && mode !== "recent") {
    console.warn("Modo de ordenação inválido:", mode);
    return;
  }
  
  commentsSortMode = mode;
  localStorage.setItem("commentsSortMode", mode);
  
  // Atualizar seletor visual
  const select = document.getElementById("commentsSortSelect");
  if (select) {
    select.value = mode;
  }
  
  // Re-aplicar ordenação e re-renderizar se houver comentários em memória
  if (lastLoadedComments.length > 0) {
    // Salvar estado antes de re-renderizar
    saveCommentsState();
    
    const sortedComments = applyCommentsSort([...lastLoadedComments]);
    renderComments(sortedComments);
    
    // Restaurar estado após renderizar
    restoreCommentsState();
  }
}

// ===============================
//  RENDER COMMENTS
// ===============================
function renderComments(comments) {
  const container = document.getElementById("commentsList");

  if (!comments || comments.length === 0) {
    container.innerHTML = `
      <div class="empty-comments">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
        <h3>Nenhuma resposta ainda</h3>
        <p>Sê o primeiro a responder a este exercício!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = comments.map(comment => renderComment(comment)).join("");
}

// ===============================
//  RENDER SINGLE COMMENT
// ===============================
function renderComment(comment) {
  const authorInitials = (comment.author?.username || "A")
    .trim()
    .split(" ")
    .map((word) => word[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  
  // Avatar do autor (imagem ou iniciais)
  const authorAvatar = comment.author?.avatar && comment.author.avatar.trim() !== ""
    ? `<img src="http://localhost:5050${comment.author.avatar}" alt="${comment.author.username || 'Avatar'}" />`
    : authorInitials;

    const userId = currentUser?.id ?? null;

const likesCount = comment.likesCount ?? comment.likes?.length ?? 0;
const dislikesCount = comment.dislikesCount ?? comment.dislikes?.length ?? 0;

const hasLiked =
  comment.hasLiked ??
  (userId ? (comment.likes ?? []).some(id => id.toString() === userId.toString()) : false);

const hasDisliked =
  comment.hasDisliked ??
  (userId ? (comment.dislikes ?? []).some(id => id.toString() === userId.toString()) : false);

  const netVotes = likesCount - dislikesCount;
  const voteCountClass = netVotes > 0 ? 'positive' : netVotes < 0 ? 'negative' : '';

  const attachmentsHtml = comment.attachments && comment.attachments.length > 0
    ? `<div class="comment-attachments">
        ${comment.attachments.map(att => {
          const fileUrl = `http://localhost:5050${att.url}`;
          if (att.type === 'image') {
            return `<div class="comment-attachment-card">
              <img src="${fileUrl}" alt="${att.filename}" class="comment-attachment-preview" />
              <div class="comment-attachment-info">
                <button type="button" onclick="downloadFile('${fileUrl}', '${att.filename}')" class="download-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                  </svg>
                  Descarregar
                </button>
              </div>
            </div>`;
          } else {
            return `<div class="comment-attachment-card">
              <div class="comment-attachment-pdf-preview">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
                </svg>
              </div>
              <div class="comment-attachment-info">
                <button type="button" onclick="downloadFile('${fileUrl}', '${att.filename}')" class="download-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                  </svg>
                  Descarregar
                </button>
              </div>
            </div>`;
          }
        }).join("")}
       </div>`
    : "";

  const replies = comment.replies || [];
  const hasReplies = replies.length > 0;
  const totalRepliesCount = replies.length;

  // Por padrão, não mostrar nenhuma resposta, apenas o botão
  const repliesHtml = hasReplies ? `
    <div class="comment-replies" id="replies-${comment._id}">
      <button class="replies-toggle" onclick="toggleReplies('${comment._id}')" data-expanded="false">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9l6 6 6-6"/>
        </svg>
        <span>Ver mais ${totalRepliesCount} ${totalRepliesCount === 1 ? 'comentário' : 'comentários'}</span>
      </button>
      <div class="hidden-replies" id="hidden-replies-${comment._id}" style="display: none;">
        ${replies.map(reply => renderReply(reply)).join("")}
      </div>
    </div>
  ` : "";

  return `
    <div class="comment-item" data-comment-id="${comment._id}">
      <div class="comment-voting">
        <div class="comment-voting-section">
          <button type="button" class="youtube-like-btn ${hasLiked ? 'active' : ''}" 
                  onclick="toggleLike('${comment._id}')" 
                  data-comment-id="${comment._id}"
                  data-action="like"
                  ${!currentUser ? 'disabled' : ''}
                  title="Gostar">
            <svg viewBox="0 0 24 24" fill="currentColor" style="pointer-events: none;">
              <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
            </svg>
            <span class="comment-likes-count">${likesCount}</span>
          </button>
          <div class="voting-divider-vertical"></div>
          <button type="button" class="youtube-dislike-btn ${hasDisliked ? 'active' : ''}" 
                  onclick="toggleDislike('${comment._id}')" 
                  data-comment-id="${comment._id}"
                  data-action="dislike"
                  ${!currentUser ? 'disabled' : ''}
                  title="Não gostar">
            <svg viewBox="0 0 24 24" fill="currentColor" style="pointer-events: none;">
              <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/>
            </svg>
            <span class="comment-dislikes-count">${dislikesCount}</span>
          </button>
        </div>
      </div>
      <div class="comment-content-wrapper">
        <div class="comment-header">
          <div class="comment-avatar">${authorAvatar}</div>
          <div class="comment-info">
            <div class="comment-author">${comment.author?.username || "Anónimo"}</div>
            <div class="comment-time">${timeAgo(comment.createdAt)}</div>
          </div>
        </div>
        <div class="comment-content">${comment.content || ""}</div>
        ${attachmentsHtml}
        <div class="comment-actions">
          <button class="comment-action-btn" onclick="showReplyForm('${comment._id}')" ${!currentUser ? 'disabled' : ''}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            <span>Responder</span>
          </button>
          ${currentUser && comment.author?._id !== currentUser.id ? `
            <button class="comment-action-btn" onclick="openReportModal('ANSWER', '${comment._id}')" title="Reportar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                <line x1="4" y1="22" x2="4" y2="15"/>
              </svg>
            </button>
          ` : ""}
          ${(() => {
            const userRole = currentUser ? (currentUser.role || "").toUpperCase() : "";
            return currentUser && userRole === "ADMIN";
          })() ? `
            <button class="comment-action-btn delete" onclick="adminDeleteComment('${comment._id}')" title="Eliminar (Admin)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
            </button>
          ` : ""}
        </div>
        ${repliesHtml}
        <div id="reply-form-${comment._id}" style="display: none;"></div>
      </div>
    </div>
  `;
}

// ===============================
//  RENDER REPLY
// ===============================
function renderReply(reply) {
  const authorInitials = (reply.author?.username || "A")
    .trim()
    .split(" ")
    .map((word) => word[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  
  // Avatar do autor (imagem ou iniciais)
  const authorAvatar = reply.author?.avatar && reply.author.avatar.trim() !== ""
    ? `<img src="http://localhost:5050${reply.author.avatar}" alt="${reply.author.username || 'Avatar'}" />`
    : authorInitials;

  const attachmentsHtml = reply.attachments && reply.attachments.length > 0
    ? `<div class="comment-attachments">
        ${reply.attachments.map(att => {
          const fileUrl = `http://localhost:5050${att.url}`;
          if (att.type === 'image') {
            return `<div class="comment-attachment-card">
              <img src="${fileUrl}" alt="${att.filename}" class="comment-attachment-preview" />
              <div class="comment-attachment-info">
                <button type="button" onclick="downloadFile('${fileUrl}', '${att.filename}')" class="download-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                  </svg>
                  Descarregar
                </button>
              </div>
            </div>`;
          } else {
            return `<div class="comment-attachment-card">
              <div class="comment-attachment-pdf-preview">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
                </svg>
              </div>
              <div class="comment-attachment-info">
                <button type="button" onclick="downloadFile('${fileUrl}', '${att.filename}')" class="download-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                  </svg>
                  Descarregar
                </button>
              </div>
            </div>`;
          }
        }).join("")}
       </div>`
    : "";

  const userRole = currentUser ? (currentUser.role || "").toUpperCase() : "";
  const isAdmin = currentUser && userRole === "ADMIN";
  const canReport = currentUser && reply.author?._id !== currentUser.id;
  
  return `
    <div class="reply-item" data-comment-id="${reply._id}">
      <div class="comment-avatar">${authorAvatar}</div>
      <div style="flex: 1;">
        <div class="comment-header">
          <div class="comment-info">
            <div class="comment-author">${reply.author?.username || "Anónimo"}</div>
            <div class="comment-time">${timeAgo(reply.createdAt)}</div>
          </div>
        </div>
        <div class="comment-content">${reply.content || ""}</div>
        ${attachmentsHtml}
        ${canReport || isAdmin ? `
          <div class="comment-actions" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border);">
            ${canReport ? `
              <button class="comment-action-btn" onclick="openReportModal('ANSWER', '${reply._id}')" title="Reportar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                  <line x1="4" y1="22" x2="4" y2="15"/>
                </svg>
              </button>
            ` : ""}
            ${isAdmin ? `
              <button class="comment-action-btn delete" onclick="adminDeleteComment('${reply._id}')" title="Eliminar (Admin)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
              </button>
            ` : ""}
          </div>
        ` : ""}
      </div>
    </div>
  `;
}

// ===============================
//  UPDATE COMMENTS COUNT
// ===============================
function updateCommentsCount(count) {
  const countEl = document.getElementById("commentsCount");
  if (countEl) {
    countEl.textContent = `${count} ${count === 1 ? 'resposta' : 'respostas'}`;
  }
}

// ===============================
//  TOGGLE REPLIES (GLOBAL)
// ===============================
window.toggleReplies = function(commentId) {
  const toggleBtn = document.querySelector(`button[onclick="toggleReplies('${commentId}')"]`);
  const hiddenReplies = document.getElementById(`hidden-replies-${commentId}`);
  
  if (!hiddenReplies || !toggleBtn) return;
  
  const isExpanded = toggleBtn.dataset.expanded === 'true';
  const count = hiddenReplies.querySelectorAll('.reply-item').length;
  
  if (isExpanded) {
    // Fechar
    hiddenReplies.style.display = 'none';
    toggleBtn.dataset.expanded = 'false';
    toggleBtn.querySelector('span').textContent = `Ver mais ${count} ${count === 1 ? 'comentário' : 'comentários'}`;
    toggleBtn.querySelector('svg').style.transform = 'rotate(0deg)';
    expandedReplies.delete(commentId);
  } else {
    // Abrir
    hiddenReplies.style.display = 'block';
    toggleBtn.dataset.expanded = 'true';
    toggleBtn.querySelector('span').textContent = 'Ocultar comentários';
    toggleBtn.querySelector('svg').style.transform = 'rotate(180deg)';
    expandedReplies.add(commentId);
  }
};

// ===============================
//  SHOW REPLY FORM (GLOBAL)
// ===============================
window.showReplyForm = function(commentId) {
  if (!currentUser) {
    alert("Precisas de estar autenticado para responder.");
    return;
  }
  
  const formContainer = document.getElementById(`reply-form-${commentId}`);
  if (!formContainer) return;
  
  if (formContainer.style.display === 'none' || !formContainer.innerHTML.trim()) {
    formContainer.style.display = 'block';
    // Inicializar lista de ficheiros se não existir
    if (!replyFiles.has(commentId)) {
      replyFiles.set(commentId, []);
    }
    
    formContainer.innerHTML = `
      <div class="reply-form">
        <textarea id="reply-content-${commentId}" placeholder="Escreve a tua resposta..." rows="3"></textarea>
        
        <!-- FILE UPLOAD -->
        <div class="comment-upload-area">
          <div class="upload-preview-container" id="reply-upload-preview-${commentId}"></div>
          <label for="reply-attachments-${commentId}" class="upload-label">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
            <span>Adicionar ficheiros</span>
          </label>
          <input 
            type="file" 
            id="reply-attachments-${commentId}" 
            name="attachments"
            accept="image/*,application/pdf"
            multiple
            class="upload-input-hidden"
          />
        </div>
        
        <div class="reply-form-actions">
          <button type="button" class="btn-outline" onclick="cancelReply('${commentId}')">Cancelar</button>
          <button type="button" class="btn-primary" onclick="submitReply('${commentId}')">Publicar</button>
        </div>
      </div>
    `;
    
    // Setup file upload para esta resposta
    setupReplyFileUpload(commentId);
    
    document.getElementById(`reply-content-${commentId}`).focus();
    // Adicionar ao conjunto de formulários abertos
    openReplyForms.add(commentId);
  } else {
    formContainer.style.display = 'none';
    formContainer.innerHTML = '';
    // Limpar ficheiros desta resposta
    replyFiles.delete(commentId);
    // Remover do conjunto de formulários abertos
    openReplyForms.delete(commentId);
  }
};

// ===============================
//  CANCEL REPLY (GLOBAL)
// ===============================
window.cancelReply = function(commentId) {
  const formContainer = document.getElementById(`reply-form-${commentId}`);
  if (formContainer) {
    formContainer.style.display = 'none';
    formContainer.innerHTML = '';
    // Limpar ficheiros desta resposta
    replyFiles.delete(commentId);
    // Remover do conjunto de formulários abertos
    openReplyForms.delete(commentId);
  }
};

// ===============================
//  SUBMIT REPLY (GLOBAL)
// ===============================
window.submitReply = async function(commentId) {
  if (!currentUser) {
    alert("Precisas de estar autenticado para responder.");
    return;
  }

  const content = document.getElementById(`reply-content-${commentId}`)?.value.trim();
  if (!content) {
    alert("A resposta não pode estar vazia.");
    return;
  }

  const formData = new FormData();
  formData.append("content", content);
  formData.append("exerciseId", exerciseId);
  if (commentId) {
    formData.append("parentAnswerId", commentId);
  }
  
  // Adicionar ficheiros
  const fileInput = document.getElementById(`reply-attachments-${commentId}`);
  if (fileInput && fileInput.files.length > 0) {
    Array.from(fileInput.files).forEach(file => {
      formData.append("attachments", file);
    });
  }
  
  console.log("Submetendo resposta - content:", content, "exerciseId:", exerciseId, "parentAnswerId:", commentId);

  try {
    const response = await apiPostFormData("/answers", formData);
    console.log("Resposta criada com sucesso:", response);
    
    // Limpar formulário mas manter o estado para não fechar
    const formContainer = document.getElementById(`reply-form-${commentId}`);
    if (formContainer) {
      formContainer.style.display = 'none';
      formContainer.innerHTML = '';
      openReplyForms.delete(commentId);
    }
    
    // Limpar ficheiros desta resposta
    replyFiles.delete(commentId);
    
    // O socket vai atualizar automaticamente via evento comment:created
    // Mas podemos recarregar imediatamente para feedback mais rápido
    await loadComments();
  } catch (error) {
    console.error("Erro ao criar resposta:", error);
    console.error("Detalhes do erro:", {
      message: error.message,
      status: error.status,
      response: error.response
    });
    // Não mostrar alerta se o erro for apenas de rede mas a resposta foi criada
    if (error.message && !error.message.includes("Failed to fetch")) {
      alert(error.message || "Erro ao publicar resposta. Tenta novamente.");
    }
  }
};

// ===============================
//  SUBMIT COMMENT
// ===============================
async function submitComment(e) {
  e.preventDefault();

  if (!currentUser) {
    alert("Precisas de estar autenticado para comentar.");
    return;
  }

  const content = document.getElementById("commentContent").value.trim();
  if (!content) {
    alert("O comentário não pode estar vazio.");
    return;
  }

  const formData = new FormData();
  formData.append("content", content);
  formData.append("exerciseId", exerciseId);

  // Adicionar ficheiros
  const fileInput = document.getElementById("commentAttachments");
  if (fileInput.files.length > 0) {
    Array.from(fileInput.files).forEach(file => {
      formData.append("attachments", file);
    });
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<div class="loading-spinner" style="width: 18px; height: 18px; border-width: 2px;"></div>';

  try {
    await apiPostFormData("/answers", formData);
    
    // Limpar formulário
    document.getElementById("commentForm").reset();
    document.getElementById("commentUploadPreview").innerHTML = "";
    fileInput.value = "";
    selectedFiles = []; // Limpar lista de ficheiros
    
    // Recarregar comentários
    await loadComments();
  } catch (error) {
    console.error("Erro ao criar comentário:", error);
    // Não mostrar alerta se o erro for apenas de rede mas a resposta foi criada
    if (error.message && !error.message.includes("Failed to fetch")) {
      alert(error.message || "Erro ao publicar comentário. Tenta novamente.");
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
}

// ===============================
//  TOGGLE LIKE (GLOBAL)
// ===============================
window.toggleLike = async function(commentId) {
  if (!currentUser) {
    alert("Precisas de estar autenticado para dar like.");
    return;
  }

  const likeBtn = document.querySelector(`.youtube-like-btn[data-comment-id="${commentId}"]`);
  const dislikeBtn = document.querySelector(`.youtube-dislike-btn[data-comment-id="${commentId}"]`);
  
  if (likeBtn) likeBtn.disabled = true;
  if (dislikeBtn) dislikeBtn.disabled = true;

  try {
    const updatedAnswer = await apiPost(`/answers/${commentId}/like`, {});
    updateCommentVotingUI(updatedAnswer, commentId);
  } catch (error) {
    console.error("Erro ao dar like:", error);
    alert(error.message || "Erro ao atualizar like.");
  } finally {
    if (likeBtn) likeBtn.disabled = false;
    if (dislikeBtn) dislikeBtn.disabled = false;
  }
}

// ===============================
//  TOGGLE DISLIKE (GLOBAL)
// ===============================
window.toggleDislike = async function(commentId) {
  if (!currentUser) {
    alert("Precisas de estar autenticado para dar dislike.");
    return;
  }

  const likeBtn = document.querySelector(`.youtube-like-btn[data-comment-id="${commentId}"]`);
  const dislikeBtn = document.querySelector(`.youtube-dislike-btn[data-comment-id="${commentId}"]`);
  
  if (likeBtn) likeBtn.disabled = true;
  if (dislikeBtn) dislikeBtn.disabled = true;

  try {
    const updatedAnswer = await apiPost(`/answers/${commentId}/dislike`, {});
    updateCommentVotingUI(updatedAnswer, commentId);
  } catch (error) {
    console.error("Erro ao dar dislike:", error);
    alert(error.message || "Erro ao atualizar dislike.");
  } finally {
    if (likeBtn) likeBtn.disabled = false;
    if (dislikeBtn) dislikeBtn.disabled = false;
  }
};

// ===============================
//  UPDATE COMMENT VOTING UI
// ===============================
function updateCommentVotingUI(updatedAnswer, commentId) {
  const likeBtn = document.querySelector(`.youtube-like-btn[data-comment-id="${commentId}"][data-action="like"]`);
  const dislikeBtn = document.querySelector(`.youtube-dislike-btn[data-comment-id="${commentId}"][data-action="dislike"]`);
  const likesCountEl = likeBtn?.querySelector('.comment-likes-count');
  const dislikesCountEl = dislikeBtn?.querySelector('.comment-dislikes-count');
  
  // Usar novos campos (com fallback para formato antigo)
  const newLikesCount = updatedAnswer.likesCount ?? updatedAnswer.likes?.length ?? 0;
  const newDislikesCount = updatedAnswer.dislikesCount ?? updatedAnswer.dislikes?.length ?? 0;
  const hasLiked = updatedAnswer.hasLiked ?? false;
  const hasDisliked = updatedAnswer.hasDisliked ?? false;
  
  // Atualizar contadores
  if (likesCountEl) likesCountEl.textContent = newLikesCount;
  if (dislikesCountEl) dislikesCountEl.textContent = newDislikesCount;
  
  // Atualizar estados dos botões
  if (likeBtn) {
    if (hasLiked) {
      likeBtn.classList.add('active');
    } else {
      likeBtn.classList.remove('active');
    }
    likeBtn.disabled = false;
  }
  if (dislikeBtn) {
    if (hasDisliked) {
      dislikeBtn.classList.add('active');
    } else {
      dislikeBtn.classList.remove('active');
    }
    dislikeBtn.disabled = false;
  }
}

// ===============================
//  DOWNLOAD FILE (GLOBAL)
// ===============================
window.downloadFile = async function(url, filename) {
  try {
    // Garantir que o URL está completo
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // Se o URL começa com /uploads, adicionar o domínio
      if (url.startsWith('/uploads')) {
        fullUrl = `http://localhost:5050${url}`;
      } else {
        // Se não começa com /, assumir que é relativo
        fullUrl = `http://localhost:5050/${url}`;
      }
    }

    // Tentar fazer fetch primeiro para verificar se o ficheiro existe
    let response;
    try {
      response = await fetch(fullUrl, { method: 'HEAD' });
    } catch (fetchError) {
      console.error("Erro ao verificar ficheiro:", fetchError);
      // Tentar abrir em nova aba como fallback
      window.open(fullUrl, '_blank');
      return;
    }
    
    if (!response.ok) {
      // Se o ficheiro não existir (404), mostrar mensagem e tentar abrir em nova aba
      if (response.status === 404) {
        console.warn(`Ficheiro não encontrado no servidor: ${fullUrl}`);
        alert(`O ficheiro "${filename || 'anexo'}" não foi encontrado no servidor. Pode ter sido removido.`);
      }
      // Tentar abrir em nova aba como fallback
      window.open(fullUrl, '_blank');
      return;
    }

    // Se o ficheiro existir, fazer download usando blob
    const blobResponse = await fetch(fullUrl);
    if (!blobResponse.ok) {
      throw new Error(`Erro ao carregar ficheiro: ${blobResponse.status}`);
    }
    
    const blob = await blobResponse.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = blobUrl;
    downloadLink.download = filename || 'download';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    // Limpar o blob URL
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
  } catch (error) {
    console.error("Erro ao descarregar ficheiro:", error);
    // Fallback: tentar abrir em nova aba
    try {
      const fullUrl = url.startsWith('http') ? url : `http://localhost:5050${url.startsWith('/') ? url : '/' + url}`;
      window.open(fullUrl, '_blank');
    } catch (e) {
      alert('Erro ao descarregar ficheiro. O ficheiro pode não existir no servidor.');
    }
  }
};

// ===============================
//  ATTACH VOTING BUTTON LISTENERS
// ===============================
function attachVotingButtonListeners(exerciseId) {
  console.log("Attaching voting button listeners for exercise:", exerciseId);
  
  // Usar event delegation no document para garantir que funciona
  // Remover listeners antigos se existirem
  const oldHandler = window._exerciseVotingHandler;
  if (oldHandler) {
    document.removeEventListener('click', oldHandler);
  }
  
  // Criar novo handler
  window._exerciseVotingHandler = async function(e) {
    const button = e.target.closest('.youtube-like-btn, .youtube-dislike-btn');
    if (!button) return;
    
    const action = button.dataset.action;
    const btnExerciseId = button.dataset.exerciseId;
    
    // Verificar se é o exercício correto
    if (!action || !btnExerciseId || btnExerciseId !== exerciseId) return;
    
    // Verificar se o botão não está desabilitado
    if (button.disabled) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    console.log(`${action.toUpperCase()} BUTTON CLICKED for exercise:`, btnExerciseId);
    
    if (!currentUser) {
      alert(`Precisas de estar autenticado para dar ${action === 'like' ? 'like' : 'dislike'}.`);
      return;
    }
    
    // Desabilitar ambos os botões temporariamente
    const likeBtn = document.querySelector(`.youtube-like-btn[data-exercise-id="${btnExerciseId}"]`);
    const dislikeBtn = document.querySelector(`.youtube-dislike-btn[data-exercise-id="${btnExerciseId}"]`);
    if (likeBtn) likeBtn.disabled = true;
    if (dislikeBtn) dislikeBtn.disabled = true;
    
    try {
      const endpoint = action === 'like' ? 'like' : 'dislike';
      const updatedExercise = await apiPost(`/exercises/${btnExerciseId}/${endpoint}`, {});
      updateExerciseVotingUI(updatedExercise, btnExerciseId);
    } catch (error) {
      console.error(`Erro ao dar ${action}:`, error);
      alert(error.message || `Erro ao atualizar ${action}.`);
    } finally {
      if (likeBtn) likeBtn.disabled = false;
      if (dislikeBtn) dislikeBtn.disabled = false;
    }
  };
  
  // Anexar listener ao document usando capture para pegar antes de outros handlers
  document.addEventListener('click', window._exerciseVotingHandler, true);
  
  console.log("Event listener attached to document");
}

// ===============================
//  UPDATE EXERCISE VOTING UI
// ===============================
function updateExerciseVotingUI(updatedExercise, exerciseId) {
  const likeBtn = document.querySelector(`.youtube-like-btn[data-exercise-id="${exerciseId}"][data-action="like"]`);
  const dislikeBtn = document.querySelector(`.youtube-dislike-btn[data-exercise-id="${exerciseId}"][data-action="dislike"]`);
  const likesCountEl = likeBtn?.querySelector('.exercise-likes-count');
  const dislikesCountEl = dislikeBtn?.querySelector('.exercise-dislikes-count');
  
  const newLikesCount = updatedExercise.likes?.length || 0;
  const newDislikesCount = updatedExercise.dislikes?.length || 0;
  
  const userId = currentUser?._id || currentUser?.id;
  const hasLiked = userId && updatedExercise.likes?.some(like => {
    const likeId = typeof like === 'object' ? (like._id || like.id) : like;
    return likeId && (likeId.toString() === userId.toString());
  });
  const hasDisliked = userId && updatedExercise.dislikes?.some(dislike => {
    const dislikeId = typeof dislike === 'object' ? (dislike._id || dislike.id) : dislike;
    return dislikeId && (dislikeId.toString() === userId.toString());
  });
  
  // Atualizar contadores
  if (likesCountEl) likesCountEl.textContent = newLikesCount;
  if (dislikesCountEl) dislikesCountEl.textContent = newDislikesCount;
  
  // Atualizar estados dos botões
  if (likeBtn) {
    if (hasLiked) {
      likeBtn.classList.add('active');
    } else {
      likeBtn.classList.remove('active');
    }
    likeBtn.disabled = false;
  }
  if (dislikeBtn) {
    if (hasDisliked) {
      dislikeBtn.classList.add('active');
    } else {
      dislikeBtn.classList.remove('active');
    }
    dislikeBtn.disabled = false;
  }
}


// ===============================
//  FILE UPLOAD PREVIEW
// ===============================
// Função auxiliar para renderizar um preview de ficheiro
function renderFilePreview(file, index, previewContainer) {
  if (file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const div = document.createElement("div");
      div.className = "upload-preview-item";
      div.setAttribute("data-file-index", index);
      div.innerHTML = `
        <img src="${event.target.result}" alt="${file.name}" />
        <button type="button" class="remove-file" onclick="removeFilePreview(${index})" title="Remover ficheiro">×</button>
      `;
      previewContainer.appendChild(div);
    };
    reader.readAsDataURL(file);
  } else {
    // PDF ou outro tipo de ficheiro
    const div = document.createElement("div");
    div.className = "upload-preview-item";
    div.setAttribute("data-file-index", index);
    div.innerHTML = `
      <div style="width: 80px; height: 80px; padding: 8px; background: #f1f5f9; border-radius: 8px; border: 2px solid var(--border); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
        </svg>
        <span style="font-size: 10px; color: var(--text-muted); text-align: center; word-break: break-word; max-width: 100%;">${file.name.length > 15 ? file.name.substring(0, 15) + '...' : file.name}</span>
      </div>
      <button type="button" class="remove-file" onclick="removeFilePreview(${index})" title="Remover ficheiro">×</button>
    `;
    previewContainer.appendChild(div);
  }
}

// Função para atualizar todos os previews
function refreshFilePreviews() {
  const fileInput = document.getElementById("commentAttachments");
  const previewContainer = document.getElementById("commentUploadPreview");
  
  if (!fileInput || !previewContainer) return;
  
  // Sincronizar selectedFiles com o input
  selectedFiles = Array.from(fileInput.files);
  
  previewContainer.innerHTML = "";
  selectedFiles.forEach((file, index) => {
    renderFilePreview(file, index, previewContainer);
  });
}

// Função para renderizar preview de ficheiro de resposta
function renderReplyFilePreview(file, index, previewContainer, commentId) {
  if (file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const div = document.createElement("div");
      div.className = "upload-preview-item";
      div.setAttribute("data-file-index", index);
      div.innerHTML = `
        <img src="${event.target.result}" alt="${file.name}" />
        <button type="button" class="remove-file" onclick="removeReplyFilePreview('${commentId}', ${index})" title="Remover ficheiro">×</button>
      `;
      previewContainer.appendChild(div);
    };
    reader.readAsDataURL(file);
  } else {
    // PDF ou outro tipo de ficheiro
    const div = document.createElement("div");
    div.className = "upload-preview-item";
    div.setAttribute("data-file-index", index);
    div.innerHTML = `
      <div style="width: 80px; height: 80px; padding: 8px; background: #f1f5f9; border-radius: 8px; border: 2px solid var(--border); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
        </svg>
        <span style="font-size: 10px; color: var(--text-muted); text-align: center; word-break: break-word; max-width: 100%;">${file.name.length > 15 ? file.name.substring(0, 15) + '...' : file.name}</span>
      </div>
      <button type="button" class="remove-file" onclick="removeReplyFilePreview('${commentId}', ${index})" title="Remover ficheiro">×</button>
    `;
    previewContainer.appendChild(div);
  }
}

// Função para atualizar previews de uma resposta
function refreshReplyFilePreviews(commentId) {
  const fileInput = document.getElementById(`reply-attachments-${commentId}`);
  const previewContainer = document.getElementById(`reply-upload-preview-${commentId}`);
  
  if (!fileInput || !previewContainer) return;
  
  // Sincronizar replyFiles com o input
  const files = Array.from(fileInput.files);
  replyFiles.set(commentId, files);
  
  previewContainer.innerHTML = "";
  files.forEach((file, index) => {
    renderReplyFilePreview(file, index, previewContainer, commentId);
  });
}

// Setup file upload para uma resposta específica
function setupReplyFileUpload(commentId) {
  const fileInput = document.getElementById(`reply-attachments-${commentId}`);
  const previewContainer = document.getElementById(`reply-upload-preview-${commentId}`);
  
  if (!fileInput || !previewContainer) return;
  
  // Inicializar lista de ficheiros se não existir
  if (!replyFiles.has(commentId)) {
    replyFiles.set(commentId, []);
  }
  
  fileInput.addEventListener("change", (e) => {
    const newFiles = Array.from(e.target.files);
    const existingFiles = replyFiles.get(commentId) || [];
    
    // Adicionar novos ficheiros aos existentes (evitar duplicados)
    newFiles.forEach(newFile => {
      const exists = existingFiles.some(existingFile => 
        existingFile.name === newFile.name && 
        existingFile.size === newFile.size &&
        existingFile.lastModified === newFile.lastModified
      );
      if (!exists) {
        existingFiles.push(newFile);
      }
    });
    
    // Atualizar o input com todos os ficheiros
    const dt = new DataTransfer();
    existingFiles.forEach(file => dt.items.add(file));
    fileInput.files = dt.files;
    
    // Atualizar previews
    refreshReplyFilePreviews(commentId);
  });
  
  // Renderizar previews iniciais se houver ficheiros
  if (replyFiles.has(commentId) && replyFiles.get(commentId).length > 0) {
    const dt = new DataTransfer();
    replyFiles.get(commentId).forEach(file => dt.items.add(file));
    fileInput.files = dt.files;
    refreshReplyFilePreviews(commentId);
  }
}

// Remover ficheiro de uma resposta
window.removeReplyFilePreview = function(commentId, index) {
  const fileInput = document.getElementById(`reply-attachments-${commentId}`);
  const previewContainer = document.getElementById(`reply-upload-preview-${commentId}`);
  
  if (!fileInput) return;
  
  const files = replyFiles.get(commentId) || [];
  files.splice(index, 1);
  replyFiles.set(commentId, files);
  
  // Atualizar o input
  const dt = new DataTransfer();
  files.forEach(file => dt.items.add(file));
  fileInput.files = dt.files;
  
  // Recriar todos os previews
  refreshReplyFilePreviews(commentId);
};

function setupFileUpload() {
  const fileInput = document.getElementById("commentAttachments");
  const previewContainer = document.getElementById("commentUploadPreview");

  if (!fileInput || !previewContainer) return;

  fileInput.addEventListener("change", (e) => {
    const newFiles = Array.from(e.target.files);
    
    // Adicionar novos ficheiros aos existentes (evitar duplicados)
    newFiles.forEach(newFile => {
      // Verificar se o ficheiro já não existe (por nome e tamanho)
      const exists = selectedFiles.some(existingFile => 
        existingFile.name === newFile.name && 
        existingFile.size === newFile.size &&
        existingFile.lastModified === newFile.lastModified
      );
      if (!exists) {
        selectedFiles.push(newFile);
      }
    });
    
    // Atualizar o input com todos os ficheiros
    const dt = new DataTransfer();
    selectedFiles.forEach(file => dt.items.add(file));
    fileInput.files = dt.files;
    
    // Atualizar previews
    refreshFilePreviews();
  });
}

// ===============================
//  REMOVE FILE PREVIEW (GLOBAL)
// ===============================
window.removeFilePreview = function(index) {
  const fileInput = document.getElementById("commentAttachments");
  const previewContainer = document.getElementById("commentUploadPreview");
  
  if (!fileInput) return;

  // Remover o ficheiro da lista
  selectedFiles.splice(index, 1);
  
  // Atualizar o input
  const dt = new DataTransfer();
  selectedFiles.forEach(file => dt.items.add(file));
  fileInput.files = dt.files;
  
  // Recriar todos os previews
  refreshFilePreviews();
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
//  PROFILE DROPDOWN
// ===============================
function setupProfileDropdown() {
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
}

// ===============================
//  LOGOUT
// ===============================
function setupLogout() {
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
}

// ===============================
//  SETUP COMMENTS SORT
// ===============================
function setupCommentsSort() {
  const select = document.getElementById("commentsSortSelect");
  if (!select) return;
  
  // Definir valor inicial do localStorage
  select.value = commentsSortMode;
  
  // Event listener para mudança de ordenação
  select.addEventListener("change", (e) => {
    setCommentsSortMode(e.target.value);
  });
}

// ===============================
//  REAL-TIME COMMENTS (SOCKET.IO)
// ===============================
function setupExerciseSocket() {
  const token = localStorage.getItem("token");
  if (!token || !exerciseId) {
    console.log("Sem token ou exerciseId, socket não inicializado");
    return;
  }

  // Verificar se Socket.IO está carregado
  if (typeof io === "undefined") {
    console.error("Socket.IO não está carregado. Adiciona o script no HTML.");
    return;
  }

  // Desconectar socket anterior se existir
  if (exerciseSocket) {
    exerciseSocket.disconnect();
  }

  // Conectar socket para o exercício
  exerciseSocket = io("http://localhost:5050", {
    auth: {
      token: token,
    },
    transports: ["websocket", "polling"],
  });

  exerciseSocket.on("connect", () => {
    console.log("✅ Conectado ao WebSocket de comentários");
    
    // Juntar-se à room do exercício
    if (exerciseId) {
      exerciseSocket.emit("joinExercise", { exerciseId });
      console.log(`📝 Juntou-se ao exercício ${exerciseId}`);
    }
  });

  exerciseSocket.on("disconnect", () => {
    console.log("❌ Desconectado do WebSocket de comentários");
  });

  exerciseSocket.on("connect_error", (error) => {
    console.error("Erro de conexão WebSocket:", error);
  });

  // Ouvir evento de novo comentário
  exerciseSocket.on("comment:created", (data) => {
    console.log("Novo comentário criado:", data);
    if (data.exerciseId === exerciseId) {
      // Recarregar comentários
      loadComments();
    }
  });

  // Ouvir evento de atualização de votos
  exerciseSocket.on("comment:votesUpdated", (data) => {
    console.log("Votos atualizados:", data);
    if (data.exerciseId === exerciseId) {
      // Recarregar comentários (ou atualizar só aquele comentário se for fácil)
      loadComments();
    }
  });
}

function disconnectExerciseSocket() {
  if (exerciseSocket) {
    if (exerciseId) {
      exerciseSocket.emit("leaveExercise", { exerciseId });
    }
    exerciseSocket.disconnect();
    exerciseSocket = null;
    console.log("Socket do exercício desconectado");
  }
}

// ===============================
//  INITIALIZE
// ===============================
async function initExercisePage() {
  console.log("Inicializando página de exercício...");
  console.log("Exercise ID:", exerciseId);
  
  // Carregar exercício PRIMEIRO (não requer autenticação)
  // Isso garante que o utilizador veja o conteúdo mesmo se houver problema com o token
  try {
    await loadExercise();
  } catch (err) {
    console.error("Erro ao carregar exercício:", err);
  }
  
  // Carregar utilizador em paralelo (não bloquear se houver erro)
  // Usar Promise para não bloquear o resto da página
  loadLoggedUser()
    .then(() => {
      // Após carregar utilizador, inicializar socket
      setupExerciseSocket();
    })
    .catch(err => {
      console.error("Erro ao carregar utilizador (não crítico):", err);
    });
  
  // Carregar comentários
  try {
    await loadComments();
  } catch (err) {
    console.error("Erro ao carregar comentários:", err);
  }
  
  // Setup form e event listeners (independente do estado de autenticação)
  const commentForm = document.getElementById("commentForm");
  if (commentForm) {
    commentForm.addEventListener("submit", submitComment);
  }
  
  setupFileUpload();
  setupProfileDropdown();
  setupLogout();
  setupCommentsSort();
  
  // Socket será inicializado após carregar utilizador (ver loadLoggedUser acima)
  // Se já houver token, inicializar imediatamente
  if (localStorage.getItem("token")) {
    setupExerciseSocket();
  }
  
  // Cleanup ao sair da página
  window.addEventListener("beforeunload", () => {
    disconnectExerciseSocket();
  });
  
  console.log("Página de exercício inicializada com sucesso");

  // Verificar se há highlightAnswerId na URL
  const params = new URLSearchParams(window.location.search);
  const highlightAnswerId = params.get("highlightAnswerId");
  if (highlightAnswerId) {
    // Aguardar comentários carregarem e depois fazer highlight
    setTimeout(() => {
      highlightComment(highlightAnswerId);
    }, 1000);
  }
}

// ===============================
//  SHOW ADMIN LINK
// ===============================
function showAdminLink(user) {
  const role = (user.role || "").toUpperCase();
  if (role === "ADMIN") {
    const menu = document.querySelector(".menu");
    if (menu && !document.getElementById("adminMenuItem")) {
      const adminLink = document.createElement("a");
      adminLink.id = "adminMenuItem";
      adminLink.className = "menu-item";
      adminLink.href = "admin.html";
      adminLink.innerHTML = `
        <svg class="icon" stroke="currentColor" viewBox="0 0 24 24" fill="none">
          <path stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
        </svg>
        Admin
      `;
      menu.appendChild(adminLink);
    }
  }
}

// ===============================
//  HIGHLIGHT COMMENT
// ===============================
function highlightComment(commentId) {
  const commentEl = document.querySelector(`[data-comment-id="${commentId}"]`);
  if (!commentEl) {
    // Se não encontrar, pode estar numa reply - procurar em todas as replies
    const allReplies = document.querySelectorAll(".reply-item");
    for (const reply of allReplies) {
      if (reply.querySelector(`[data-comment-id="${commentId}"]`) || reply.dataset.commentId === commentId) {
        reply.classList.add("comment-highlight");
        reply.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
          reply.classList.remove("comment-highlight");
        }, 5000);
        return;
      }
    }
    // Tentar novamente após um delay (comentários podem ainda estar a carregar)
    setTimeout(() => highlightComment(commentId), 500);
    return;
  }

  commentEl.classList.add("comment-highlight");
  commentEl.scrollIntoView({ behavior: "smooth", block: "center" });
  
  setTimeout(() => {
    commentEl.classList.remove("comment-highlight");
  }, 5000);
}

// ===============================
//  ADMIN DELETE EXERCISE
// ===============================
window.adminDeleteExercise = async function(exerciseId) {
  if (!currentUser) {
    alert("Sem permissões para realizar esta ação.");
    return;
  }
  const userRole = (currentUser.role || "").toUpperCase();
  if (userRole !== "ADMIN") {
    alert("Sem permissões para realizar esta ação.");
    return;
  }

  const confirmed = await openConfirmModal({
    title: "Eliminar exercício?",
    message: "Tens a certeza que queres eliminar este exercício? Esta ação não pode ser desfeita.",
    confirmText: "Eliminar",
    variant: "delete"
  });

  if (!confirmed) return;

  try {
    await apiDelete(`/admin/exercises/${exerciseId}`);
    alert("Exercício eliminado com sucesso.");
    window.location.href = "index.html";
  } catch (err) {
    console.error("Erro ao eliminar exercício:", err);
    alert(err.message || "Erro ao eliminar exercício.");
  }
};

// ===============================
//  ADMIN DELETE COMMENT
// ===============================
window.adminDeleteComment = async function(commentId) {
  if (!currentUser) {
    alert("Sem permissões para realizar esta ação.");
    return;
  }
  const userRole = (currentUser.role || "").toUpperCase();
  if (userRole !== "ADMIN") {
    alert("Sem permissões para realizar esta ação.");
    return;
  }

  const confirmed = await openConfirmModal({
    title: "Eliminar comentário?",
    message: "Tens a certeza que queres eliminar este comentário? Esta ação não pode ser desfeita.",
    confirmText: "Eliminar",
    variant: "delete"
  });

  if (!confirmed) return;

  try {
    await apiDelete(`/admin/answers/${commentId}`);
    await loadComments();
  } catch (err) {
    console.error("Erro ao eliminar comentário:", err);
    alert(err.message || "Erro ao eliminar comentário.");
  }
};

// ===============================
//  OPEN REPORT MODAL (GLOBAL)
// ===============================
let reportModalTarget = null;

window.openReportModal = function(targetType, targetId) {
  if (!currentUser) {
    window.location.href = "auth.html";
    return;
  }

  reportModalTarget = { type: targetType, id: targetId };
  const modal = document.getElementById("reportModal");
  if (!modal) {
    console.error("Modal de report não encontrado");
    return;
  }

  document.getElementById("reportForm").reset();
  document.getElementById("reportCharCount").textContent = "0";
  modal.classList.remove("hidden");
};

// Setup report modal listeners (apenas uma vez)
if (document.getElementById("reportModal")) {
  document.getElementById("reportModalClose")?.addEventListener("click", () => {
    document.getElementById("reportModal").classList.add("hidden");
    document.getElementById("reportForm").reset();
    document.getElementById("reportCharCount").textContent = "0";
    reportModalTarget = null;
  });
  
  document.getElementById("reportModalCancel")?.addEventListener("click", () => {
    document.getElementById("reportModal").classList.add("hidden");
    document.getElementById("reportForm").reset();
    document.getElementById("reportCharCount").textContent = "0";
    reportModalTarget = null;
  });
  
  document.getElementById("reportDetailsTextarea")?.addEventListener("input", (e) => {
    document.getElementById("reportCharCount").textContent = e.target.value.length;
  });
  
  document.getElementById("reportForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    if (!reportModalTarget) return;
    
    const reason = document.getElementById("reportReasonSelect").value;
    const details = document.getElementById("reportDetailsTextarea").value.trim();

    if (!reason) {
      alert("Seleciona um motivo.");
      return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "A enviar...";

    try {
      await apiPost("/reports", {
        targetType: reportModalTarget.type,
        targetId: reportModalTarget.id,
        reason,
        details: details || undefined
      });

      document.getElementById("reportModal").classList.add("hidden");
      document.getElementById("reportForm").reset();
      document.getElementById("reportCharCount").textContent = "0";
      reportModalTarget = null;
      alert("Report enviado com sucesso. Obrigado!");
    } catch (err) {
      console.error("Erro ao enviar report:", err);
      alert(err.message || "Erro ao enviar report.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Enviar";
    }
  });
}

// ===============================
//  OPEN CONFIRM MODAL
// ===============================
function openConfirmModal({ title, message, confirmText = "Confirmar", cancelText = "Cancelar", variant = "primary" }) {
  return new Promise((resolve) => {
    const modal = document.getElementById("confirmModal");
    const titleEl = document.getElementById("confirmModalTitle");
    const messageEl = document.getElementById("confirmModalMessage");
    const confirmBtn = document.getElementById("confirmModalConfirm");
    const cancelBtn = document.getElementById("confirmModalCancel");

    if (!modal || !titleEl || !messageEl || !confirmBtn || !cancelBtn) {
      console.error("Elementos do modal de confirmação não encontrados");
      resolve(false);
      return;
    }

    // Configurar conteúdo (só atualizar se fornecido)
    if (title) titleEl.textContent = title;
    if (message) messageEl.textContent = message;
    confirmBtn.textContent = confirmText;
    cancelBtn.textContent = cancelText;

    // Aplicar variante (delete = vermelho)
    confirmBtn.className = `btn-primary ${variant === "delete" ? "delete" : ""}`;

    // Remover listeners antigos
    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    // Função para fechar
    const closeModal = (result) => {
      modal.classList.add("hidden");
      resolve(result);
    };

    // Event listeners
    newConfirmBtn.addEventListener("click", () => closeModal(true));
    newCancelBtn.addEventListener("click", () => closeModal(false));

    // Fechar ao clicar no overlay
    const overlayHandler = (e) => {
      if (e.target === modal) {
        closeModal(false);
        modal.removeEventListener("click", overlayHandler);
      }
    };
    modal.addEventListener("click", overlayHandler);

    // Fechar com ESC
    const escHandler = (e) => {
      if (e.key === "Escape") {
        closeModal(false);
        document.removeEventListener("keydown", escHandler);
      }
    };
    document.addEventListener("keydown", escHandler);

    // Mostrar modal
    modal.classList.remove("hidden");
  });
}

// ===============================
//  OPEN EDIT EXERCISE MODAL
// ===============================
function openEditExerciseModal(exercise) {
  const modal = document.getElementById("editExerciseModal");
  const form = document.getElementById("editExerciseForm");
  const titleInput = document.getElementById("editExerciseTitle");
  const descriptionInput = document.getElementById("editExerciseDescription");
  const subjectPillsContainer = document.getElementById("editExerciseSubjectPills");
  const subjectHiddenInput = document.getElementById("editExerciseSubject");
  const subjectIdHiddenInput = document.getElementById("editExerciseSubjectId") || (() => {
    // Criar input hidden para subjectId se não existir
    const input = document.createElement('input');
    input.type = 'hidden';
    input.id = 'editExerciseSubjectId';
    input.name = 'subjectId';
    const form = document.getElementById("editExerciseForm");
    if (form) {
      const subjectGroup = form.querySelector('.form-group');
      if (subjectGroup) {
        subjectGroup.appendChild(input);
      }
    }
    return input;
  })();
  const tagInput = document.getElementById("editExerciseTagInput");
  const tagsListEl = document.getElementById("editExerciseTagsList");
  const attachmentsInput = document.getElementById("editExerciseAttachments");
  const uploadPreviewsEl = document.getElementById("editExerciseUploadPreviews");
  const uploadTriggerBtn = document.getElementById("editExerciseUploadTrigger");
  const formMessageEl = document.getElementById("editExerciseFormMessage");
  const closeBtn = document.getElementById("editExerciseModalClose");
  const cancelBtn = document.getElementById("editExerciseCancel");
  const submitBtn = document.getElementById("editExerciseSubmit");

  if (!modal || !form || !titleInput || !descriptionInput) {
    console.error("Elementos do modal de edição não encontrados");
    return;
  }

  // Estado do modal
  let currentTags = [...(exercise.tags || [])];
  let currentFiles = []; // Novos ficheiros a adicionar
  let existingAttachments = [...(exercise.attachments || [])]; // Anexos existentes
  let removedAttachments = []; // URLs dos anexos removidos

  // Função para renderizar tags
  function renderTags() {
    tagsListEl.innerHTML = "";
    currentTags.forEach((tag, index) => {
      const chip = document.createElement("span");
      chip.className = "tag-chip";
      chip.innerHTML = `${tag}<button type="button" data-index="${index}">&times;</button>`;
      tagsListEl.appendChild(chip);
    });
  }

  // Função para renderizar anexos (existentes + novos)
  function renderAttachments() {
    uploadPreviewsEl.innerHTML = "";

    // Anexos existentes
    existingAttachments.forEach((att, index) => {
      const preview = document.createElement("div");
      preview.className = "preview-item";
      preview.dataset.type = "existing";
      preview.dataset.index = index;

      if (att.type === "image") {
        const img = document.createElement("img");
        img.src = `http://localhost:5050${att.url}`;
        preview.appendChild(img);
      } else {
        preview.textContent = "PDF";
      }

      const badge = document.createElement("span");
      badge.className = "preview-badge";
      badge.textContent = att.type === "image" ? "IMG" : "PDF";
      preview.appendChild(badge);

      const removeBtn = document.createElement("button");
      removeBtn.className = "preview-remove";
      removeBtn.textContent = "×";
      removeBtn.dataset.type = "existing";
      removeBtn.dataset.index = index;
      preview.appendChild(removeBtn);

      uploadPreviewsEl.appendChild(preview);
    });

    // Novos ficheiros
    currentFiles.forEach((file, index) => {
      const preview = document.createElement("div");
      preview.className = "preview-item";
      preview.dataset.type = "new";
      preview.dataset.index = index;

      if (file.type.startsWith("image/")) {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        preview.appendChild(img);
      } else {
        preview.textContent = "PDF";
      }

      const badge = document.createElement("span");
      badge.className = "preview-badge";
      badge.textContent = file.type.startsWith("image/") ? "IMG" : "PDF";
      preview.appendChild(badge);

      const removeBtn = document.createElement("button");
      removeBtn.className = "preview-remove";
      removeBtn.textContent = "×";
      removeBtn.dataset.type = "new";
      removeBtn.dataset.index = index;
      preview.appendChild(removeBtn);

      uploadPreviewsEl.appendChild(preview);
    });
  }

  // Pré-preencher campos
  titleInput.value = exercise.title || "";
  descriptionInput.value = exercise.description || "";

  // Carregar e pré-preencher subject
  (async () => {
    try {
      const subjects = await fetchSubjects();
      const exerciseSubjectId = exercise.subjectId?._id || exercise.subjectId;
      const exerciseSubjectName = exercise.subject?.name || exercise.subject;
      
      if (subjectPillsContainer && window.renderSubjectPills) {
        renderSubjectPills(
          subjectPillsContainer, 
          subjects, 
          exerciseSubjectId, 
          exerciseSubjectName,
          (subjectId, subjectName) => {
            subjectIdHiddenInput.value = subjectId;
            subjectHiddenInput.value = subjectName;
          }
        );
        
        // Se não encontrou match, selecionar primeiro
        if (!exerciseSubjectId && !exerciseSubjectName && subjects.length > 0) {
          const firstPill = subjectPillsContainer.querySelector('.subject-pill');
          if (firstPill) {
            subjectIdHiddenInput.value = firstPill.dataset.subjectId;
            subjectHiddenInput.value = firstPill.dataset.subject;
          }
        } else if (exerciseSubjectId || exerciseSubjectName) {
          // Garantir que os valores estão definidos
          if (exerciseSubjectId) {
            subjectIdHiddenInput.value = exerciseSubjectId;
          }
          if (exerciseSubjectName) {
            subjectHiddenInput.value = exerciseSubjectName;
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error);
      if (subjectPillsContainer) {
        subjectPillsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 13px;">Erro ao carregar disciplinas</p>';
      }
    }
  })();

  // Renderizar tags e anexos
  renderTags();
  renderAttachments();

  // Event listeners para tags
  tagInput.onkeydown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const value = tagInput.value.trim();
      if (value && !currentTags.includes(value)) {
        currentTags.push(value);
        renderTags();
      }
      tagInput.value = "";
    }
  };

  tagsListEl.onclick = (e) => {
    if (e.target.tagName === "BUTTON") {
      const index = Number(e.target.dataset.index);
      currentTags.splice(index, 1);
      renderTags();
    }
  };

  // Event listeners para upload
  uploadTriggerBtn.onclick = () => {
    attachmentsInput.click();
  };

  attachmentsInput.onchange = () => {
    const files = Array.from(attachmentsInput.files);
    currentFiles = currentFiles.concat(files);
    renderAttachments();
  };

  // Event listener para remover anexos
  uploadPreviewsEl.onclick = (e) => {
    if (e.target.classList.contains("preview-remove")) {
      const type = e.target.dataset.type;
      const index = Number(e.target.dataset.index);

      if (type === "existing") {
        // Remover anexo existente
        const removed = existingAttachments.splice(index, 1)[0];
        removedAttachments.push(removed.url);
      } else if (type === "new") {
        // Remover novo ficheiro
        currentFiles.splice(index, 1);
      }

      renderAttachments();
    }
  };

  // Função para fechar
  const closeModal = () => {
    modal.classList.add("hidden");
    form.reset();
    currentTags = [];
    currentFiles = [];
    existingAttachments = [];
    removedAttachments = [];
    formMessageEl.textContent = "";
    formMessageEl.className = "form-message";
  };

  // Event listeners para fechar
  if (closeBtn) {
    closeBtn.onclick = closeModal;
  }
  if (cancelBtn) {
    cancelBtn.onclick = closeModal;
  }

  modal.onclick = (e) => {
    if (e.target === modal) {
      closeModal();
    }
  };

  const escHandler = (e) => {
    if (e.key === "Escape") {
      closeModal();
      document.removeEventListener("keydown", escHandler);
    }
  };
  document.addEventListener("keydown", escHandler);

  // Submit do formulário
  form.onsubmit = async (e) => {
    e.preventDefault();

    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const subject = subjectHiddenInput.value;
    const subjectId = subjectIdHiddenInput.value;

    if (!title || !description || (!subject && !subjectId)) {
      formMessageEl.textContent = "Título, descrição e disciplina são obrigatórios.";
      formMessageEl.className = "form-message error";
      return;
    }

    // Desabilitar botão e mostrar loading
    submitBtn.disabled = true;
    const btnText = submitBtn.querySelector(".btn-text");
    const spinner = submitBtn.querySelector(".loading-spinner");
    if (btnText) btnText.style.display = "none";
    if (spinner) spinner.classList.remove("hidden");

    formMessageEl.textContent = "A guardar alterações...";
    formMessageEl.className = "form-message";

    try {
      // Criar FormData
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      
      // Enviar subjectId se disponível, senão subject (string) para compatibilidade
      if (subjectId) {
        formData.append("subjectId", subjectId);
      }
      if (subject) {
        formData.append("subject", subject);
      }
      
      formData.append("tags", JSON.stringify(currentTags));
      formData.append("removedAttachments", JSON.stringify(removedAttachments));

      // Adicionar novos ficheiros
      currentFiles.forEach((file) => {
        formData.append("attachments", file);
      });

      // Fazer PUT com FormData
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5050/exercises/${exercise._id}`, {
        method: "PUT",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Erro ao atualizar exercício");
      }

      const updatedExercise = await res.json();

      // Atualizar exercício atual (se estiver na página do exercício)
      if (currentExercise && currentExercise._id === updatedExercise._id) {
        currentExercise = updatedExercise;
        refreshExerciseUI();
      }

      // Se estiver na página "Meus exercícios", atualizar a lista
      if (typeof renderMyExercises === "function" && window.myExercises) {
        const exerciseIndex = window.myExercises.findIndex(ex => ex._id === updatedExercise._id);
        if (exerciseIndex !== undefined && exerciseIndex >= 0) {
          window.myExercises[exerciseIndex] = updatedExercise;
          renderMyExercises();
        }
      }

      formMessageEl.textContent = "Exercício atualizado com sucesso!";
      formMessageEl.className = "form-message success";

      setTimeout(() => {
        closeModal();
      }, 1500);
    } catch (error) {
      console.error("Erro ao atualizar exercício:", error);
      formMessageEl.textContent = error.message || "Erro ao atualizar exercício. Tenta novamente.";
      formMessageEl.className = "form-message error";
    } finally {
      // Reabilitar botão
      submitBtn.disabled = false;
      if (btnText) btnText.style.display = "inline";
      if (spinner) spinner.classList.add("hidden");
    }
  };

  // Mostrar modal
  modal.classList.remove("hidden");
  titleInput.focus();
}

// ===============================
//  EDIT EXERCISE (GLOBAL)
// ===============================
window.editExercise = async function(exerciseId) {
  if (!currentUser) {
    alert("Precisas de estar autenticado para editar exercícios.");
    return;
  }

  if (!currentExercise || currentExercise._id !== exerciseId) {
    alert("Erro: exercício não encontrado.");
    return;
  }

  openEditExerciseModal(currentExercise);
};

// ===============================
//  DELETE EXERCISE (GLOBAL)
// ===============================
window.deleteExercise = async function(exerciseId) {
  if (!currentUser) {
    alert("Precisas de estar autenticado para apagar exercícios.");
    return;
  }

  const confirmed = await openConfirmModal({
    title: "Eliminar exercício?",
    message: "Tens a certeza que queres eliminar este exercício? Esta ação não pode ser desfeita.",
    confirmText: "Eliminar",
    cancelText: "Cancelar",
    variant: "delete",
  });

  if (!confirmed) {
    return;
  }

  const modal = document.getElementById("confirmModal");
  const confirmBtn = document.getElementById("confirmModalConfirm");
  
  // Mostrar loading no botão
  if (confirmBtn) {
    confirmBtn.disabled = true;
    const originalText = confirmBtn.textContent;
    confirmBtn.innerHTML = '<div class="loading-spinner" style="width: 16px; height: 16px; border-width: 2px; margin: 0 auto;"></div>';
    
    try {
      await apiDelete(`/exercises/${exerciseId}`);
      if (modal) modal.classList.add("hidden");
      alert("Exercício apagado com sucesso!");
      window.location.href = "index.html";
    } catch (error) {
      console.error("Erro ao apagar exercício:", error);
      alert(error.message || "Erro ao apagar exercício. Tenta novamente.");
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalText;
      }
    }
  } else {
    // Fallback se não encontrar o botão
    try {
      await apiDelete(`/exercises/${exerciseId}`);
      alert("Exercício apagado com sucesso!");
      window.location.href = "index.html";
    } catch (error) {
      console.error("Erro ao apagar exercício:", error);
      alert(error.message || "Erro ao apagar exercício. Tenta novamente.");
    }
  }
};

// Inicializar quando o DOM estiver pronto
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initExercisePage);
} else {
  initExercisePage();
}
