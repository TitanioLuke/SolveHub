const API_URL = "http://localhost:5050";

// Token guardado no localStorage
function getToken() {
    return localStorage.getItem("token");
}

// Headers com autorização
function authHeaders() {
    const headers = {
        "Content-Type": "application/json"
    };

    const token = getToken();
    if (token) {
        headers.Authorization = "Bearer " + token;
    }

    return headers;
}

// GET
async function apiGet(path) {
    const res = await fetch(API_URL + path, {
        method: "GET",
        headers: authHeaders()
    });

    if (!res.ok) {
        throw new Error("Erro na API");
    }

    return res.json();
}

// POST
async function apiPost(path, body) {
    const res = await fetch(API_URL + path, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        throw new Error("Erro na API");
    }

    return res.json();
}
