const form = document.getElementById("createForm");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = form.title.value.trim();
    const description = form.description.value.trim();
    const subject = form.subject.value.trim();
    const tags = form.tags.value.split(",").map(t => t.trim());

    const res = await apiPost("/exercises", {
        title,
        description,
        subject,
        tags
    });

    if (res._id) {
        window.location.href = "index.html";
    } else {
        alert("Erro ao criar exercício");
    }
});
