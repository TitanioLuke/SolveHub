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
    
    // LOADING STATE
    container.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>A carregar exercícios...</p>
        </div>
    `;

    try {
        const exercises = await apiGet("/exercises");
        allExercises = exercises || [];

        // Update stats
        updateStats(allExercises);

        // LIMPAR CONTAINER
        container.innerHTML = "";

        // EMPTY STATE
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
                    <p>Ainda não existem exercícios disponíveis. Sê o primeiro a criar um!</p>
                    <button class="btn-primary" onclick="window.location.href='create.html'">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 5v14M5 12h14"/>
                        </svg>
                        Criar primeiro exercício
                    </button>
                </div>
            `;
            return;
        }

        // RENDER EXERCISES
        renderExercises(allExercises);

    } catch (error) {
        console.error("Erro ao carregar exercícios:", error);
        // Remove error message display - stats will show 0 exercises
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
                        <span class="author">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                            </svg>
                            ${ex.author?.username || 'Anónimo'}
                        </span>
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
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                            </svg>
                            ${answersCount}
                        </span>
                        <span class="meta-stat">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
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
const sortBtn = document.getElementById('sortBtn');
const sortMenu = document.getElementById('sortMenu');

if (sortBtn && sortMenu) {
    sortBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sortMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
        if (!sortMenu.classList.contains('hidden')) {
            sortMenu.classList.add('hidden');
        }
    });

    sortMenu.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Sort items
    document.querySelectorAll('.dropdown-menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const sortType = item.dataset.sort;
            currentSort = sortType;

            // Update active state
            document.querySelectorAll('.dropdown-menu-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Update button text
            const btnText = item.textContent;
            sortBtn.querySelector('span').textContent = btnText;

            // Sort exercises
            sortExercises(sortType);
            sortMenu.classList.add('hidden');
        });
    });
}

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

        // Show/hide clear button
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
                    <div class="empty-icon">
                        <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
                            <circle cx="24" cy="24" r="18"/>
                            <path d="M21 21l6 6M27 21l-6 6"/>
                        </svg>
                    </div>
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

        // Show active filter chip
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
loadExercises();