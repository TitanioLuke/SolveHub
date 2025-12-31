// ===============================
//   NAVIGATION BETWEEN SECTIONS
// ===============================
const navItems = document.querySelectorAll('.settings-nav-item');
const sections = document.querySelectorAll('.settings-section');

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = item.dataset.section;

        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        sections.forEach(section => section.classList.remove('active'));
        document.getElementById(sectionId).classList.add('active');

        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});

// ===============================
//   BIO CHARACTER COUNTER
// ===============================
const bioTextarea = document.getElementById('bio');
const charCount = document.querySelector('.char-count');

if (bioTextarea && charCount) {
    bioTextarea.addEventListener('input', () => {
        const length = bioTextarea.value.length;
        charCount.textContent = `${length} / 500`;
        charCount.style.color = length > 500 ? '#dc2626' : 'var(--text-muted)';
    });
}

// ===============================
//   AVATAR RENDER (IMAGEM OU INICIAIS)
// ===============================
function updateAvatar(user) {
    const avatar = document.querySelector('.avatar');
    const avatarLarge = document.querySelector('.avatar-large');

    if (user.avatar) {
        const img = `<img src="http://localhost:5050${user.avatar}" />`;
        if (avatar) avatar.innerHTML = img;
        if (avatarLarge) avatarLarge.innerHTML = img;
        return;
    }

    if (!user.username) return;

    const initials = user.username
        .trim()
        .split(/\s+/)
        .map(w => w[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();

    if (avatar) avatar.textContent = initials;
    if (avatarLarge) avatarLarge.textContent = initials;
}

// ===============================
//   PROFILE FORM SUBMISSION
// ===============================
const profileSection = document.getElementById('profile');
if (profileSection) {
    const saveBtn = profileSection.querySelector('.btn-primary');
    const cancelBtn = profileSection.querySelector('.btn-outline');

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const username = document.getElementById('username').value.trim();
            const email = document.getElementById('email').value.trim();
            const bio = document.getElementById('bio').value.trim();

            if (!username || !email) {
                alert('Por favor, preenche todos os campos obrigatórios.');
                return;
            }

            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '<span>A guardar...</span>';
            saveBtn.disabled = true;

            try {
                const res = await fetch("http://localhost:5050/auth/me", {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${localStorage.getItem("token")}`
                    },
                    body: JSON.stringify({ username, email, bio })
                });

                if (!res.ok) throw new Error();

                const user = await res.json();
                localStorage.setItem('user', JSON.stringify(user));

                const profileName = document.querySelector('.profile-name');
                if (profileName) profileName.textContent = user.username;

                updateAvatar(user);
                alert('Perfil atualizado com sucesso!');

            } catch (error) {
                console.error(error);
                alert('Erro ao atualizar perfil. Tenta novamente.');
            } finally {
                saveBtn.innerHTML = originalText;
                saveBtn.disabled = false;
            }
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (user.username) document.getElementById('username').value = user.username;
            if (user.email) document.getElementById('email').value = user.email;
            if (user.bio) {
                document.getElementById('bio').value = user.bio;
                charCount.textContent = `${user.bio.length} / 500`;
            }
        });
    }
}

// ===============================
//   AVATAR UPLOAD (REAL)
// ===============================
const avatarBtn = document.querySelector('.avatar-upload .btn-outline');

if (avatarBtn) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.hidden = true;
    document.body.appendChild(fileInput);

    avatarBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async () => {
        if (!fileInput.files[0]) return;

        const formData = new FormData();
        formData.append('avatar', fileInput.files[0]);

        try {
            const res = await fetch("http://localhost:5050/auth/me/avatar", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                },
                body: formData
            });

            if (!res.ok) throw new Error();

            const user = await res.json();
            localStorage.setItem('user', JSON.stringify(user));
            updateAvatar(user);

        } catch {
            alert('Erro ao atualizar foto de perfil');
        }
    });
}

// ===============================
//   PASSWORD CHANGE
// ===============================
const accountSection = document.getElementById('account');
if (accountSection) {
    const passwordBtn = accountSection.querySelector('.btn-primary');

    if (passwordBtn) {
        passwordBtn.addEventListener('click', async () => {
            const inputs = accountSection.querySelectorAll('input[type="password"]');
            const currentPassword = inputs[0].value;
            const newPassword = inputs[1].value;
            const confirmPassword = inputs[2].value;

            if (!currentPassword || !newPassword || !confirmPassword) {
                alert('Por favor, preenche todos os campos.');
                return;
            }

            if (newPassword.length < 8) {
                alert('A nova palavra-passe deve ter pelo menos 8 caracteres.');
                return;
            }

            if (newPassword !== confirmPassword) {
                alert('As palavras-passe não coincidem.');
                return;
            }

            const originalText = passwordBtn.innerHTML;
            passwordBtn.innerHTML = '<span>A atualizar...</span>';
            passwordBtn.disabled = true;

            try {
                await new Promise(resolve => setTimeout(resolve, 1000));
                alert('Palavra-passe atualizada com sucesso!');
                inputs.forEach(input => input.value = '');
            } finally {
                passwordBtn.innerHTML = originalText;
                passwordBtn.disabled = false;
            }
        });
    }

    const deleteBtn = accountSection.querySelector('.btn-danger');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            if (confirm('Tens a certeza que queres eliminar a tua conta?')) {
                localStorage.clear();
                window.location.href = 'auth.html';
            }
        });
    }
}

// ===============================
//   THEME SELECTION
// ===============================
const themeOptions = document.querySelectorAll('.theme-option');
themeOptions.forEach(option => {
    option.addEventListener('click', () => {
        themeOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        localStorage.setItem('theme', option.querySelector('input').value);
    });
});

// ===============================
//   NOTIFICATION TOGGLES
// ===============================
const toggles = document.querySelectorAll('.toggle input[type="checkbox"]');
toggles.forEach(toggle => {
    toggle.addEventListener('change', () => {
        const settings = JSON.parse(localStorage.getItem('settings') || '{}');
        const key = toggle.closest('.setting-item').querySelector('h4').textContent;
        settings[key] = toggle.checked;
        localStorage.setItem('settings', JSON.stringify(settings));
    });
});

// ===============================
//   LOAD USER DATA
// ===============================
function loadUserData() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (user.username) document.getElementById('username').value = user.username;
    if (user.email) document.getElementById('email').value = user.email;
    if (user.bio) {
        document.getElementById('bio').value = user.bio;
        charCount.textContent = `${user.bio.length} / 500`;
    }

    updateAvatar(user);
}

// ===============================
//   INITIALIZE
// ===============================
loadUserData();
