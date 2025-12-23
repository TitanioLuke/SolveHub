// ===============================
//   NAVIGATION BETWEEN SECTIONS
// ===============================
const navItems = document.querySelectorAll('.settings-nav-item');
const sections = document.querySelectorAll('.settings-section');

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = item.dataset.section;

        // Update active nav item
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        // Update active section
        sections.forEach(section => section.classList.remove('active'));
        document.getElementById(sectionId).classList.add('active');

        // Scroll to top
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

        if (length > 500) {
            charCount.style.color = '#dc2626';
        } else {
            charCount.style.color = 'var(--text-muted)';
        }
    });
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

            // Show loading state
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '<span>A guardar...</span>';
            saveBtn.disabled = true;

            try {
                // Simulate API call
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Update localStorage
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                user.username = username;
                user.email = email;
                user.bio = bio;
                localStorage.setItem('user', JSON.stringify(user));

                // Success feedback
                alert('Perfil atualizado com sucesso!');
                
                // Update profile name in topbar
                const profileName = document.querySelector('.profile-name');
                if (profileName) {
                    profileName.textContent = username;
                }

            } catch (error) {
                console.error('Error updating profile:', error);
                alert('Erro ao atualizar perfil. Tenta novamente.');
            } finally {
                saveBtn.innerHTML = originalText;
                saveBtn.disabled = false;
            }
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            // Reset form to original values
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (user.username) {
                document.getElementById('username').value = user.username;
            }
            if (user.email) {
                document.getElementById('email').value = user.email;
            }
            if (user.bio) {
                document.getElementById('bio').value = user.bio;
                const length = user.bio.length;
                charCount.textContent = `${length} / 500`;
            }
        });
    }
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

            // Show loading state
            const originalText = passwordBtn.innerHTML;
            passwordBtn.innerHTML = '<span>A atualizar...</span>';
            passwordBtn.disabled = true;

            try {
                // Simulate API call
                await new Promise(resolve => setTimeout(resolve, 1000));

                alert('Palavra-passe atualizada com sucesso!');
                
                // Clear fields
                inputs.forEach(input => input.value = '');

            } catch (error) {
                console.error('Error updating password:', error);
                alert('Erro ao atualizar palavra-passe. Tenta novamente.');
            } finally {
                passwordBtn.innerHTML = originalText;
                passwordBtn.disabled = false;
            }
        });
    }

    // Delete account
    const deleteBtn = accountSection.querySelector('.btn-danger');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            const confirmed = confirm(
                'Tens a certeza que queres eliminar a tua conta?\n\n' +
                'Esta ação é IRREVERSÍVEL e todos os teus dados serão permanentemente eliminados.'
            );

            if (confirmed) {
                const doubleConfirm = confirm('Última confirmação: Eliminar conta permanentemente?');
                
                if (doubleConfirm) {
                    // Clear storage and redirect
                    localStorage.clear();
                    alert('Conta eliminada com sucesso.');
                    window.location.href = 'auth.html';
                }
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

        const theme = option.querySelector('input').value;
        localStorage.setItem('theme', theme);

        // Apply theme (placeholder - implement actual theme switching)
        console.log('Theme changed to:', theme);
        alert(`Tema alterado para: ${theme}`);
    });
});

// ===============================
//   NOTIFICATION TOGGLES
// ===============================
const toggles = document.querySelectorAll('.toggle input[type="checkbox"]');

toggles.forEach(toggle => {
    toggle.addEventListener('change', () => {
        const setting = toggle.closest('.setting-item').querySelector('h4').textContent;
        const enabled = toggle.checked;
        
        console.log(`${setting}: ${enabled ? 'Ativado' : 'Desativado'}`);
        
        // Save to localStorage
        const settings = JSON.parse(localStorage.getItem('settings') || '{}');
        settings[setting] = enabled;
        localStorage.setItem('settings', JSON.stringify(settings));
    });
});

// ===============================
//   LOAD USER DATA
// ===============================
function loadUserData() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (user.username) {
        const usernameInput = document.getElementById('username');
        if (usernameInput) usernameInput.value = user.username;
    }
    
    if (user.email) {
        const emailInput = document.getElementById('email');
        if (emailInput) emailInput.value = user.email;
    }
    
    if (user.bio) {
        const bioInput = document.getElementById('bio');
        if (bioInput) {
            bioInput.value = user.bio;
            const length = user.bio.length;
            const charCountElem = document.querySelector('.char-count');
            if (charCountElem) {
                charCountElem.textContent = `${length} / 500`;
            }
        }
    }

    // Load saved settings
    const settings = JSON.parse(localStorage.getItem('settings') || '{}');
    toggles.forEach(toggle => {
        const setting = toggle.closest('.setting-item').querySelector('h4').textContent;
        if (settings[setting] !== undefined) {
            toggle.checked = settings[setting];
        }
    });

    // Load saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        themeOptions.forEach(option => {
            const input = option.querySelector('input');
            if (input.value === savedTheme) {
                option.classList.add('active');
                input.checked = true;
            }
        });
    }
}

// ===============================
//   PROFILE DROPDOWN TOGGLE
// ===============================
const profile = document.querySelector('.profile');
const dropdown = document.getElementById('profileMenu');

if (profile && dropdown) {
    profile.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
        if (!dropdown.classList.contains('hidden')) {
            dropdown.classList.add('hidden');
        }
    });

    dropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

// ===============================
//   LOGOUT FUNCTIONALITY
// ===============================
const logoutBtn = document.querySelector('.logout');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        if (confirm('Tens a certeza que queres terminar a sessão?')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'auth.html';
        }
    });
}

// ===============================
//   INITIALIZE
// ===============================
loadUserData();