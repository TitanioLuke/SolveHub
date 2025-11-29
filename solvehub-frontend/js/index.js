// ===============================
//   LOAD EXERCISES
// ===============================
async function loadExercises() {
    const container = document.getElementById("exerciseList");
    container.innerHTML = "";

    const exercises = await apiGet("/exercises");

    // EMPTY STATE
    if (!exercises || exercises.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <svg width="48" height="48" fill="none" stroke="#94a3b8" stroke-width="2">
                        <rect x="10" y="10" width="28" height="34" rx="4"/>
                        <path d="M10 20h28M10 28h28M10 36h18"/>
                    </svg>
                </div>
                <h3>Nenhum exercício encontrado</h3>
                <p>Ainda não existem exercícios disponíveis.</p>
            </div>
        `;
        return;
    }

    // EXERCISES FOUND
    exercises.forEach(ex => {
        const preview =
            ex.description.length > 120
                ? ex.description.substring(0, 120) + "..."
                : ex.description;

        container.innerHTML += `
            <article class="exercise-card" onclick="openExercise('${ex._id}')">

                <div class="exercise-info">
                    <h3>${ex.title}</h3>
                    <p class="subtitle">
                        Autor: ${ex.author.username} • ${ex.subject}
                    </p>
                    <p class="preview">${preview}</p>
                </div>

                <div class="exercise-meta">
                    <span class="badge">${ex.subject}</span>
                    <span class="meta-stat">${ex.answersCount || 0} respostas</span>
                    <span class="meta-stat">${ex.votes || 0} votos</span>
                    <span class="meta-time">${timeAgo(ex.updatedAt)}</span>
                </div>

            </article>
        `;
    });
}

// REDIRECT
function openExercise(id) {
    window.location.href = `exercise.html?id=${id}`;
}

// TIME AGO
function timeAgo(dateString) {
    const diff = (Date.now() - new Date(dateString)) / 1000;

    if (diff < 60) return "agora mesmo";
    if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
    return `há ${Math.floor(diff / 86400)} dias`;
}

loadExercises();
