/**
 * MaxTube Authentication System
 */

const Auth = {
    users: [],
    currentUser: null,
    initialized: false,
    
    init() {
        if (this.initialized) return;
        
        // Загружаем пользователей
        this.users = JSON.parse(localStorage.getItem('maxtube_users')) || [];
        
        // Загружаем текущего пользователя
        this.currentUser = JSON.parse(localStorage.getItem('maxtube_current_user')) 
            || JSON.parse(sessionStorage.getItem('maxtube_current_user')) 
            || null;
        
        this.updateUI();
        this.setupEventListeners();
        this.initialized = true;
        
        console.log('Auth: Инициализация завершена, пользователь:', this.currentUser?.email || 'не авторизован');
    },
    
    generateId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },
    
    generateAvatar(name, color = null) {
        const colors = ['#ff0050', '#00d4ff', '#8800ff', '#00cc66', '#ffaa00', '#ff6600', '#ff3366'];
        const bgColor = color || colors[Math.floor(Math.random() * colors.length)];
        const initial = (name || 'U').charAt(0).toUpperCase();
        
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
            <rect width="200" height="200" fill="${bgColor}"/>
            <text x="100" y="100" font-family="Arial, sans-serif" font-size="80" font-weight="bold" fill="white" text-anchor="middle" dy=".35em">${initial}</text>
        </svg>`;
        
        return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    },
    
    validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },
    
    hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'hash_' + Math.abs(hash).toString(16);
    },
    
    // Регистрация через Email
    async registerWithEmail(userData) {
        const { firstName, lastName, username, email, password } = userData;
        
        if (!firstName || !lastName || !username || !email || !password) {
            throw new Error('Заполните все поля');
        }
        
        if (!this.validateEmail(email)) {
            throw new Error('Неверный формат email');
        }
        
        if (password.length < 8) {
            throw new Error('Пароль должен содержать минимум 8 символов');
        }
        
        if (this.users.find(u => u.email === email)) {
            throw new Error('Пользователь с таким email уже существует');
        }
        
        if (this.users.find(u => u.username === username)) {
            throw new Error('Это имя пользователя уже занято');
        }
        
        const newUser = {
            id: this.generateId(),
            firstName,
            lastName,
            username,
            email,
            password: this.hashPassword(password),
            avatar: this.generateAvatar(firstName),
            provider: 'email',
            createdAt: new Date().toISOString(),
            subscribers: 0,
            bio: ''
        };
        
        this.users.push(newUser);
        this.saveUsers();
        
        console.log('Auth: Пользователь зарегистрирован:', email);
        
        return { success: true };
    },
    
    // Вход через Email
    async loginWithEmail(email, password, rememberMe = false) {
        if (!email || !password) {
            throw new Error('Введите email и пароль');
        }
        
        const user = this.users.find(u => u.email === email);
        
        if (!user) {
            throw new Error('Пользователь не найден');
        }
        
        if (user.password !== this.hashPassword(password)) {
            throw new Error('Неверный пароль');
        }
        
        this.setCurrentUser(user, rememberMe);
        console.log('Auth: Вход выполнен:', email);
        
        return { success: true, user: this.currentUser };
    },
    
    // Вход через Google
    async loginWithGoogle() {
        return new Promise((resolve, reject) => {
            const modal = this.createOAuthModal('google');
            document.body.appendChild(modal);
            setTimeout(() => modal.classList.add('show'), 10);
            
            const form = modal.querySelector('form');
            const closeBtn = modal.querySelector('.modal-close');
            
            const closeModal = () => {
                modal.classList.remove('show');
                setTimeout(() => modal.remove(), 300);
            };
            
            closeBtn.onclick = () => {
                closeModal();
                reject(new Error('Отменено пользователем'));
            };
            
            modal.onclick = (e) => {
                if (e.target === modal) {
                    closeModal();
                    reject(new Error('Отменено пользователем'));
                }
            };
            
            form.onsubmit = (e) => {
                e.preventDefault();
                const email = form.querySelector('#oauthEmail').value;
                const name = form.querySelector('#oauthName').value;
                const avatarUrl = form.querySelector('#oauthAvatar').value;
                
                if (!email || !name) {
                    alert('Заполните обязательные поля');
                    return;
                }
                
                let user = this.users.find(u => u.email === email);
                
                if (!user) {
                    const [firstName, ...lastNameParts] = name.split(' ');
                    const lastName = lastNameParts.join(' ') || '';
                    
                    user = {
                        id: this.generateId(),
                        firstName,
                        lastName,
                        username: 'google_' + email.split('@')[0],
                        email,
                        password: null,
                        avatar: avatarUrl || this.generateAvatar(firstName, '#4285F4'),
                        provider: 'google',
                        createdAt: new Date().toISOString(),
                        subscribers: 0,
                        bio: ''
                    };
                    
                    this.users.push(user);
                    this.saveUsers();
                } else if (avatarUrl) {
                    user.avatar = avatarUrl;
                    this.saveUsers();
                }
                
                this.setCurrentUser(user, true);
                closeModal();
                resolve({ success: true, user: this.currentUser });
            };
        });
    },
    
    // Вход через Max
    async loginWithMax() {
        return new Promise((resolve, reject) => {
            const modal = this.createOAuthModal('max');
            document.body.appendChild(modal);
            setTimeout(() => modal.classList.add('show'), 10);
            
            const form = modal.querySelector('form');
            const closeBtn = modal.querySelector('.modal-close');
            
            const closeModal = () => {
                modal.classList.remove('show');
                setTimeout(() => modal.remove(), 300);
            };
            
            closeBtn.onclick = () => {
                closeModal();
                reject(new Error('Отменено пользователем'));
            };
            
            modal.onclick = (e) => {
                if (e.target === modal) {
                    closeModal();
                    reject(new Error('Отменено пользователем'));
                }
            };
            
            form.onsubmit = (e) => {
                e.preventDefault();
                const maxId = form.querySelector('#maxId').value;
                const name = form.querySelector('#oauthName').value;
                const avatarUrl = form.querySelector('#oauthAvatar').value;
                
                if (!maxId || !name) {
                    alert('Заполните обязательные поля');
                    return;
                }
                
                let user = this.users.find(u => u.maxId === maxId);
                
                if (!user) {
                    const [firstName, ...lastNameParts] = name.split(' ');
                    const lastName = lastNameParts.join(' ') || '';
                    
                    user = {
                        id: this.generateId(),
                        firstName,
                        lastName,
                        username: 'max_' + maxId,
                        email: `${maxId}@max.local`,
                        maxId,
                        password: null,
                        avatar: avatarUrl || this.generateAvatar(firstName, '#ff0050'),
                        provider: 'max',
                        createdAt: new Date().toISOString(),
                        subscribers: 0,
                        bio: ''
                    };
                    
                    this.users.push(user);
                    this.saveUsers();
                } else if (avatarUrl) {
                    user.avatar = avatarUrl;
                    this.saveUsers();
                }
                
                this.setCurrentUser(user, true);
                closeModal();
                resolve({ success: true, user: this.currentUser });
            };
        });
    },
    
    createOAuthModal(provider) {
        const isGoogle = provider === 'google';
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 420px;">
                <div class="modal-header">
                    <h2>
                        ${isGoogle ? `
                            <svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Вход через Google
                        ` : `
                            <i class="fas fa-m" style="color: var(--primary-color); margin-right: 8px; font-weight: bold;"></i>
                            Вход через Max
                        `}
                    </h2>
                    <button class="modal-close"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom: 20px; color: var(--text-secondary); text-align: center; font-size: 14px;">
                        Демо-режим: введите данные аккаунта
                    </p>
                    <form class="auth-form" style="gap: 16px;">
                        ${isGoogle ? `
                            <div class="form-group">
                                <label>Email *</label>
                                <div class="input-wrapper">
                                    <i class="fas fa-envelope"></i>
                                    <input type="email" id="oauthEmail" placeholder="example@gmail.com" required>
                                </div>
                            </div>
                        ` : `
                            <div class="form-group">
                                <label>Max ID *</label>
                                <div class="input-wrapper">
                                    <i class="fas fa-id-card"></i>
                                    <input type="text" id="maxId" placeholder="Ваш Max ID" required>
                                </div>
                            </div>
                        `}
                        <div class="form-group">
                            <label>Имя и фамилия *</label>
                            <div class="input-wrapper">
                                <i class="fas fa-user"></i>
                                <input type="text" id="oauthName" placeholder="Иван Иванов" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>URL аватара (можно оставить пустым)</label>
                            <div class="input-wrapper">
                                <i class="fas fa-image"></i>
                                <input type="url" id="oauthAvatar" placeholder="https://...">
                            </div>
                        </div>
                        <button type="submit" class="submit-btn" style="${!isGoogle ? 'background: linear-gradient(135deg, #ff0050, #8800ff);' : ''}">
                            <span>Войти</span>
                            <i class="fas fa-arrow-right"></i>
                        </button>
                    </form>
                </div>
            </div>
        `;
        return modal;
    },
    
    setCurrentUser(user, remember = true) {
        // Убираем пароль
        const { password, ...safeUser } = user;
        this.currentUser = safeUser;
        
        if (remember) {
            localStorage.setItem('maxtube_current_user', JSON.stringify(this.currentUser));
        } else {
            sessionStorage.setItem('maxtube_current_user', JSON.stringify(this.currentUser));
        }
        
        this.updateUI();
    },
    
    logout() {
        this.currentUser = null;
        localStorage.removeItem('maxtube_current_user');
        sessionStorage.removeItem('maxtube_current_user');
        this.updateUI();
        
        const isInPages = window.location.pathname.includes('/pages/');
        window.location.href = isInPages ? '../index.html' : 'index.html';
    },
    
    getCurrentUser() {
        if (this.currentUser) return this.currentUser;
        
        const stored = localStorage.getItem('maxtube_current_user') 
            || sessionStorage.getItem('maxtube_current_user');
        
        if (stored) {
            try {
                this.currentUser = JSON.parse(stored);
                return this.currentUser;
            } catch (e) {
                console.error('Ошибка парсинга пользователя');
            }
        }
        
        return null;
    },
    
    getUserById(userId) {
        return this.users.find(u => u.id === userId);
    },
    
    saveUsers() {
        localStorage.setItem('maxtube_users', JSON.stringify(this.users));
    },
    
    updateUI() {
        const user = this.getCurrentUser();
        
        const authButtons = document.getElementById('authButtons');
        const authActions = document.getElementById('authActions');
        const userMenu = document.getElementById('userMenu');
        const userAvatarImg = document.getElementById('userAvatarImg');
        const dropdownAvatar = document.getElementById('dropdownAvatar');
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        
        if (user) {
            // Авторизован
            if (authButtons) authButtons.style.display = 'none';
            if (authActions) authActions.style.display = 'flex';
            if (userMenu) userMenu.style.display = 'block';
            if (userAvatarImg) userAvatarImg.src = user.avatar;
            if (dropdownAvatar) dropdownAvatar.src = user.avatar;
            if (userName) userName.textContent = `${user.firstName} ${user.lastName}`;
            if (userEmail) userEmail.textContent = user.email || `@${user.username}`;
        } else {
            // Не авторизован
            if (authButtons) authButtons.style.display = 'flex';
            if (authActions) authActions.style.display = 'none';
            if (userMenu) userMenu.style.display = 'none';
        }
    },
    
    setupEventListeners() {
        // Dropdown toggle
        const userAvatar = document.getElementById('userAvatar');
        const dropdownMenu = document.getElementById('dropdownMenu');
        
        if (userAvatar && dropdownMenu) {
            userAvatar.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdownMenu.classList.toggle('show');
            });
            
            document.addEventListener('click', (e) => {
                if (!dropdownMenu.contains(e.target)) {
                    dropdownMenu.classList.remove('show');
                }
            });
        }
        
        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
    },
    
    updateProfile(updates) {
        const user = this.getCurrentUser();
        if (!user) return null;
        
        const index = this.users.findIndex(u => u.id === user.id);
        if (index === -1) return null;
        
        this.users[index] = { ...this.users[index], ...updates };
        this.saveUsers();
        
        this.setCurrentUser(this.users[index], true);
        
        return this.currentUser;
    }
};

// Глобальный доступ
window.Auth = Auth;

// Автоинициализация
document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
});