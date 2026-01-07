// ===============================
//  SAVED EXERCISES PAGE
// ===============================

let currentUser = null;
let savedExercises = [];

// ===============================
//  LOAD LOGGED USER
// ===============================
async function loadLoggedUser() {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "auth.html";
      return;
    }

    const user = await apiGet("/auth/me");
    if (!user) {
      window.location.href = "auth.html";
      return;
    }

    currentUser = user;
    localStorage.setItem("user", JSON.stringify(user));

    // Atualizar topbar
    const profileName = document.querySelector(".profile-name");
    if (profileName) {
      profileName.textContent = user.username || "Utilizador";
    }

    // Atualizar avatar (imagem ou iniciais)
    updateAvatarDisplay(user);

    // Mostrar link Admin se autorizado
    if (window.showAdminLinkIfAuthorized) {
      window.showAdminLinkIfAuthorized();
    }
  } catch (error) {
    console.error("Erro ao carregar utilizador:", error);
    window.location.href = "auth.html";
  }
}

// ===============================
//  UPDATE AVATAR DISPLAY (Reutilizado de outras páginas)
// ===============================
function updateAvatarDisplay(user) {
  const avatar = document.querySelector(".avatar");
  if (!avatar) return;

  // Limpar conteúdo anterior
  avatar.innerHTML = "";

  // Se o utilizador tem avatar, mostrar imagem
  if (user.avatar && user.avatar.trim() !== "") {
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
//  LOAD SAVED EXERCISES
// ===============================
async function loadSavedExercises() {
  const container = document.getElementById("savedExercisesList");
  if (!container) return;

  // Mostrar loading
  container.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>A carregar exercícios guardados...</p>
    </div>
  `;

  try {
    const exercises = await apiGet("/auth/me/saved");
    savedExercises = Array.isArray(exercises) ? exercises : [];

    if (savedExercises.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
            </svg>
          </div>
          <h3>Ainda não tens exercícios guardados</h3>
          <p>Guarda exercícios que te interessam para os encontrares facilmente mais tarde.</p>
        </div>
      `;
      return;
    }

    renderSavedExercises(savedExercises);
  } catch (error) {
    console.error("Erro ao carregar exercícios guardados:", error);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        </div>
        <h3>Erro ao carregar exercícios</h3>
        <p>${error?.message || "Ocorreu um erro ao carregar os teus exercícios guardados."}</p>
        <button class="btn-primary" onclick="loadSavedExercises()" style="margin-top: 1rem;">Tentar novamente</button>
      </div>
    `;
  }
}

// ===============================
//  RENDER SAVED EXERCISES
// ===============================
function renderSavedExercises(exercises) {
  const container = document.getElementById("savedExercisesList");
  if (!container) return;

  container.innerHTML = "";

  exercises.forEach((ex) => {
    const preview =
      ex.description && ex.description.length > 150
        ? ex.description.substring(0, 150) + "..."
        : ex.description || "Sem descrição disponível.";

    const answersCount = ex.answersCount || 0;
    const votes = ex.votes || 0;

    // Renderizar tags
    const tagsHtml = ex.tags && ex.tags.length > 0
      ? `<div class="exercise-tags">
          ${ex.tags.map(tag => `<span class="exercise-tag">${tag}</span>`).join("")}
         </div>`
      : "";

    // Badge de anexos
    const attachmentsBadge = ex.attachments && ex.attachments.length > 0
      ? `<span class="badge-attachments" title="Com anexos">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
          </svg>
          Com anexos
        </span>`
      : "";

    // Formatar data
    const dateFormatted = new Date(ex.createdAt).toLocaleDateString("pt-PT", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    container.innerHTML += `
      <article class="exercise-card saved-card" data-exercise-id="${ex._id}">
        <div class="exercise-info" onclick="openExercise('${ex._id}')">
          <div class="exercise-header">
            <h3>${ex.title || "Sem título"}</h3>
          </div>

          <p class="subtitle">
            <span class="author">${ex.author?.username || "Anónimo"}</span>
            <span class="separator">•</span>
            <span class="subject">${ex.subject || "Geral"}</span>
            <span class="separator">•</span>
            <span class="time">${dateFormatted}</span>
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
                          return `
                            <img
                              src="http://localhost:5050${att.url}"
                              alt="${att.filename}"
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

          <p class="preview">${preview}</p>
        </div>

        <div class="exercise-meta">
          <span class="badge-subject">${ex.subject || "Geral"}</span>
          ${attachmentsBadge}
          <div class="meta-stats">
            <span class="meta-stat ${answersCount > 0 ? "has-answers" : ""}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              ${answersCount}
            </span>
            <span class="meta-stat">
              <svg viewBox="0 0 24 24" fill="currentColor" style="pointer-events: none;">
                <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
              </svg>
              ${votes}
            </span>
          </div>
        </div>

        <div class="saved-card-actions">
          <button 
            type="button" 
            class="btn-unsave-icon" 
            data-exercise-id="${ex._id}"
            aria-label="Tirar de guardado"
            title="Tirar de guardado">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="bookmark-icon">
              <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
            </svg>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="trash-icon">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
        </div>
      </article>
    `;
  });

  // Adicionar event listeners aos botões
  setupUnsaveButtons();
}

// ===============================
//  SETUP UNSAVE BUTTONS
// ===============================
function setupUnsaveButtons() {
  // Remover listeners antigos para evitar duplicados
  const unsaveButtons = document.querySelectorAll(".btn-unsave-icon");
  unsaveButtons.forEach((btn) => {
    // Clonar botão para remover listeners antigos
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    // Adicionar novo listener
    newBtn.addEventListener("click", async (e) => {
      e.stopPropagation(); // Impedir que o clique abra o exercício
      e.preventDefault();
      const exerciseId = newBtn.dataset.exerciseId;
      if (exerciseId) {
        await handleUnsave(exerciseId, newBtn);
      }
    });
  });
}

// ===============================
//  OPEN CONFIRM MODAL (Reutilizado de exercise.js)
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

    // Configurar conteúdo
    titleEl.textContent = title;
    messageEl.textContent = message;
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
//  HANDLE UNSAVE (DUPLA CONFIRMAÇÃO)
// ===============================
async function handleUnsave(exerciseId, buttonEl) {
  // Prevenir múltiplos cliques
  if (buttonEl.disabled || buttonEl.dataset.processing === "true") {
    return;
  }

  let originalContent = buttonEl.innerHTML; // Guardar conteúdo original
  
  try {
    // Confirmação
    const confirmed = await openConfirmModal({
      title: "Tirar de guardado?",
      message: "Tens a certeza que queres tirar este exercício dos guardados? Esta ação não apaga o exercício.",
      confirmText: "Sim, tirar",
      cancelText: "Cancelar",
      variant: "delete"
    });

    if (!confirmed) {
      return; // Usuário cancelou
    }

    // Marcar como processando
    buttonEl.dataset.processing = "true";
    buttonEl.disabled = true;
    buttonEl.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
        <path d="M21 12a9 9 0 11-6.219-8.56"/>
      </svg>
    `;

    // Fazer requisição
    await apiDelete(`/exercises/${exerciseId}/save`);

    // Remover card da UI com animação
    const card = buttonEl.closest(".saved-card");
    if (card) {
      card.style.transition = "opacity 0.3s ease, transform 0.3s ease";
      card.style.opacity = "0";
      card.style.transform = "translateY(-10px)";
      
      setTimeout(() => {
        card.remove();
        
        // Verificar se ficou vazio
        savedExercises = savedExercises.filter(ex => ex._id !== exerciseId);
        
        if (savedExercises.length === 0) {
          const container = document.getElementById("savedExercisesList");
          if (container) {
            container.innerHTML = `
              <div class="empty-state">
                <div class="empty-icon">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                  </svg>
                </div>
                <h3>Ainda não tens exercícios guardados</h3>
                <p>Guarda exercícios que te interessam para os encontrares facilmente mais tarde.</p>
              </div>
            `;
          }
        }
      }, 300);
    }
  } catch (error) {
    console.error("Erro ao remover dos guardados:", error);
    alert(error?.message || "Erro ao remover exercício dos guardados. Tenta novamente.");
    
    // Restaurar botão
    buttonEl.disabled = false;
    buttonEl.dataset.processing = "false";
    buttonEl.innerHTML = originalContent;
  }
}

// ===============================
//  OPEN EXERCISE
// ===============================
function openExercise(id) {
  window.location.href = `exercise.html?id=${id}`;
}

// ===============================
//  INITIALIZE
// ===============================
async function initSavedPage() {
  await loadLoggedUser();
  await loadSavedExercises();
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSavedPage);
} else {
  initSavedPage();
}

