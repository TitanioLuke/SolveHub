/* ===============================
   SELECTORS
================================ */
const leftSide = document.getElementById("leftSide");
const rightSide = document.getElementById("rightSide");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

const brandLeft = document.getElementById("brandLeft");
const brandRight = document.getElementById("brandRight");

const toRegister = document.getElementById("toRegister");
const toLogin = document.getElementById("toLogin");

const loginError = document.getElementById("loginError");
const registerError = document.getElementById("registerError");

const API_URL = "http://localhost:5050";
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validation flags
let validLength = false;
let validUpper = false;
let validNumber = false;
let validSymbol = false;

/* ===============================
   VIEW SWITCHING
================================ */
function showLogin() {
    leftSide.classList.add("brand-bg");
    leftSide.classList.remove("form-bg");

    rightSide.classList.add("form-bg");
    rightSide.classList.remove("brand-bg");

    brandLeft.classList.remove("hidden");
    loginForm.classList.remove("hidden");

    registerForm.classList.add("hidden");
    brandRight.classList.add("hidden");

    clearMessages();
}

function showRegister() {
    leftSide.classList.add("form-bg");
    leftSide.classList.remove("brand-bg");

    rightSide.classList.add("brand-bg");
    rightSide.classList.remove("form-bg");

    registerForm.classList.remove("hidden");
    brandRight.classList.remove("hidden");

    loginForm.classList.add("hidden");
    brandLeft.classList.add("hidden");

    clearMessages();
}

function clearMessages() {
    loginError.textContent = "";
    registerError.textContent = "";
    loginError.style.background = "";
    loginError.style.color = "";
    registerError.style.background = "";
    registerError.style.color = "";
}

toRegister.addEventListener("click", showRegister);
toLogin.addEventListener("click", showLogin);

// Initialize
showLogin();

/* ===============================
   PASSWORD VALIDATION
================================ */
const passwordInput = document.getElementById("reg_password");
const passwordContainer = document.getElementById("passwordContainer");
const statusText = document.getElementById("passwordStatus");

const ruleLength = document.getElementById("rule-length");
const ruleUpper = document.getElementById("rule-upper");
const ruleNumber = document.getElementById("rule-number");
const ruleSymbol = document.getElementById("rule-symbol");

passwordInput.addEventListener("input", () => {
    const value = passwordInput.value;

    if (value.length === 0) {
        passwordContainer.classList.add("hidden");
        statusText.textContent = "";
        return;
    }

    passwordContainer.classList.remove("hidden");

    validLength = /.{8,}/.test(value);
    validUpper = /[A-Z]/.test(value);
    validNumber = /\d/.test(value);
    validSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(value);

    ruleLength.style.display = validLength ? "none" : "flex";
    ruleUpper.style.display = validUpper ? "none" : "flex";
    ruleNumber.style.display = validNumber ? "none" : "flex";
    ruleSymbol.style.display = validSymbol ? "none" : "flex";

    const missing = [
        !validLength,
        !validUpper,
        !validNumber,
        !validSymbol
    ].filter(Boolean).length;

    if (missing === 0) {
        statusText.textContent = "✓ Password forte!";
        statusText.style.color = "#16a34a";
    } else if (missing === 1) {
        statusText.textContent = "⚠ Quase lá… falta 1 requisito.";
        statusText.style.color = "#f59e0b";
    } else {
        statusText.textContent = "✗ Password fraca (faltam vários requisitos).";
        statusText.style.color = "#dc2626";
    }
});

/* ===============================
   TOGGLE PASSWORD VISIBILITY
================================ */
const togglePass = document.getElementById("togglePass");
const eyeIcon = document.getElementById("eyeIcon");

togglePass.addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";
    passwordInput.type = isPassword ? "text" : "password";
    
    // Update icon
    eyeIcon.innerHTML = isPassword 
        ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/><line x1="1" y1="1" x2="23" y2="23"/>'
        : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
});

const loginPasswordInput = document.getElementById("login_password");
const togglePassLogin = document.getElementById("togglePassLogin");
const eyeIconLogin = document.getElementById("eyeIconLogin");

togglePassLogin.addEventListener("click", () => {
    const isPassword = loginPasswordInput.type === "password";
    loginPasswordInput.type = isPassword ? "text" : "password";
    
    eyeIconLogin.innerHTML = isPassword 
        ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/><line x1="1" y1="1" x2="23" y2="23"/>'
        : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
});

/* ===============================
   SHOW MESSAGE
================================ */
function showMessage(element, message, isError = true) {
    element.textContent = message;
    
    if (isError) {
        element.style.background = "#fef2f2";
        element.style.color = "#dc2626";
        element.style.border = "1px solid #fecaca";
    } else {
        element.style.background = "#f0fdf4";
        element.style.color = "#16a34a";
        element.style.border = "1px solid #bbf7d0";
    }
}

/* ===============================
   REGISTER
================================ */
document.getElementById("registerBtn").addEventListener("click", async () => {
    const username = reg_username.value.trim();
    const email = reg_email.value.trim();
    const password = reg_password.value.trim();

    // Clear previous errors
    registerError.textContent = "";

    // Validation
    if (!username || !email || !password) {
        showMessage(registerError, "Por favor, preenche todos os campos.");
        return;
    }

    if (username.length < 3) {
        showMessage(registerError, "O nome de utilizador deve ter pelo menos 3 caracteres.");
        return;
    }

    if (!emailRegex.test(email)) {
        showMessage(registerError, "Email inválido.");
        return;
    }

    const strongPassword = validLength && validUpper && validNumber && validSymbol;

    if (!strongPassword) {
        showMessage(registerError, "A palavra-passe não cumpre os requisitos de segurança.");
        return;
    }

    // Show loading state
    const btn = document.getElementById("registerBtn");
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span>A criar conta...</span>';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({username, email, password})
        });

        const data = await res.json();

        if (!res.ok) {
            showMessage(registerError, data.message || "Erro ao criar conta.");
            btn.innerHTML = originalText;
            btn.disabled = false;
            return;
        }

        // Success - switch to login
        showLogin();
        showMessage(loginError, "✓ Conta criada com sucesso! Faz login para continuar.", false);
        
        // Clear register form
        reg_username.value = "";
        reg_email.value = "";
        reg_password.value = "";
        passwordContainer.classList.add("hidden");

    } catch (error) {
        showMessage(registerError, "Erro de conexão com o servidor.");
        console.error("Register error:", error);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

/* ===============================
   LOGIN
================================ */
document.getElementById("loginBtn").addEventListener("click", async () => {
    const email = login_email.value.trim();
    const password = login_password.value.trim();

    // Clear previous errors
    loginError.textContent = "";

    // Validation
    if (!email || !password) {
        showMessage(loginError, "Preenche todos os campos.");
        return;
    }

    if (!emailRegex.test(email)) {
        showMessage(loginError, "Email inválido.");
        return;
    }

    // Show loading state
    const btn = document.getElementById("loginBtn");
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span>A entrar...</span>';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({email, password})
        });

        const data = await res.json();

        if (!res.ok) {
            showMessage(loginError, data.message || "Credenciais inválidas.");
            btn.innerHTML = originalText;
            btn.disabled = false;
            return;
        }

        // Success - save token and redirect
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        if (typeof toast !== 'undefined' && toast.success) {
          toast.success('Login bem-sucedido! A redirecionar...', 'Bem-vindo', 2000);
        } else {
          showMessage(loginError, "✓ Login bem-sucedido! A redirecionar...", false);
        }

        setTimeout(() => {
            window.location.href = "index.html";
        }, 1000);

    } catch (error) {
        showMessage(loginError, "Erro de conexão com o servidor.");
        console.error("Login error:", error);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

/* ===============================
   ENTER KEY SUPPORT
================================ */
login_password.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        document.getElementById("loginBtn").click();
    }
});

reg_password.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        document.getElementById("registerBtn").click();
    }
});