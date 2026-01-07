// ===============================
//  MY EXERCISES PAGE
// ===============================

let currentUser = null;
window.myExercises = [];

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
//  LOAD MY EXERCISES
// ===============================
async function loadMyExercises() {
  try {
    const exercises = await apiGet("/exercises");
    if (!exercises) {
      console.error("Erro ao carregar exercícios");
      return;
    }

    // Filtrar apenas os exercícios do utilizador logado
    const userId = currentUser?._id || currentUser?.id;
    window.myExercises = exercises.filter((ex) => {
      const authorId = ex.author?._id || ex.author?.id || ex.author;
      return authorId && authorId.toString() === userId.toString();
    });

    renderMyExercises();
  } catch (error) {
    console.error("Erro ao carregar meus exercícios:", error);
  }
}

// ===============================
//  RENDER MY EXERCISES
// ===============================
function renderMyExercises() {
  const container = document.getElementById("exerciseList");
  if (!container) return;

  container.innerHTML = "";

  if (window.myExercises.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 4rem 2rem; color: #6b7280;">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 1rem; opacity: 0.5;">
          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <h3 style="margin-bottom: 0.5rem; color: #374151;">Ainda não criaste exercícios</h3>
        <p style="margin: 0;">Cria o teu primeiro exercício na página principal!</p>
      </div>
    `;
    return;
  }

  window.myExercises.forEach((ex) => {
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

    container.innerHTML += `
      <article class="exercise-card my-exercise-card" data-exercise-id="${ex._id}">
        <div class="exercise-info" onclick="openExercise('${ex._id}')">
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
                      (att) => {
                        if (att.type === 'image') {
                          // Usar resolveUrl para URLs do Cloudinary ou anexos locais
                          const imageUrl = typeof resolveUrl !== 'undefined' ? resolveUrl(att.url) : (att.url && (att.url.startsWith('http://') || att.url.startsWith('https://')) ? att.url : `${typeof API_URL !== 'undefined' ? API_URL : 'http://localhost:5050'}${att.url}`);
                          return `
                            <img
                              src="${imageUrl}"
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

      </article>
    `;
  });
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
    img.src = typeof resolveUrl !== 'undefined' ? resolveUrl(user.avatar) : `${typeof API_URL !== 'undefined' ? API_URL : 'http://localhost:5050'}${user.avatar}`;
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
//  IS NEW EXERCISE
// ===============================
function isNewExercise(createdAt) {
  if (!createdAt) return false;
  const diff = (Date.now() - new Date(createdAt)) / 1000;
  return diff < 86400; // 24 horas
}

// ===============================
//  OPEN EXERCISE
// ===============================
window.openExercise = function(exerciseId) {
  window.location.href = `exercise.html?id=${exerciseId}`;
};

// ===============================
//  INIT MY EXERCISES PAGE
// ===============================
async function initMyExercisesPage() {
  await loadLoggedUser();
  await loadMyExercises();
}

// Inicializar quando a página carregar
document.addEventListener("DOMContentLoaded", () => {
  initMyExercisesPage();
});

