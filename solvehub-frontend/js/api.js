const API_URL = "http://localhost:5050";

// ===============================
// TOKEN
// ===============================
function getToken() {
    return localStorage.getItem("token");
}

// ===============================
// HEADERS
// ===============================
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

// ===============================
// GET
// ===============================
async function apiGet(path) {
    const res = await fetch(API_URL + path, {
        method: "GET",
        headers: authHeaders()
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: `Erro na API (${res.status})` }));
        const error = new Error(errorData.message || `Erro na API (${res.status})`);
        error.status = res.status;
        throw error;
    }

    return res.json();
}

// ===============================
// POST
// ===============================
async function apiPost(path, body) {
    const res = await fetch(API_URL + path, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: `Erro na API (${res.status})` }));
        const error = new Error(errorData.message || `Erro na API (${res.status})`);
        error.status = res.status;
        throw error;
    }

    return res.json();
}

// ===============================
// POST WITH FILES (FormData)
// ===============================
async function apiPostFormData(path, formData) {
    const token = getToken();
    const headers = {};
    
    if (token) {
        headers.Authorization = "Bearer " + token;
    }
    // Não definir Content-Type - o browser define automaticamente com boundary para FormData

    const res = await fetch(API_URL + path, {
        method: "POST",
        headers: headers,
        body: formData
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: `Erro na API (${res.status})` }));
        const error = new Error(errorData.message || `Erro na API (${res.status})`);
        error.status = res.status;
        error.response = errorData;
        throw error;
    }

    return res.json();
}

// ===============================
// PUT
// ===============================
async function apiPut(path, body) {
    const res = await fetch(API_URL + path, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: `Erro na API (${res.status})` }));
        const error = new Error(errorData.message || `Erro na API (${res.status})`);
        error.status = res.status;
        throw error;
    }

    return res.json();
}

// ===============================
// DELETE
// ===============================
async function apiDelete(path) {
    const res = await fetch(API_URL + path, {
        method: "DELETE",
        headers: authHeaders()
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: `Erro na API (${res.status})` }));
        const error = new Error(errorData.message || `Erro na API (${res.status})`);
        error.status = res.status;
        throw error;
    }

    // DELETE pode não retornar conteúdo
    if (res.status === 204 || res.headers.get('content-length') === '0') {
        return null;
    }

    return res.json().catch(() => null);
}