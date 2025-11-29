const params = new URLSearchParams(window.location.search);
const id = params.get("id");

async function loadExercise() {
    const data = await apiGet(`/exercises/${id}`);

    document.getElementById("title").textContent = data.title;
    document.getElementById("description").textContent = data.description;

    document.getElementById("meta").innerHTML = `
        Autor: ${data.author.username} | ${data.subject}
    `;
}

loadExercise();
