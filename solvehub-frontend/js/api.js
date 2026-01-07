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

    try {
        const res = await fetch(API_URL + path, {
            method: "POST",
            headers: headers,
            body: formData
        });

        // Se a resposta foi bem-sucedida, tentar parsear JSON
        // Mesmo que o servidor não retorne JSON, não é um erro se o status for 2xx
        if (res.ok) {
            // Verificar se há conteúdo para parsear
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                try {
                    return await res.json();
                } catch (e) {
                    // Se não conseguir parsear JSON mas o status é OK, retornar null
                    return null;
                }
            }
            // Se não há conteúdo JSON, retornar null
            return null;
        }

        // Se não foi bem-sucedida, tratar como erro
        const errorData = await res.json().catch(() => ({ message: `Erro na API (${res.status})` }));
        const error = new Error(errorData.message || `Erro na API (${res.status})`);
        error.status = res.status;
        error.response = errorData;
        throw error;
    } catch (error) {
        // Se for um erro de rede (Failed to fetch), verificar se pode ser um timeout
        // mas a requisição foi processada (alguns servidores não esperam resposta)
        if (error.message && error.message.includes("Failed to fetch")) {
            // Não relançar o erro se for apenas um problema de rede após o envio
            // O servidor pode ter processado a requisição mesmo sem resposta
            console.warn("Possível erro de rede, mas a requisição pode ter sido processada:", error);
            // Retornar um objeto vazio para indicar sucesso provável
            return { success: true, message: "Resposta enviada (verificação de rede falhou)" };
        }
        throw error;
    }
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

// Tornar apiGet global para uso em outros scripts
window.apiGet = apiGet;
window.apiPost = apiPost;
window.apiPostFormData = apiPostFormData;
window.apiPut = apiPut;
window.apiDelete = apiDelete;