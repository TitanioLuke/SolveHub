const profile = document.querySelector(".profile");
const menu = document.getElementById("profileMenu");

profile.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.toggle("hidden");
});

document.addEventListener("click", () => {
    menu.classList.add("hidden");
});
