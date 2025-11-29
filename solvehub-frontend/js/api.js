const API_BASE = "http://127.0.0.1:5050";

// Token guardado no localStorage
function getToken() {
    return localStorage.getItem("token");
}

// Headers com autorização
function authHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + getToken()
    };
}

// GET
async function apiGet(path) {
    const res = await fetch(API_BASE + path, {
        method: "GET",
        headers: authHeaders()
    });
    return res.json();
}

// POST
async function apiPost(path, body) {
    const res = await fetch(API_BASE + path, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body)
    });
    return res.json();
}
