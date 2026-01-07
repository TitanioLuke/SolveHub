// ===============================
//  ADMIN MODULE
// ===============================

let currentUser = null;
let currentTab = 'subjects';
let currentEditId = null;
let currentReportTarget = null;
let currentRoleUserId = null;

// ===============================
//  INITIALIZE
// ===============================
async function initAdmin() {
    await loadLoggedUser();
    checkAdminAccess();
    setupEventListeners();
    loadTab(currentTab);
}

// ===============================
//  LOAD LOGGED USER
// ===============================
async function loadLoggedUser() {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "auth.html";
        return;
    }

    try {
        const user = await apiGet("/auth/me");
        currentUser = user;
        localStorage.setItem("user", JSON.stringify(user));

        const profileName = document.querySelector(".profile-name");
        if (profileName) {
            profileName.textContent = user.username || "Utilizador";
        }

        updateAvatarDisplay(user);

        const role = (user.role || "").toUpperCase();
        if (role === "ADMIN") {
            const adminMenuItem = document.getElementById("adminMenuItem");
            if (adminMenuItem) {
                adminMenuItem.style.display = "flex";
            }
        }

        // Também chamar a função global centralizada
        if (window.showAdminLinkIfAuthorized) {
            window.showAdminLinkIfAuthorized();
        }
    } catch (err) {
        console.error("Erro ao carregar utilizador:", err);
        if (err.status === 401 || err.status === 403) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "auth.html";
        }
    }
}

// ===============================
//  UPDATE AVATAR DISPLAY
// ===============================
function updateAvatarDisplay(user) {
    const avatar = document.querySelector(".avatar");
    if (!avatar) return;

    if (user.avatar && user.avatar.trim() !== "") {
        avatar.innerHTML = `<img src="http://localhost:5050${user.avatar}" alt="${user.username}" />`;
    } else {
        const initials = user.username
            ? user.username.trim().split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase()
            : "A";
        avatar.textContent = initials;
    }
}

// ===============================
//  CHECK ADMIN ACCESS
// ===============================
function checkAdminAccess() {
    if (!currentUser) {
        alert("Sem permissões para aceder a esta página.");
        window.location.href = "index.html";
        return;
    }
    
    const role = (currentUser.role || "").toUpperCase();
    const isAdmin = role === "ADMIN";
    
    if (!isAdmin) {
        alert("Sem permissões para aceder a esta página.");
        window.location.href = "index.html";
        return;
    }
}

// ===============================
//  SETUP EVENT LISTENERS
// ===============================
function setupEventListeners() {
    // Tabs
    document.querySelectorAll(".admin-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            const tabName = tab.dataset.tab;
            switchTab(tabName);
        });
    });

    // Create buttons
    document.getElementById("createSubjectBtn")?.addEventListener("click", () => openEditModal("subject", null));

    // Edit modal
    const editModal = document.getElementById("editModal");
    document.getElementById("editModalClose")?.addEventListener("click", closeEditModal);
    document.getElementById("editModalCancel")?.addEventListener("click", closeEditModal);
    document.getElementById("editForm")?.addEventListener("submit", handleEditSubmit);
    editModal?.addEventListener("click", (e) => {
        if (e.target === editModal) {
            closeEditModal();
        }
    });

    // Report modal
    const reportModal = document.getElementById("reportModal");
    document.getElementById("reportModalClose")?.addEventListener("click", closeReportModal);
    document.getElementById("reportModalCancel")?.addEventListener("click", closeReportModal);
    document.getElementById("reportForm")?.addEventListener("submit", handleReportSubmit);
    document.getElementById("reportDetailsTextarea")?.addEventListener("input", (e) => {
        document.getElementById("reportCharCount").textContent = e.target.value.length;
    });
    reportModal?.addEventListener("click", (e) => {
        if (e.target === reportModal) {
            closeReportModal();
        }
    });

    // Role modal
    const roleModal = document.getElementById("roleModal");
    document.getElementById("roleModalClose")?.addEventListener("click", closeRoleModal);
    document.getElementById("roleModalCancel")?.addEventListener("click", closeRoleModal);
    document.getElementById("roleForm")?.addEventListener("submit", handleRoleSubmit);
    roleModal?.addEventListener("click", (e) => {
        if (e.target === roleModal) {
            closeRoleModal();
        }
    });

    // Filters
    document.getElementById("reportTypeFilter")?.addEventListener("change", () => loadReports());
    document.getElementById("reportStatusFilter")?.addEventListener("change", () => loadReports());

    // Search
    const searchInput = document.getElementById("userSearchInput");
    const clearSearchBtn = document.getElementById("clearSearchBtn");
    
    if (searchInput) {
        let searchTimeout;
        
        const updateClearButton = () => {
            if (clearSearchBtn) {
                if (searchInput.value.trim()) {
                    clearSearchBtn.style.display = "block";
                } else {
                    clearSearchBtn.style.display = "none";
                }
            }
        };
        
        searchInput.addEventListener("input", (e) => {
            clearTimeout(searchTimeout);
            const searchTerm = e.target.value.trim();
            updateClearButton();
            searchTimeout = setTimeout(() => {
                loadUsers(searchTerm);
            }, 300);
        });
        
        // Permitir pesquisa ao pressionar Enter
        searchInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                clearTimeout(searchTimeout);
                loadUsers(e.target.value.trim());
            }
        });
        
        // Botão limpar pesquisa
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener("click", () => {
                searchInput.value = "";
                updateClearButton();
                loadUsers("");
            });
        }
    }

    // Profile dropdown
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
    }

    // Logout
    document.querySelector(".logout")?.addEventListener("click", () => {
        if (confirm("Tens a certeza que queres terminar a sessão?")) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "auth.html";
        }
    });
}

// ===============================
//  TAB SWITCHING
// ===============================
function switchTab(tabName) {
    currentTab = tabName;

    document.querySelectorAll(".admin-tab").forEach(tab => {
        tab.classList.toggle("active", tab.dataset.tab === tabName);
    });

    document.querySelectorAll(".admin-tab-content").forEach(content => {
        content.classList.toggle("active", content.id === `tab-${tabName}`);
    });

    loadTab(tabName);
}

function loadTab(tabName) {
    switch (tabName) {
        case "subjects":
            loadSubjects();
            break;
        case "reports":
            loadReports();
            break;
        case "roles":
            // Carregar todos os utilizadores por padrão (sem pesquisa)
            loadUsers("");
            break;
    }
}

// ===============================
//  SUBJECTS CRUD
// ===============================
async function loadSubjects() {
    const container = document.getElementById("subjectsList");
    if (!container) return;

    container.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>A carregar disciplinas...</p>
        </div>
    `;

    try {
        const subjects = await apiGet("/admin/subjects");
        
        if (subjects.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <h3>Nenhuma disciplina encontrada</h3>
                    <p>Cria a primeira disciplina para começar.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = subjects.map(subject => `
            <div class="admin-item">
                <div class="admin-item-info">
                    <div class="admin-item-title">
                        ${escapeHtml(subject.name)}
                        ${subject.isPopular ? '<span class="badge-popular" title="Disciplina Popular">⭐</span>' : ''}
                    </div>
                    <div class="admin-item-meta">
                        <span>Criado: ${formatDate(subject.createdAt)}</span>
                        ${subject.exerciseCount !== undefined ? `<span>Exercícios: ${subject.exerciseCount}</span>` : ''}
                        ${subject.isPopular ? '<span style="color: var(--primary);">⭐ Popular</span>' : ''}
                    </div>
                </div>
                <div class="admin-item-actions">
                    <button class="admin-item-btn" onclick="openEditModal('subject', '${subject._id}')">Editar</button>
                    <button class="admin-item-btn delete" onclick="deleteSubject('${subject._id}')">Remover</button>
                </div>
            </div>
        `).join("");
    } catch (err) {
        console.error("Erro ao carregar disciplinas:", err);
        container.innerHTML = `
            <div class="empty-state">
                <h3>Erro ao carregar disciplinas</h3>
                <p>${err.message || "Tenta novamente mais tarde."}</p>
            </div>
        `;
    }
}

function openEditModal(type, id) {
    currentEditId = id;
    const modal = document.getElementById("editModal");
    const title = document.getElementById("editModalTitle");
    const input = document.getElementById("editNameInput");

    const isPopularInput = document.getElementById("editIsPopularInput");
    
    if (id) {
        title.textContent = "Editar disciplina";
        loadEditData(id);
    } else {
        title.textContent = "Criar disciplina";
        input.value = "";
        if (isPopularInput) isPopularInput.checked = false;
    }

    modal.classList.remove("hidden");
    input.focus();
}

async function loadEditData(id) {
    try {
        const endpoint = `/admin/subjects/${id}`;
        const data = await apiGet(endpoint);
        document.getElementById("editNameInput").value = data.name || "";
        const isPopularInput = document.getElementById("editIsPopularInput");
        if (isPopularInput) {
            isPopularInput.checked = data.isPopular === true;
        }
    } catch (err) {
        console.error("Erro ao carregar dados:", err);
        alert(err.message || "Erro ao carregar dados.");
    }
}

function closeEditModal() {
    document.getElementById("editModal").classList.add("hidden");
    currentEditId = null;
    document.getElementById("editForm").reset();
}

async function handleEditSubmit(e) {
    e.preventDefault();
    const name = document.getElementById("editNameInput").value.trim();
    const isPopularInput = document.getElementById("editIsPopularInput");
    const isPopular = isPopularInput ? isPopularInput.checked : false;

    if (!name) {
        alert("O nome é obrigatório.");
        return;
    }

    if (name.length > 100) {
        alert("O nome não pode ter mais de 100 caracteres.");
        return;
    }

    const submitBtn = document.getElementById("editModalSubmit");
    submitBtn.disabled = true;
    submitBtn.textContent = "A guardar...";

    try {
        if (currentEditId) {
            await apiPut(`/admin/subjects/${currentEditId}`, { name, isPopular });
        } else {
            await apiPost(`/admin/subjects`, { name, isPopular });
        }
        
        // Limpar cache de subjects para forçar refresh
        if (window.clearSubjectsCache) {
            window.clearSubjectsCache();
        }

        closeEditModal();
        loadTab(currentTab);
    } catch (err) {
        console.error("Erro ao guardar:", err);
        alert(err.message || "Erro ao guardar.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Guardar";
    }
}

async function deleteSubject(id) {
    const confirmed = await openConfirmModal({
        title: "Remover disciplina?",
        message: "Tens a certeza que queres remover esta disciplina? Esta ação não pode ser desfeita.",
        confirmText: "Remover",
        variant: "delete"
    });

    if (!confirmed) return;

    try {
        await apiDelete(`/admin/subjects/${id}`);
        loadSubjects();
        // Limpar cache de subjects para forçar refresh
        if (window.clearSubjectsCache) {
            window.clearSubjectsCache();
        }
    } catch (err) {
        console.error("Erro ao remover disciplina:", err);
        alert(err.message || "Erro ao remover disciplina.");
    }
}

// ===============================
//  REPORTS
// ===============================
async function loadReports() {
    const container = document.getElementById("reportsList");
    if (!container) return;

    container.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>A carregar reports...</p>
        </div>
    `;

    try {
        const typeFilter = document.getElementById("reportTypeFilter")?.value || "";
        const statusFilter = document.getElementById("reportStatusFilter")?.value || "";
        
        let url = "/admin/reports";
        const params = new URLSearchParams();
        if (typeFilter) params.append("type", typeFilter);
        if (statusFilter) params.append("status", statusFilter);
        if (params.toString()) url += "?" + params.toString();

        const reports = await apiGet(url);
        
        if (reports.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10 9 9 9 8 9"/>
                    </svg>
                    <h3>Nenhum report encontrado</h3>
                    <p>Não há reports para mostrar.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = reports.map(report => {
            const statusClass = report.status === "RESOLVIDO" ? "resolved" : "pending";
            const typeLabel = report.targetType === "EXERCISE" ? "Exercício" : "Comentário";
            
            // Informação do target reportado
            let targetInfo = "";
            if (report.targetType === "EXERCISE" && report.target) {
                targetInfo = `
                    <div class="report-target-info">
                        <strong>Exercício reportado:</strong>
                        <div class="report-target-content">
                            <div class="report-target-title">${escapeHtml(report.target.title || "Sem título")}</div>
                            ${report.target.description ? `<div class="report-target-description">${escapeHtml(report.target.description)}</div>` : ""}
                        </div>
                    </div>
                `;
            } else if (report.targetType === "ANSWER" && report.target) {
                // Obter título do exercício (pode ser objeto populado ou ID)
                let exerciseTitle = "Exercício";
                if (report.exerciseId) {
                    if (typeof report.exerciseId === "object" && report.exerciseId.title) {
                        exerciseTitle = report.exerciseId.title;
                    } else if (typeof report.exerciseId === "string") {
                        exerciseTitle = "Exercício (ID: " + report.exerciseId.substring(0, 8) + "...)";
                    }
                }
                
                targetInfo = `
                    <div class="report-target-info">
                        <strong>Comentário reportado:</strong>
                        <div class="report-target-content">
                            <div class="report-target-meta">No exercício: <em>${escapeHtml(exerciseTitle)}</em></div>
                            <div class="report-target-meta">Por: <em>${escapeHtml(report.target.author || "Anónimo")}</em></div>
                            <div class="report-target-description">${escapeHtml(report.target.content || "Sem conteúdo")}</div>
                        </div>
                    </div>
                `;
            }
            
            return `
                <div class="report-item" onclick="openReportTarget('${report._id}', '${report.targetType}', '${report.targetId}', '${report.exerciseId?._id || report.exerciseId || ""}')">
                    <div class="report-item-header">
                        <div>
                            <span class="report-item-title">${escapeHtml(report.reason)}</span>
                            <span class="report-item-badge type">${typeLabel}</span>
                            <span class="report-item-badge status ${statusClass}">${report.status}</span>
                        </div>
                    </div>
                    ${targetInfo}
                    <div class="report-item-details">
                        <strong>Detalhes do report:</strong>
                        ${report.details ? escapeHtml(report.details) : "<em>Sem detalhes adicionais</em>"}
                    </div>
                    <div class="report-item-meta">
                        <span>Reportado por: ${escapeHtml(report.reporter?.username || "Desconhecido")}</span>
                        <span>Data: ${formatDate(report.createdAt)}</span>
                    </div>
                    <div class="report-item-actions" onclick="event.stopPropagation()">
                        ${report.status === "PENDENTE" ? `
                            <button class="admin-item-btn" onclick="resolveReport('${report._id}')">Marcar como resolvido</button>
                        ` : ""}
                        <button class="admin-item-btn delete" onclick="deleteReport('${report._id}')">Remover</button>
                    </div>
                </div>
            `;
        }).join("");
    } catch (err) {
        console.error("Erro ao carregar reports:", err);
        container.innerHTML = `
            <div class="empty-state">
                <h3>Erro ao carregar reports</h3>
                <p>${err.message || "Tenta novamente mais tarde."}</p>
            </div>
        `;
    }
}

function openReportTarget(reportId, targetType, targetId, exerciseId) {
    if (targetType === "EXERCISE") {
        window.location.href = `exercise.html?id=${targetId}`;
    } else if (targetType === "ANSWER") {
        // Se exerciseId for um objeto com _id, usar o _id
        const exerciseIdValue = exerciseId?._id || exerciseId || "";
        const url = exerciseIdValue ? `exercise.html?id=${exerciseIdValue}&highlightAnswerId=${targetId}` : `exercise.html?highlightAnswerId=${targetId}`;
        window.location.href = url;
    }
}

async function resolveReport(id) {
    try {
        await apiPut(`/admin/reports/${id}`, { status: "RESOLVIDO" });
        loadReports();
    } catch (err) {
        console.error("Erro ao resolver report:", err);
        alert(err.message || "Erro ao resolver report.");
    }
}

// Make functions global
window.openEditModal = openEditModal;
window.deleteSubject = deleteSubject;
window.openReportTarget = openReportTarget;
window.resolveReport = resolveReport;
window.deleteReport = deleteReport;
window.openRoleModal = openRoleModal;

async function deleteReport(id) {
    const confirmed = await openConfirmModal({
        title: "Remover report?",
        message: "Tens a certeza que queres remover este report?",
        confirmText: "Remover",
        variant: "delete"
    });

    if (!confirmed) return;

    try {
        await apiDelete(`/admin/reports/${id}`);
        loadReports();
    } catch (err) {
        console.error("Erro ao remover report:", err);
        alert(err.message || "Erro ao remover report.");
    }
}

// ===============================
//  ROLES
// ===============================
async function loadUsers(search = "") {
    const container = document.getElementById("rolesList");
    if (!container) return;

    container.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>A carregar utilizadores...</p>
        </div>
    `;

    try {
        let url = "/admin/users";
        if (search) {
            url += "?search=" + encodeURIComponent(search);
        }

        const users = await apiGet(url);
        
        // Filtrar utilizadores por role (case-insensitive)
        // Apenas ALUNO e ADMIN existem
        const admins = users.filter(u => {
            const role = (u.role || "").toUpperCase();
            return role === "ADMIN";
        });
        const alunos = users.filter(u => {
            const role = (u.role || "").toUpperCase();
            return role === "ALUNO" || role === "USER" || (!role || role === "");
        });

        if (users.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <h3>Nenhum utilizador encontrado</h3>
                    <p>${search ? "Tenta uma pesquisa diferente." : "Não há utilizadores para mostrar."}</p>
                </div>
            `;
            return;
        }

        let html = "";
        
        // Mostrar contador total se houver pesquisa
        if (search) {
            html += `<div style="margin-bottom: 20px; padding: 12px; background: var(--surface-2); border-radius: 8px; border: 1px solid var(--border);">
                <span style="font-size: 14px; color: var(--text-muted);">Encontrados <strong style="color: var(--text);">${users.length}</strong> utilizador${users.length !== 1 ? "es" : ""}</span>
            </div>`;
        }

        if (admins.length > 0) {
            html += `<h3 style="font-size: 18px; font-weight: 600; color: var(--text); margin: 24px 0 16px 0;">Admins (${admins.length})</h3>`;
            html += renderUserList(admins);
        }

        if (alunos.length > 0) {
            html += `<h3 style="font-size: 18px; font-weight: 600; color: var(--text); margin: 24px 0 16px 0;">Alunos (${alunos.length})</h3>`;
            html += renderUserList(alunos);
        }

        container.innerHTML = html;
    } catch (err) {
        console.error("Erro ao carregar utilizadores:", err);
        container.innerHTML = `
            <div class="empty-state">
                <h3>Erro ao carregar utilizadores</h3>
                <p>${err.message || "Tenta novamente mais tarde."}</p>
            </div>
        `;
    }
}

function renderUserList(users) {
    return users.map(user => {
        const roleUpper = (user.role || "USER").toUpperCase();
        const roleClass = roleUpper.toLowerCase();
        const roleLabel = roleUpper;
        
        return `
            <div class="user-item">
                <div class="user-item-info">
                    <div class="user-item-name">${escapeHtml(user.username || "Sem nome")}</div>
                    <div class="user-item-email">${escapeHtml(user.email || "")}</div>
                    <span class="user-item-role ${roleClass}">${roleLabel}</span>
                </div>
                <div class="user-item-actions">
                    <button class="admin-item-btn" onclick="openRoleModal('${user._id}', '${user.role || "ALUNO"}')">Alterar role</button>
                </div>
            </div>
        `;
    }).join("");
}

function openRoleModal(userId, currentRole) {
    currentRoleUserId = userId;
    const modal = document.getElementById("roleModal");
    const select = document.getElementById("roleSelect");
    
    // Normalizar role para maiúsculas e garantir que seja ALUNO ou ADMIN
    const normalizedRole = (currentRole || "ALUNO").toUpperCase();
    select.value = (normalizedRole === "ADMIN" || normalizedRole === "ALUNO") ? normalizedRole : "ALUNO";
    modal.classList.remove("hidden");
}

function closeRoleModal() {
    document.getElementById("roleModal").classList.add("hidden");
    currentRoleUserId = null;
}

async function handleRoleSubmit(e) {
    e.preventDefault();
    const role = document.getElementById("roleSelect").value;

    if (!currentRoleUserId) return;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "A guardar...";

    try {
        await apiPut(`/admin/users/${currentRoleUserId}/role`, { role });
        closeRoleModal();
        loadUsers(document.getElementById("userSearchInput")?.value || "");
    } catch (err) {
        console.error("Erro ao alterar role:", err);
        alert(err.message || "Erro ao alterar role.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Guardar";
    }
}

// ===============================
//  REPORT MODAL (for users)
// ===============================
function openReportModal(targetType, targetId) {
    if (!currentUser) {
        window.location.href = "auth.html";
        return;
    }

    currentReportTarget = { type: targetType, id: targetId };
    const modal = document.getElementById("reportModal");
    document.getElementById("reportForm").reset();
    document.getElementById("reportCharCount").textContent = "0";
    modal.classList.remove("hidden");
}

function closeReportModal() {
    document.getElementById("reportModal").classList.add("hidden");
    currentReportTarget = null;
    document.getElementById("reportForm").reset();
}

async function handleReportSubmit(e) {
    e.preventDefault();
    const reason = document.getElementById("reportReasonSelect").value;
    const details = document.getElementById("reportDetailsTextarea").value.trim();

    if (!reason) {
        alert("Seleciona um motivo.");
        return;
    }

    if (!currentReportTarget) return;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "A enviar...";

    try {
        await apiPost("/reports", {
            targetType: currentReportTarget.type,
            targetId: currentReportTarget.id,
            reason,
            details: details || undefined
        });

        closeReportModal();
        alert("Report enviado com sucesso. Obrigado!");
    } catch (err) {
        console.error("Erro ao enviar report:", err);
        alert(err.message || "Erro ao enviar report.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Enviar";
    }
}

// ===============================
//  CONFIRM MODAL
// ===============================
function openConfirmModal({ title, message, confirmText = "Confirmar", cancelText = "Cancelar", variant = "primary" }) {
    return new Promise((resolve) => {
        const modal = document.getElementById("confirmModal");
        const titleEl = document.getElementById("confirmModalTitle");
        const messageEl = document.getElementById("confirmModalMessage");
        const confirmBtn = document.getElementById("confirmModalConfirm");
        const cancelBtn = document.getElementById("confirmModalCancel");

        if (!modal || !titleEl || !messageEl || !confirmBtn || !cancelBtn) {
            resolve(false);
            return;
        }

        titleEl.textContent = title;
        messageEl.textContent = message;
        confirmBtn.textContent = confirmText;
        cancelBtn.textContent = cancelText;

        confirmBtn.className = `btn-primary ${variant === "delete" ? "delete" : ""}`;

        const newConfirmBtn = confirmBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        const closeModal = (result) => {
            modal.classList.add("hidden");
            resolve(result);
        };

        newConfirmBtn.addEventListener("click", () => closeModal(true));
        newCancelBtn.addEventListener("click", () => closeModal(false));

        const overlayHandler = (e) => {
            if (e.target === modal) {
                closeModal(false);
                modal.removeEventListener("click", overlayHandler);
            }
        };
        modal.addEventListener("click", overlayHandler);

        modal.classList.remove("hidden");
    });
}

// ===============================
//  UTILITIES
// ===============================
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-PT", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

// ===============================
//  INITIALIZE ON LOAD
// ===============================
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAdmin);
} else {
    initAdmin();
}

