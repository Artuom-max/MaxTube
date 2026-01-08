/**
 * MaxTube Main Application
 */

document.addEventListener('DOMContentLoaded', async () => {
    console.log('App: Запуск приложения...');
    
    // Показываем loading
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'flex';
    
    try {
        // Инициализация Auth
        Auth.init();
        
        // Инициализация VideoManager
        await VideoManager.init();
        
        // Инициализация компонентов
        initSidebar();
        initSearch();
        initCategories();
        initUpload();
        initNotifications();
        
        // Загрузка видео
        loadVideos();
        
        console.log('App: Инициализация завершена');
        
    } catch (error) {
        console.error('App: Ошибка инициализации:', error);
        if (loading) loading.style.display = 'none';
    }
});

/**
 * Сайдбар
 */
function initSidebar() {
    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    
    if (!menuBtn || !sidebar) return;
    
    menuBtn.addEventListener('click', () => {
        if (window.innerWidth <= 1024) {
            sidebar.classList.toggle('open');
        } else {
            sidebar.classList.toggle('collapsed');
            if (mainContent) mainContent.classList.toggle('expanded');
        }
    });
    
    // Закрытие на мобильных
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 1024 && sidebar.classList.contains('open')) {
            if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        }
    });
    
    // Навигация
    document.querySelectorAll('.nav-item[data-category]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const category = item.dataset.category;
            
            document.querySelectorAll('.category-chip').forEach(chip => {
                chip.classList.toggle('active', chip.dataset.category === category);
            });
            
            loadVideosByCategory(category);
        });
    });
    
    // Кнопки в sidebar
    document.getElementById('sidebarHistoryBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        showHistory();
    });
    
    document.getElementById('sidebarWatchLaterBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        showWatchLater();
    });
    
    document.getElementById('sidebarLikedBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        showLiked();
    });
}

/**
 * Поиск
 */
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    if (!searchInput) return;
    
    const performSearch = () => {
        const query = searchInput.value.trim();
        if (query) {
            const results = VideoManager.searchVideos(query);
            displaySearchResults(results, query);
        } else {
            loadVideos();
        }
    };
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    
    searchBtn?.addEventListener('click', performSearch);
}

/**
 * Отображение результатов поиска
 */
function displaySearchResults(videos, query) {
    const container = document.getElementById('videoGrid');
    const loading = document.getElementById('loading');
    const emptyState = document.getElementById('emptyState');
    
    if (loading) loading.style.display = 'none';
    
    if (videos.length === 0) {
        if (emptyState) {
            emptyState.innerHTML = `
                <i class="fas fa-search"></i>
                <h2>Ничего не найдено</h2>
                <p>По запросу "${query}" ничего не найдено</p>
            `;
            emptyState.style.display = 'flex';
        }
        container.innerHTML = '';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    container.innerHTML = videos.map(video => VideoManager.createVideoCard(video)).join('');
}

/**
 * Категории
 */
function initCategories() {
    document.querySelectorAll('.category-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            loadVideosByCategory(chip.dataset.category);
        });
    });
}

/**
 * Загрузка видео
 */
function loadVideos() {
    console.log('App: Загрузка видео...');
    VideoManager.loadVideos('videoGrid', 'all');
}

/**
 * Загрузка по категории
 */
function loadVideosByCategory(category) {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'flex';
    
    setTimeout(() => {
        VideoManager.loadVideos('videoGrid', category);
    }, 200);
}

/**
 * Загрузка видео
 */
function initUpload() {
    const uploadBtn = document.getElementById('uploadVideoBtn');
    const uploadModal = document.getElementById('uploadModal');
    const closeUploadModal = document.getElementById('closeUploadModal');
    const uploadArea = document.getElementById('uploadArea');
    const selectFileBtn = document.getElementById('selectFileBtn');
    const videoFileInput = document.getElementById('videoFileInput');
    const uploadForm = document.getElementById('uploadForm');
    const cancelUpload = document.getElementById('cancelUpload');
    
    if (!uploadBtn || !uploadModal) return;
    
    // Открытие
    uploadBtn.addEventListener('click', () => {
        const user = Auth.getCurrentUser();
        if (!user) {
            showToast('Войдите, чтобы загружать видео', 'warning');
            window.location.href = 'pages/login.html';
            return;
        }
        uploadModal.classList.add('show');
    });
    
    // Закрытие
    closeUploadModal?.addEventListener('click', () => {
        uploadModal.classList.remove('show');
        resetUploadForm();
    });
    
    uploadModal.addEventListener('click', (e) => {
        if (e.target === uploadModal) {
            uploadModal.classList.remove('show');
            resetUploadForm();
        }
    });
    
    // Выбор файла
    selectFileBtn?.addEventListener('click', () => videoFileInput.click());
    uploadArea?.addEventListener('click', () => videoFileInput.click());
    
    // Drag & Drop
    uploadArea?.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea?.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea?.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleVideoFile(e.dataTransfer.files[0]);
        }
    });
    
    videoFileInput?.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleVideoFile(e.target.files[0]);
        }
    });
    
    cancelUpload?.addEventListener('click', () => {
        uploadModal.classList.remove('show');
        resetUploadForm();
    });
    
    // Отправка
    uploadForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const file = videoFileInput.files[0];
        if (!file) {
            showToast('Выберите видео', 'error');
            return;
        }
        
        const publishBtn = document.getElementById('publishVideo');
        publishBtn.disabled = true;
        publishBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка...';
        
        try {
            await VideoManager.addVideo({
                title: document.getElementById('videoTitle').value,
                description: document.getElementById('videoDescription').value,
                category: document.getElementById('videoCategory').value,
                visibility: document.getElementById('videoVisibility').value
            }, file);
            
            showToast('Видео загружено!', 'success');
            uploadModal.classList.remove('show');
            resetUploadForm();
            loadVideos();
            
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            publishBtn.disabled = false;
            publishBtn.innerHTML = '<i class="fas fa-upload"></i> Опубликовать';
        }
    });
}

function handleVideoFile(file) {
    if (!file.type.startsWith('video/')) {
        showToast('Выберите видео файл', 'error');
        return;
    }
    
    document.getElementById('uploadArea').style.display = 'none';
    document.getElementById('uploadForm').style.display = 'flex';
    
    const videoUrl = URL.createObjectURL(file);
    document.getElementById('uploadPreviewVideo').src = videoUrl;
    
    const fileName = file.name.replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
    document.getElementById('videoTitle').value = fileName;
}

function resetUploadForm() {
    const uploadArea = document.getElementById('uploadArea');
    const uploadForm = document.getElementById('uploadForm');
    const videoFileInput = document.getElementById('videoFileInput');
    
    if (uploadArea) uploadArea.style.display = 'flex';
    if (uploadForm) {
        uploadForm.style.display = 'none';
        uploadForm.reset();
    }
    if (videoFileInput) videoFileInput.value = '';
    
    const preview = document.getElementById('uploadPreviewVideo');
    if (preview) preview.src = '';
}

/**
 * Уведомления
 */
function initNotifications() {
    const btn = document.getElementById('notificationsBtn');
    const panel = document.getElementById('notificationsPanel');
    
    if (!btn || !panel) return;
    
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.toggle('show');
    });
    
    document.addEventListener('click', (e) => {
        if (!panel.contains(e.target)) {
            panel.classList.remove('show');
        }
    });
}

/**
 * История
 */
function showHistory() {
    const user = Auth.getCurrentUser();
    if (!user) {
        showToast('Войдите для просмотра истории', 'warning');
        return;
    }
    
    const videos = VideoManager.getHistory(user.id);
    if (videos.length === 0) {
        showToast('История пуста', 'info');
        return;
    }
    
    showVideoListModal('История просмотров', videos);
}

/**
 * Смотреть позже
 */
function showWatchLater() {
    const user = Auth.getCurrentUser();
    if (!user) {
        showToast('Войдите для просмотра', 'warning');
        return;
    }
    
    const videos = VideoManager.getWatchLater(user.id);
    if (videos.length === 0) {
        showToast('Список пуст', 'info');
        return;
    }
    
    showVideoListModal('Смотреть позже', videos);
}

/**
 * Понравившиеся
 */
function showLiked() {
    showToast('Раздел в разработке', 'info');
}

/**
 * Модальное окно со списком видео
 */
function showVideoListModal(title, videos) {
    const existing = document.getElementById('videoListModal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'videoListModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px;">
            <div class="modal-header">
                <h2>${title}</h2>
                <button class="modal-close"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                <div class="video-grid" style="gap: 16px;">
                    ${videos.map(v => VideoManager.createVideoCard(v)).join('')}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
    
    modal.querySelector('.modal-close').addEventListener('click', () => {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        }
    });
}

/**
 * Toast уведомления
 */
function showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${icons[type] || 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Глобальный доступ
window.showToast = showToast;