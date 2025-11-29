/* ----------------------
   SELETORES
------------------------ */
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


/* ----------------------
   ALTERAR VISTAS
------------------------ */
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



/* ============================================================
   PASSWORD VALIDATION (REGISTO)
============================================================ */
const passwordInput = document.getElementById("reg_password");
const passwordContainer = document.getElementById("passwordContainer");
const statusText = document.getElementById("passwordStatus");

const ruleLength = document.getElementById("rule-length");
const ruleUpper = document.getElementById("rule-upper");
const ruleLower = document.getElementById("rule-lower");
const ruleNumber = document.getElementById("rule-number");
const ruleSymbol = document.getElementById("rule-symbol");

passwordInput.addEventListener("input", () => {
    const value = passwordInput.value;

    if (value.length > 0) {
        passwordContainer.classList.remove("hidden");
    } else {
        passwordContainer.classList.add("hidden");
        statusText.textContent = "";
    }

    const regexLength = /.{8,}/;
    const regexUpper = /[A-Z]/;
    const regexLower = /[a-z]/;
    const regexNumber = /\d/;
    const regexSymbol = /[\W_]/;

    let missing = 0;

    function checkRule(regex, element) {
        if (regex.test(value)) {
            element.style.display = "none";
        } else {
            element.style.display = "list-item";
            missing++;
        }
    }

    checkRule(regexLength, ruleLength);
    checkRule(regexUpper, ruleUpper);
    checkRule(regexLower, ruleLower);
    checkRule(regexNumber, ruleNumber);
    checkRule(regexSymbol, ruleSymbol);

    if (missing === 0) {
        statusText.textContent = "✔ Password forte!";
        statusText.style.color = "green";
    } else if (missing === 1) {
        statusText.textContent = "Quase lá… falta 1 requisito.";
        statusText.style.color = "orange";
    } else if (missing === 2) {
        statusText.textContent = "Password razoável (faltam 2 requisitos).";
        statusText.style.color = "#c7a400";
    } else {
        statusText.textContent = "Password fraca (faltam vários requisitos).";
        statusText.style.color = "red";
    }
});



/* ============================================================
   OLHO PROFISSIONAL – REGISTO
============================================================ */
const togglePass = document.getElementById("togglePass");
const eyeIcon = document.getElementById("eyeIcon");

togglePass.addEventListener("click", () => {
    if (passwordInput.type === "password") {
        passwordInput.type = "text";

        eyeIcon.setAttribute("fill", "#111");
    } else {
        passwordInput.type = "password";
        eyeIcon.setAttribute("fill", "#6b7280");
    }
});



/* ============================================================
   OLHO PROFISSIONAL – LOGIN
============================================================ */
const loginPasswordInput = document.getElementById("login_password");
const togglePassLogin = document.getElementById("togglePassLogin");
const eyeIconLogin = document.getElementById("eyeIconLogin");

togglePassLogin.addEventListener("click", () => {
    if (loginPasswordInput.type === "password") {
        loginPasswordInput.type = "text";
        eyeIconLogin.setAttribute("fill", "#111");
    } else {
        loginPasswordInput.type = "password";
        eyeIconLogin.setAttribute("fill", "#6b7280");
    }
});



/* ----------------------
   REGISTAR UTILIZADOR
------------------------ */
document.getElementById("registerBtn").addEventListener("click", async (e) => {
    e.preventDefault();

    const username = reg_username.value.trim();
    const email = reg_email.value.trim();
    const password = reg_password.value.trim();

    if (!username || !email || !password) {
        registerError.textContent = "Por favor, preencha todos os campos.";
        registerError.style.color = "red";
        return;
    }

    if (!emailRegex.test(email)) {
        registerError.textContent = "Por favor, insira um email válido.";
        registerError.style.color = "red";
        return;
    }

    const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

    if (!strongPassword.test(password)) {
        registerError.textContent = "A palavra-passe não cumpre os requisitos.";
        registerError.style.color = "red";
        return;
    }

    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            registerError.textContent = data.message || "Erro ao criar conta.";
            registerError.style.color = "red";
            return;
        }

        showLogin();
        loginError.textContent = "Conta criada com sucesso! Já pode iniciar sessão.";
        loginError.style.color = "green";

    } catch {
        registerError.textContent = "Erro de conexão com o servidor.";
        registerError.style.color = "red";
    }
});



/* ----------------------
   LOGIN
------------------------ */
document.getElementById("loginBtn").addEventListener("click", async (e) => {
    e.preventDefault();

    const email = login_email.value.trim();
    const password = login_password.value.trim();

    if (!email || !password) {
        loginError.textContent = "Por favor, preencha todos os campos.";
        loginError.style.color = "red";
        return;
    }

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
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
        loginError.textContent = "Erro de conexão com o servidor.";
        loginError.style.color = "red";
    }
});
