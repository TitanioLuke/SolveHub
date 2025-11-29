/* SELECTORS */
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


/* ==========================
    VIEW SWITCHING
========================== */
function showLogin() {
    leftSide.classList.add("brand-bg");
    leftSide.classList.remove("form-bg");

    rightSide.classList.add("form-bg");
    rightSide.classList.remove("brand-bg");

    brandLeft.classList.remove("hidden");
    loginForm.classList.remove("hidden");

    registerForm.classList.add("hidden");
    brandRight.classList.add("hidden");

    loginError.textContent = "";
    registerError.textContent = "";
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

    loginError.textContent = "";
    registerError.textContent = "";
}

toRegister.addEventListener("click", showRegister);
toLogin.addEventListener("click", showLogin);

showLogin();


/* ==========================
   PASSWORD VALIDATION
========================== */

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

    const validLength = /.{8,}/.test(value);
    const validUpper = /[A-Z]/.test(value);
    const validNumber = /\d/.test(value);
    const validSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(value);

    ruleLength.style.display = validLength ? "none" : "list-item";
    ruleUpper.style.display = validUpper ? "none" : "list-item";
    ruleNumber.style.display = validNumber ? "none" : "list-item";
    ruleSymbol.style.display = validSymbol ? "none" : "list-item";

    const missing = [
        !validLength,
        !validUpper,
        !validNumber,
        !validSymbol
    ].filter(Boolean).length;

    if (missing === 0) {
        statusText.textContent = "✔ Password forte!";
        statusText.style.color = "green";
    } else if (missing === 1) {
        statusText.textContent = "Quase lá… falta 1 requisito.";
        statusText.style.color = "orange";
    } else {
        statusText.textContent = "Password fraca (faltam vários requisitos).";
        statusText.style.color = "red";
    }
});


/* ==========================
   EYE ICON — REGISTER
========================== */
const togglePass = document.getElementById("togglePass");
const eyeIcon = document.getElementById("eyeIcon");

togglePass.addEventListener("click", () => {
    passwordInput.type = passwordInput.type === "password" ? "text" : "password";
    eyeIcon.setAttribute("fill", passwordInput.type === "password" ? "#6b7280" : "#111");
});


/* ==========================
   EYE ICON — LOGIN
========================== */
const loginPasswordInput = document.getElementById("login_password");
const togglePassLogin = document.getElementById("togglePassLogin");
const eyeIconLogin = document.getElementById("eyeIconLogin");

togglePassLogin.addEventListener("click", () => {
    loginPasswordInput.type =
        loginPasswordInput.type === "password" ? "text" : "password";

    eyeIconLogin.setAttribute(
        "fill",
        loginPasswordInput.type === "password" ? "#6b7280" : "#111"
    );
});


/* ==========================
   REGISTER
========================== */
document.getElementById("registerBtn").addEventListener("click", async () => {
    const username = reg_username.value.trim();
    const email = reg_email.value.trim();
    const password = reg_password.value.trim();

    if (!username || !email || !password) {
        registerError.textContent = "Por favor, preencha todos os campos.";
        registerError.style.color = "red";
        return;
    }

    if (!emailRegex.test(email)) {
        registerError.textContent = "Email inválido.";
        registerError.style.color = "red";
        return;
    }

    const strongPassword =
        validLength && validUpper && validNumber && validSymbol;

    if (!strongPassword) {
        registerError.textContent = "A palavra-passe não cumpre os requisitos.";
        registerError.style.color = "red";
        return;
    }

    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({username, email, password})
        });

        const data = await res.json();

        if (!res.ok) {
            registerError.textContent = data.message || "Erro ao criar conta.";
            registerError.style.color = "red";
            return;
        }

        showLogin();
        loginError.textContent = "Conta criada com sucesso!";
        loginError.style.color = "green";

    } catch {
        registerError.textContent = "Erro de conexão.";
        registerError.style.color = "red";
    }
});


/* ==========================
   LOGIN
========================== */
document.getElementById("loginBtn").addEventListener("click", async () => {
    const email = login_email.value.trim();
    const password = login_password.value.trim();

    if (!email || !password) {
        loginError.textContent = "Preencha todos os campos.";
        loginError.style.color = "red";
        return;
    }

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({email, password})
        });

        const data = await res.json();

        if (!res.ok) {
            loginError.textContent = data.message || "Credenciais inválidas.";
            loginError.style.color = "red";
            return;
        }

        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        window.location.href = "index.html";

    } catch {
        loginError.textContent = "Erro de conexão.";
        loginError.style.color = "red";
    }
});
