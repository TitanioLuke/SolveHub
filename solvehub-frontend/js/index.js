// ===============================
//   AUTH / USER CONFIG
// ===============================
const API_URL = "http://localhost:5050";
const token = localStorage.getItem("token");

async function authFetch(url, options = {}) {
    return fetch(`${API_URL}${url}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...(options.headers || {})
        }
    });
}

// ===============================
//   LOAD LOGGED USER (TOPBAR)
// ===============================
async function loadLoggedUser() {
    if (!token) {
        window.location.href = "auth.html";
        return;
    }

    try {
        const res = await authFetch("/auth/me");
        if (!res.ok) throw new Error("Não autenticado");

        const user = await res.json();

        // Cache local (opcional)
        localStorage.setItem("user", JSON.stringify(user));

        // Nome do utilizador
        const profileName = document.querySelector(".profile-name");
        if (profileName) {
            profileName.textContent = user.username;
        }

        // Avatar com iniciais automáticas
        const avatar = document.querySelector(".avatar");
        if (avatar && user.username) {
            const initials = user.username
                .trim()
                .split(" ")
                .map(word => word[0])
                .join("")
                .substring(0, 2)
                .toUpperCase();

            avatar.textContent = initials;
        }

    } catch (err) {
        console.error("Erro ao carregar utilizador:", err);
        localStorage.clear();
        window.location.href = "auth.html";
    }
}

// ===============================
//   GLOBAL STATE
// ===============================
let allExercises = [];
let currentSort = 'recent';
let currentFilter = null;

// ===============================
//   LOAD EXERCISES
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
        allExercises = exercises || [];

        updateStats(allExercises);
        container.innerHTML = "";

        if (!allExercises || allExercises.length === 0) {
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
        container.innerHTML = "";
    }
}

// ===============================
//   RENDER EXERCISES
// ===============================
function renderExercises(exercises) {
    const container = document.getElementById("exerciseList");
    container.innerHTML = "";

    exercises.forEach(ex => {
        const preview =
            ex.description && ex.description.length > 150
                ? ex.description.substring(0, 150) + "..."
                : ex.description || "Sem descrição disponível.";

        const answersCount = ex.answersCount || 0;
        const votes = ex.votes || 0;

        container.innerHTML += `
            <article class="exercise-card" onclick="openExercise('${ex._id}')">
                <div class="exercise-info">
                    <div class="exercise-header">
                        <h3>${ex.title}</h3>
                        ${answersCount === 0 ? '<span class="badge-new">Novo</span>' : ''}
                    </div>
                    <p class="subtitle">
                        <span class="author">${ex.author?.username || 'Anónimo'}</span>
                        <span class="separator">•</span>
                        <span class="subject">${ex.subject || 'Geral'}</span>
                        <span class="separator">•</span>
                        <span class="time">${timeAgo(ex.updatedAt || ex.createdAt)}</span>
                    </p>
                    <p class="preview">${preview}</p>
                </div>

                <div class="exercise-meta">
                    <span class="badge">${ex.subject || 'Geral'}</span>
                    <div class="meta-stats">
                        <span class="meta-stat ${answersCount > 0 ? 'has-answers' : ''}">
                            ${answersCount}
                        </span>
                        <span class="meta-stat">${votes}</span>
                    </div>
                </div>
            </article>
        `;
    });
}

// ===============================
//   UPDATE STATS
// ===============================
function updateStats(exercises) {
    const total = exercises.length;
    const solved = exercises.filter(ex => (ex.answersCount || 0) > 0).length;
    const pending = total - solved;

    document.getElementById('exerciseCount').textContent = total;
    document.getElementById('solvedCount').textContent = solved;
    document.getElementById('pendingCount').textContent = pending;
}

// ===============================
//   SORT FUNCTIONALITY
// ===============================
function sortExercises(type) {
    let sorted = [...allExercises];

    switch(type) {
        case 'recent':
            sorted.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
            break;
        case 'popular':
            sorted.sort((a, b) => (b.votes || 0) - (a.votes || 0));
            break;
        case 'answers':
            sorted.sort((a, b) => (b.answersCount || 0) - (a.answersCount || 0));
            break;
        case 'unanswered':
            sorted = sorted.filter(ex => (ex.answersCount || 0) === 0);
            break;
    }

    renderExercises(sorted);
}

// ===============================
//   SEARCH FUNCTIONALITY
// ===============================
const searchInput = document.getElementById("searchInput");
const clearSearch = document.getElementById("clearSearch");

if (searchInput) {
    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase();

        if (clearSearch) {
            clearSearch.classList.toggle('hidden', !query);
        }

        if (!query) {
            renderExercises(allExercises);
            return;
        }

        const filtered = allExercises.filter(ex => {
            const title = (ex.title || '').toLowerCase();
            const description = (ex.description || '').toLowerCase();
            const author = (ex.author?.username || '').toLowerCase();
            const subject = (ex.subject || '').toLowerCase();

            return title.includes(query) ||
                   description.includes(query) ||
                   author.includes(query) ||
                   subject.includes(query);
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
            renderExercises(filtered);
        }
    });

    if (clearSearch) {
        clearSearch.addEventListener('click', () => {
            searchInput.value = '';
            clearSearch.classList.add('hidden');
            renderExercises(allExercises);
            searchInput.focus();
        });
    }
}

// ===============================
//   SUBJECT FILTER
// ===============================
document.querySelectorAll('.tag[data-subject]').forEach(tag => {
    tag.addEventListener('click', () => {
        const subject = tag.dataset.subject;

        const filtered = allExercises.filter(ex =>
            (ex.subject || '').toLowerCase().includes(subject.toLowerCase())
        );

        renderExercises(filtered);

        const filterChips = document.getElementById('activeFilters');
        filterChips.innerHTML = `
            <div class="filter-chip">
                <span>Disciplina: ${subject}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" onclick="clearFilters()">
                    <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
            </div>
        `;
    });
});

function clearFilters() {
    document.getElementById('activeFilters').innerHTML = '';
    renderExercises(allExercises);
}

// ===============================
//   REDIRECT TO EXERCISE
// ===============================
function openExercise(id) {
    window.location.href = `exercise.html?id=${id}`;
}

// ===============================
//   TIME AGO FORMATTER
// ===============================
function timeAgo(dateString) {
    const diff = (Date.now() - new Date(dateString)) / 1000;

    if (diff < 60) return "agora mesmo";
    if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
    if (diff < 604800) return `há ${Math.floor(diff / 86400)} dias`;
    return new Date(dateString).toLocaleDateString('pt-PT');
}

// ===============================
//   PROFILE DROPDOWN TOGGLE
// ===============================
const profile = document.querySelector('.profile');
const dropdown = document.getElementById('profileMenu');

if (profile && dropdown) {
    profile.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
        if (!dropdown.classList.contains('hidden')) {
            dropdown.classList.add('hidden');
        }
    });

    dropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

// ===============================
//   LOGOUT FUNCTIONALITY
// ===============================
const logoutBtn = document.querySelector('.logout');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        if (confirm('Tens a certeza que queres terminar a sessão?')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'auth.html';
        }
    });
}

// ===============================
//   INITIALIZE
// ===============================
loadLoggedUser();
loadExercises();
