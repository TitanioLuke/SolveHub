// ===============================
//   THEME LOADER (Global - usar sistema centralizado)
// ===============================
// O tema é carregado pelo theme.js no head
// Se theme.js não estiver disponível, usar fallback
if (!window.getTheme) {
    window.getTheme = () => localStorage.getItem('theme') || 'light';
    window.setTheme = (theme) => {
        localStorage.setItem('theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
    };
    window.initTheme = () => {
        const theme = window.getTheme();
        window.setTheme(theme);
    };
    window.initTheme();
}

// Dropdown do perfil
const profile = document.querySelector(".profile");
const menu = document.getElementById("profileMenu");

// Proteção para páginas sem dropdown
if (profile && menu) {

    profile.addEventListener("click", (e) => {
        e.stopPropagation();
        menu.classList.toggle("hidden");
    });

    document.addEventListener("click", () => {
        menu.classList.add("hidden");
    });
}

// Logout handler
const logoutBtn = document.querySelector(".logout");

if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("token");
        window.location.href = "auth.html";
    });
}

// ===============================
//  SHOW ADMIN LINK (Centralizado)
// ===============================
// Tornar a função global para poder ser chamada por outras páginas
window.showAdminLinkIfAuthorized = function() {
    // Verificar se já existe o item do menu admin
    let adminMenuItem = document.getElementById("adminMenuItem");
    
    // Se não existe, criar
    if (!adminMenuItem) {
        const menus = document.querySelectorAll(".menu");
        const firstMenu = menus[0]; // Primeiro menu (Menu Principal)
        
        if (firstMenu) {
            adminMenuItem = document.createElement("a");
            adminMenuItem.id = "adminMenuItem";
            adminMenuItem.className = "menu-item";
            adminMenuItem.href = "admin.html";
            adminMenuItem.style.display = "none"; // Escondido por padrão
            adminMenuItem.innerHTML = `
                <svg class="icon" stroke="currentColor" viewBox="0 0 24 24" fill="none">
                    <path stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
                Admin
            `;
            firstMenu.appendChild(adminMenuItem);
        }
    }
    
    // Verificar role do utilizador
    const userStr = localStorage.getItem("user");
    if (userStr && adminMenuItem) {
        try {
            const user = JSON.parse(userStr);
            const role = (user.role || "").toUpperCase();
            
            if (role === "ADMIN") {
                adminMenuItem.style.display = "flex";
            } else {
                adminMenuItem.style.display = "none";
            }
        } catch (err) {
            console.error("Erro ao verificar role:", err);
            adminMenuItem.style.display = "none";
        }
    } else if (adminMenuItem) {
        adminMenuItem.style.display = "none";
    }
};

// Executar quando o DOM estiver pronto
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showAdminLinkIfAuthorized);
} else {
    showAdminLinkIfAuthorized();
}

// Também executar quando o utilizador for carregado (para páginas que carregam o user depois)
// Usar um observer ou timeout para verificar periodicamente
setTimeout(showAdminLinkIfAuthorized, 500);
setTimeout(showAdminLinkIfAuthorized, 1000);