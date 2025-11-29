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
