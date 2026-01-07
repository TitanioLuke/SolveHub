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
        const img = `<img src="${typeof resolveUrl !== 'undefined' ? resolveUrl(user.avatar) : (typeof API_URL !== 'undefined' ? API_URL + user.avatar : 'http://localhost:5050' + user.avatar)}" />`;
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
                if (typeof toast !== 'undefined' && toast.warning) {
                  toast.warning('Por favor, preenche todos os campos obrigatórios.', 'Validação');
                } else {
                  alert('Por favor, preenche todos os campos obrigatórios.');
                }
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
                if (typeof toast !== 'undefined' && toast.success) {
                  toast.success('Perfil atualizado com sucesso!', null, 3000);
                } else {
                  alert('Perfil atualizado com sucesso!');
                }

            } catch (error) {
                console.error(error);
                if (typeof toast !== 'undefined' && toast.error) {
                  toast.error('Erro ao atualizar perfil. Tenta novamente.', 'Erro', 5000);
                } else {
                  alert('Erro ao atualizar perfil. Tenta novamente.');
                }
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
            const apiUrl = typeof API_URL !== 'undefined' ? API_URL : 'http://localhost:5050';
            const res = await fetch(`${apiUrl}/auth/me/avatar`, {
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
            
            // Atualizar avatar em todas as páginas se a função existir
            if (typeof updateAvatarDisplay === 'function') {
                updateAvatarDisplay(user);
            }

        } catch {
            if (typeof toast !== 'undefined' && toast.error) {
              toast.error('Erro ao atualizar foto de perfil', 'Erro', 5000);
            } else {
              alert('Erro ao atualizar foto de perfil');
            }
        }
    });
}

// ===============================
//   PASSWORD CHANGE
// ===============================
const changePasswordForm = document.getElementById('changePasswordForm');
const changePasswordMessage = document.getElementById('changePasswordMessage');

// Password validation state
let validLength = false;
let validUpper = false;
let validNumber = false;
let validSymbol = false;

if (changePasswordForm) {
    const currentPasswordInput = document.getElementById('currentPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmNewPasswordInput = document.getElementById('confirmNewPassword');
    
    const passwordValidationContainer = document.getElementById('passwordValidationContainer');
    const passwordValidationStatus = document.getElementById('passwordValidationStatus');
    const ruleLength = document.getElementById('rule-length');
    const ruleUpper = document.getElementById('rule-upper');
    const ruleNumber = document.getElementById('rule-number');
    const ruleSymbol = document.getElementById('rule-symbol');

    // ===============================
    //   PASSWORD VALIDATION (REAL-TIME)
    // ===============================
    if (newPasswordInput && passwordValidationContainer) {
        newPasswordInput.addEventListener('input', () => {
            const value = newPasswordInput.value;

            if (value.length === 0) {
                passwordValidationContainer.classList.add('hidden');
                passwordValidationStatus.textContent = '';
                return;
            }

            passwordValidationContainer.classList.remove('hidden');

            validLength = /.{8,}/.test(value);
            validUpper = /[A-Z]/.test(value);
            validNumber = /\d/.test(value);
            validSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(value);

            ruleLength.style.display = validLength ? 'none' : 'flex';
            ruleUpper.style.display = validUpper ? 'none' : 'flex';
            ruleNumber.style.display = validNumber ? 'none' : 'flex';
            ruleSymbol.style.display = validSymbol ? 'none' : 'flex';

            const missing = [
                !validLength,
                !validUpper,
                !validNumber,
                !validSymbol
            ].filter(Boolean).length;

            if (missing === 0) {
                passwordValidationStatus.textContent = '✓ Password forte!';
                passwordValidationStatus.style.color = '#16a34a';
            } else if (missing === 1) {
                passwordValidationStatus.textContent = '⚠ Quase lá… falta 1 requisito.';
                passwordValidationStatus.style.color = '#f59e0b';
            } else {
                passwordValidationStatus.textContent = '✗ Password fraca (faltam vários requisitos).';
                passwordValidationStatus.style.color = '#dc2626';
            }
        });
    }

    // ===============================
    //   TOGGLE PASSWORD VISIBILITY
    // ===============================
    const toggleCurrentPassword = document.getElementById('toggleCurrentPassword');
    const eyeIconCurrentPassword = document.getElementById('eyeIconCurrentPassword');
    
    if (toggleCurrentPassword && currentPasswordInput && eyeIconCurrentPassword) {
        toggleCurrentPassword.addEventListener('click', () => {
            const isPassword = currentPasswordInput.type === 'password';
            currentPasswordInput.type = isPassword ? 'text' : 'password';
            
            eyeIconCurrentPassword.innerHTML = isPassword
                ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/><line x1="1" y1="1" x2="23" y2="23"/>'
                : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
            
            toggleCurrentPassword.setAttribute('aria-label', isPassword ? 'Esconder palavra-passe' : 'Mostrar palavra-passe');
        });
    }

    const toggleNewPassword = document.getElementById('toggleNewPassword');
    const eyeIconNewPassword = document.getElementById('eyeIconNewPassword');
    
    if (toggleNewPassword && newPasswordInput && eyeIconNewPassword) {
        toggleNewPassword.addEventListener('click', () => {
            const isPassword = newPasswordInput.type === 'password';
            newPasswordInput.type = isPassword ? 'text' : 'password';
            
            eyeIconNewPassword.innerHTML = isPassword
                ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/><line x1="1" y1="1" x2="23" y2="23"/>'
                : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
            
            toggleNewPassword.setAttribute('aria-label', isPassword ? 'Esconder palavra-passe' : 'Mostrar palavra-passe');
        });
    }

    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
    const eyeIconConfirmPassword = document.getElementById('eyeIconConfirmPassword');
    
    if (toggleConfirmPassword && confirmNewPasswordInput && eyeIconConfirmPassword) {
        toggleConfirmPassword.addEventListener('click', () => {
            const isPassword = confirmNewPasswordInput.type === 'password';
            confirmNewPasswordInput.type = isPassword ? 'text' : 'password';
            
            eyeIconConfirmPassword.innerHTML = isPassword
                ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/><line x1="1" y1="1" x2="23" y2="23"/>'
                : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
            
            toggleConfirmPassword.setAttribute('aria-label', isPassword ? 'Esconder palavra-passe' : 'Mostrar palavra-passe');
        });
    }

    // ===============================
    //   FORM SUBMIT
    // ===============================
    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Verificar token
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'auth.html';
            return;
        }

        const submitBtn = changePasswordForm.querySelector('button[type="submit"]');

        const currentPassword = currentPasswordInput.value.trim();
        const newPassword = newPasswordInput.value.trim();
        const confirmPassword = confirmNewPasswordInput.value.trim();

        // Validar campos obrigatórios
        if (!currentPassword || !newPassword || !confirmPassword) {
            showPasswordMessage('Por favor, preenche todos os campos.', 'error');
            return;
        }

        // Validar força da password
        const strongPassword = validLength && validUpper && validNumber && validSymbol;
        if (!strongPassword) {
            showPasswordMessage('A nova palavra-passe não cumpre os requisitos de segurança.', 'error');
            return;
        }

        // Validar confirmação
        if (newPassword !== confirmPassword) {
            showPasswordMessage('As palavras-passe não coincidem.', 'error');
            return;
        }

        // Validar que não é igual à atual
        if (currentPassword === newPassword) {
            showPasswordMessage('A nova palavra-passe deve ser diferente da atual.', 'error');
            return;
        }

        // Desabilitar botão e mostrar loading
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span>A atualizar...</span>';
        submitBtn.disabled = true;
        hidePasswordMessage();

        try {
            await apiPut('/auth/password', {
                currentPassword,
                newPassword
            });

            // Sucesso
            showPasswordMessage('Palavra-passe atualizada com sucesso!', 'success');
            currentPasswordInput.value = '';
            newPasswordInput.value = '';
            confirmNewPasswordInput.value = '';
            
            // Esconder validação
            if (passwordValidationContainer) {
                passwordValidationContainer.classList.add('hidden');
            }
            
            // Reset validation state
            validLength = false;
            validUpper = false;
            validNumber = false;
            validSymbol = false;
        } catch (error) {
            // Erro
            const message = error.message || 'Erro ao atualizar palavra-passe. Tenta novamente.';
            showPasswordMessage(message, 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

function showPasswordMessage(message, type) {
    if (!changePasswordMessage) return;
    
    changePasswordMessage.textContent = message;
    changePasswordMessage.className = `form-message ${type === 'success' ? 'success' : 'error'}`;
    changePasswordMessage.style.display = 'block';
}

function hidePasswordMessage() {
    if (changePasswordMessage) {
        changePasswordMessage.style.display = 'none';
    }
}

// Eliminar conta
const accountSection = document.getElementById('account');
if (accountSection) {
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
//   THEME SELECTION (usando sistema global)
// ===============================
function loadTheme() {
    // Usar sistema global se disponível, senão fallback
    const getTheme = window.getTheme || (() => localStorage.getItem('theme') || 'light');
    const savedTheme = getTheme();
    
    // Atualizar UI dos radio buttons
    const themeOptions = document.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
        const input = option.querySelector('input[type="radio"]');
        if (input && input.value === savedTheme) {
            option.classList.add('active');
            input.checked = true;
        } else {
            option.classList.remove('active');
            input.checked = false;
        }
    });
}

function setupThemeSelection() {
    const themeOptions = document.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
        option.addEventListener('click', () => {
            const input = option.querySelector('input[type="radio"]');
            if (!input) return;
            
            const theme = input.value;
            
            // Usar sistema global se disponível
            if (window.setTheme) {
                window.setTheme(theme);
            } else {
                // Fallback
                localStorage.setItem('theme', theme);
                document.documentElement.setAttribute('data-theme', theme);
            }
            
            // Atualizar UI
            themeOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
        });
    });
}

// ===============================
//   NOTIFICATION SETTINGS
// ===============================
let notificationSettings = {
  exerciseReplies: true,
  commentReplies: true,
  exerciseLikes: false
};

// ===============================
//   LOAD NOTIFICATION SETTINGS
// ===============================
async function loadNotificationSettings() {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const settings = await apiGet('/auth/me/notification-settings');
    notificationSettings = {
      exerciseReplies: settings.exerciseReplies !== undefined ? settings.exerciseReplies : true,
      commentReplies: settings.commentReplies !== undefined ? settings.commentReplies : true,
      exerciseLikes: settings.exerciseLikes !== undefined ? settings.exerciseLikes : false
    };

    // Atualizar toggles
    const toggleExerciseReplies = document.getElementById('toggleExerciseReplies');
    const toggleCommentReplies = document.getElementById('toggleCommentReplies');
    const toggleExerciseLikes = document.getElementById('toggleExerciseLikes');

    if (toggleExerciseReplies) toggleExerciseReplies.checked = notificationSettings.exerciseReplies;
    if (toggleCommentReplies) toggleCommentReplies.checked = notificationSettings.commentReplies;
    if (toggleExerciseLikes) toggleExerciseLikes.checked = notificationSettings.exerciseLikes;
  } catch (error) {
    console.warn('Erro ao carregar preferências de notificações, usando defaults:', error);
    // Usar defaults do UI
    notificationSettings = {
      exerciseReplies: true,
      commentReplies: true,
      exerciseLikes: false
    };
  }
}

// ===============================
//   UPDATE NOTIFICATION SETTING
// ===============================
async function updateNotificationSetting(settingKey, value) {
  const token = localStorage.getItem('token');
  if (!token) {
    if (typeof toast !== 'undefined' && toast.warning) {
      toast.warning('Precisas de estar autenticado para alterar preferências.', 'Acesso Negado');
    } else {
      alert('Precisas de estar autenticado para alterar preferências.');
    }
    return;
  }

  // Atualizar estado local
  notificationSettings[settingKey] = value;

  try {
    await apiPut('/auth/me/notification-settings', notificationSettings);
  } catch (error) {
    console.error('Erro ao guardar preferências:', error);
    if (typeof toast !== 'undefined' && toast.error) {
      toast.error(error?.message || 'Erro ao guardar preferências. Tenta novamente.', 'Erro', 5000);
    } else {
      alert(error?.message || 'Erro ao guardar preferências. Tenta novamente.');
    }
    
    // Reverter toggle
    const toggle = document.querySelector(`[data-setting="${settingKey}"]`);
    if (toggle) {
      toggle.checked = !value;
      notificationSettings[settingKey] = !value;
    }
  }
}

// ===============================
//   SETUP NOTIFICATION TOGGLES
// ===============================
function setupNotificationToggles() {
  const toggleExerciseReplies = document.getElementById('toggleExerciseReplies');
  const toggleCommentReplies = document.getElementById('toggleCommentReplies');
  const toggleExerciseLikes = document.getElementById('toggleExerciseLikes');

  if (toggleExerciseReplies) {
    toggleExerciseReplies.addEventListener('change', async (e) => {
      const toggle = e.target;
      toggle.disabled = true;
      await updateNotificationSetting('exerciseReplies', toggle.checked);
      toggle.disabled = false;
    });
  }

  if (toggleCommentReplies) {
    toggleCommentReplies.addEventListener('change', async (e) => {
      const toggle = e.target;
      toggle.disabled = true;
      await updateNotificationSetting('commentReplies', toggle.checked);
      toggle.disabled = false;
    });
  }

  if (toggleExerciseLikes) {
    toggleExerciseLikes.addEventListener('change', async (e) => {
      const toggle = e.target;
      toggle.disabled = true;
      await updateNotificationSetting('exerciseLikes', toggle.checked);
      toggle.disabled = false;
    });
  }
}

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

    // Atualizar nome no topbar
    const profileName = document.querySelector('.profile-name');
    if (profileName && user.username) {
        profileName.textContent = user.username;
    }

    updateAvatar(user);
}

// ===============================
//   LOAD USER FROM API
// ===============================
async function loadUserFromAPI() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'auth.html';
        return;
    }

    try {
        const res = await fetch('http://localhost:5050/auth/me', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = 'auth.html';
                return;
            }
            throw new Error('Erro ao carregar utilizador');
        }

        const user = await res.json();
        localStorage.setItem('user', JSON.stringify(user));
        loadUserData();

        // Mostrar link Admin se autorizado
        if (window.showAdminLinkIfAuthorized) {
            window.showAdminLinkIfAuthorized();
        }
    } catch (error) {
        console.error('Erro ao carregar utilizador:', error);
        // Tentar usar dados do localStorage se houver
        loadUserData();
    }
}

// ===============================
//   INITIALIZE
// ===============================
async function initializeSettings() {
  loadTheme(); // Carregar tema primeiro
  await loadUserFromAPI();
  await loadNotificationSettings();
  setupNotificationToggles();
  setupThemeSelection();
}

initializeSettings();
