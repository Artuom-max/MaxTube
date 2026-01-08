/**
 * MaxTube Video Manager
 * С поддержкой IndexedDB для хранения загруженных видео
 */

const VideoManager = {
    videos: [],
    comments: {},
    db: null,
    initialized: false,
    
    // Ваши видео файлы в папке Videos
    videoFiles: [
        'video1.mp4',
        'video2.mp4',
        'video3.mp4',
        'video4.mp4',
        'video5.mp4',
        'video6.mp4',
        'video7.mp4',
        'video8.mp4',
        'video9.mp4',
        'video10.mp4'
    ],
    
    getBasePath() {
        return window.location.pathname.includes('/pages/') ? '../' : '';
    },
    
    // Инициализация IndexedDB
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('MaxTubeDB', 1);
            
            request.onerror = () => reject(request.error);
            
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Хранилище для видео файлов
                if (!db.objectStoreNames.contains('videos')) {
                    db.createObjectStore('videos', { keyPath: 'id' });
                }
                
                // Хранилище для метаданных
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'id' });
                }
            };
        });
    },
    
    // Сохранить видео в IndexedDB
    async saveVideoToDB(id, file) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['videos'], 'readwrite');
            const store = transaction.objectStore('videos');
            
            const reader = new FileReader();
            reader.onload = () => {
                const request = store.put({
                    id: id,
                    data: reader.result,
                    type: file.type,
                    name: file.name
                });
                
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file);
        });
    },
    
    // Получить видео из IndexedDB
    async getVideoFromDB(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['videos'], 'readonly');
            const store = transaction.objectStore('videos');
            const request = store.get(id);
            
            request.onsuccess = () => {
                if (request.result) {
                    const blob = new Blob([request.result.data], { type: request.result.type });
                    resolve(URL.createObjectURL(blob));
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => reject(request.error);
        });
    },
    
    // Инициализация
    async init() {
        if (this.initialized) return this.videos;
        
        console.log('VideoManager: Инициализация...');
        
        try {
            // Инициализируем IndexedDB
            await this.initDB();
            console.log('VideoManager: IndexedDB готова');
        } catch (e) {
            console.warn('VideoManager: IndexedDB недоступна', e);
        }
        
        // Загружаем комментарии
        this.comments = JSON.parse(localStorage.getItem('maxtube_comments')) || {};
        
        // Загружаем метаданные пользовательских видео
        const userVideosMeta = JSON.parse(localStorage.getItem('maxtube_user_videos_meta')) || [];
        
        const basePath = this.getBasePath();
        
        // Создаём видео из списка файлов в папке Videos
        for (const filename of this.videoFiles) {
            const id = 'vid_' + filename.replace(/[^a-z0-9]/gi, '_');
            if (!this.videos.find(v => v.id === id)) {
                const video = await this.createVideoFromFile(filename, basePath);
                this.videos.push(video);
            }
        }
        
        // Восстанавливаем пользовательские видео
        for (const meta of userVideosMeta) {
            if (!this.videos.find(v => v.id === meta.id)) {
                // Пытаемся получить видео из IndexedDB
                if (this.db) {
                    try {
                        const blobUrl = await this.getVideoFromDB(meta.id);
                        if (blobUrl) {
                            meta.src = blobUrl;
                            meta.isRestored = true;
                        }
                    } catch (e) {
                        console.warn('Не удалось восстановить видео:', meta.id);
                    }
                }
                this.videos.push(meta);
            }
        }
        
        console.log('VideoManager: Загружено видео:', this.videos.length);
        this.initialized = true;
        
        return this.videos;
    },
    
    // Создание видео из файла в папке Videos
    async createVideoFromFile(filename, basePath) {
        const id = 'vid_' + filename.replace(/[^a-z0-9]/gi, '_');
        const title = this.formatTitle(filename);
        const src = `${basePath}Videos/${filename}`;
        
        let duration = 0;
        try {
            duration = await this.getVideoDuration(src);
        } catch (e) {
            // Если не удалось получить длительность, генерируем случайную
            duration = Math.floor(Math.random() * 600) + 60;
        }
        
        return {
            id,
            filename,
            title,
            description: `Видео: ${title}`,
            src: `Videos/${filename}`,
            thumbnail: 'Videos/Preview.png',
            duration: this.formatDuration(duration),
            durationSeconds: duration,
            views: Math.floor(Math.random() * 100000) + 1000,
            likes: Math.floor(Math.random() * 5000) + 100,
            uploadDate: this.getRandomDate(),
            uploadTimestamp: Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000),
            channel: 'MaxTube',
            channelId: 'system',
            channelAvatar: 'logo.png',
            subscribers: '10K',
            category: 'other',
            visibility: 'public'
        };
    },
    
    // Получение длительности
    getVideoDuration(src) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            
            const timeout = setTimeout(() => {
                video.src = '';
                reject(new Error('Timeout'));
            }, 10000);
            
            video.onloadedmetadata = () => {
                clearTimeout(timeout);
                resolve(video.duration || 0);
                video.src = '';
            };
            
            video.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('Error'));
                video.src = '';
            };
            
            video.src = src;
        });
    },
    
    formatDuration(seconds) {
        if (!seconds || isNaN(seconds) || seconds === 0) {
            const mins = Math.floor(Math.random() * 10) + 1;
            const secs = Math.floor(Math.random() * 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }
        
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },
    
    formatTitle(filename) {
        return filename
            .replace(/\.[^/.]+$/, '')
            .replace(/[-_]/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/\b\w/g, l => l.toUpperCase())
            .replace(/(\d+)/g, ' $1 ')
            .trim()
            .replace(/\s+/g, ' ');
    },
    
    getRandomDate() {
        const days = Math.floor(Math.random() * 30);
        if (days === 0) return 'Сегодня';
        if (days === 1) return 'Вчера';
        if (days < 7) return `${days} ${this.pluralize(days, 'день', 'дня', 'дней')} назад`;
        if (days < 14) return '1 неделю назад';
        if (days < 21) return '2 недели назад';
        return '3 недели назад';
    },
    
    pluralize(n, one, few, many) {
        if (n % 10 === 1 && n % 100 !== 11) return one;
        if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return few;
        return many;
    },
    
    formatViews(views) {
        const num = parseInt(views) || 0;
        if (num >= 1000000) return (num / 1000000).toFixed(1).replace('.0', '') + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1).replace('.0', '') + 'K';
        return num.toString();
    },
    
    getAllVideos() {
        return this.videos.filter(v => v.visibility === 'public' || !v.visibility);
    },
    
    getVideo(id) {
        return this.videos.find(v => v.id === id);
    },
    
    getVideosByCategory(category) {
        const all = this.getAllVideos();
        if (category === 'all' || !category) return all;
        return all.filter(v => v.category === category);
    },
    
    searchVideos(query) {
        const q = query.toLowerCase().trim();
        if (!q) return this.getAllVideos();
        
        return this.getAllVideos().filter(v =>
            v.title.toLowerCase().includes(q) ||
            v.channel.toLowerCase().includes(q) ||
            (v.description && v.description.toLowerCase().includes(q))
        );
    },
    
    getUserVideos(userId) {
        return this.videos.filter(v => v.channelId === userId);
    },
    
    // ДОБАВЛЕНИЕ ВИДЕО (ИСПРАВЛЕННОЕ)
    async addVideo(videoData, file) {
        const user = Auth.getCurrentUser();
        if (!user) throw new Error('Необходима авторизация');
        
        console.log('Добавление видео:', file.name);
        
        const id = 'vid_user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        
        // Получаем длительность
        const tempUrl = URL.createObjectURL(file);
        let duration = 0;
        try {
            duration = await this.getVideoDuration(tempUrl);
        } catch (e) {
            console.log('Не удалось получить длительность');
        }
        
        // Сохраняем файл в IndexedDB
        let videoSrc = tempUrl;
        if (this.db) {
            try {
                await this.saveVideoToDB(id, file);
                console.log('Видео сохранено в IndexedDB');
            } catch (e) {
                console.warn('Не удалось сохранить в IndexedDB:', e);
            }
        }
        
        const video = {
            id,
            filename: file.name,
            title: videoData.title || this.formatTitle(file.name),
            description: videoData.description || '',
            src: videoSrc,
            thumbnail: 'Videos/Preview.png',
            duration: this.formatDuration(duration),
            durationSeconds: duration,
            views: 0,
            likes: 0,
            uploadDate: 'Только что',
            uploadTimestamp: Date.now(),
            channel: `${user.firstName} ${user.lastName}`,
            channelId: user.id,
            channelAvatar: user.avatar,
            subscribers: user.subscribers || '0',
            category: videoData.category || 'other',
            visibility: videoData.visibility || 'public',
            isUserVideo: true
        };
        
        this.videos.unshift(video);
        this.saveUserVideosMeta();
        
        console.log('Видео добавлено:', video);
        
        return video;
    },
    
    // Сохранение метаданных пользовательских видео
    saveUserVideosMeta() {
        const userVideos = this.videos.filter(v => v.isUserVideo);
        const metaToSave = userVideos.map(v => ({
            ...v,
            src: v.isRestored ? '' : v.src // Не сохраняем blob URL
        }));
        localStorage.setItem('maxtube_user_videos_meta', JSON.stringify(metaToSave));
    },
    
    updateVideo(id, updates) {
        const index = this.videos.findIndex(v => v.id === id);
        if (index === -1) return null;
        this.videos[index] = { ...this.videos[index], ...updates };
        this.saveUserVideosMeta();
        return this.videos[index];
    },
    
    deleteVideo(id) {
        const index = this.videos.findIndex(v => v.id === id);
        if (index === -1) return false;
        this.videos.splice(index, 1);
        this.saveUserVideosMeta();
        
        // Удаляем из IndexedDB
        if (this.db) {
            const transaction = this.db.transaction(['videos'], 'readwrite');
            transaction.objectStore('videos').delete(id);
        }
        
        delete this.comments[id];
        this.saveComments();
        return true;
    },
    
    incrementViews(id) {
        const video = this.getVideo(id);
        if (video) {
            video.views = (parseInt(video.views) || 0) + 1;
        }
    },
    
    likeVideo(videoId, userId) {
        const video = this.getVideo(videoId);
        if (video) {
            video.likes = (parseInt(video.likes) || 0) + 1;
        }
    },
    
    addToWatchLater(userId, videoId) {
        let list = JSON.parse(localStorage.getItem(`watchLater_${userId}`)) || [];
        if (!list.includes(videoId)) {
            list.push(videoId);
            localStorage.setItem(`watchLater_${userId}`, JSON.stringify(list));
        }
    },
    
    getWatchLater(userId) {
        const ids = JSON.parse(localStorage.getItem(`watchLater_${userId}`)) || [];
        return ids.map(id => this.getVideo(id)).filter(v => v);
    },
    
    addToHistory(userId, videoId) {
        let history = JSON.parse(localStorage.getItem(`history_${userId}`)) || [];
        history = history.filter(h => h.videoId !== videoId);
        history.unshift({ videoId, watchedAt: Date.now() });
        history = history.slice(0, 50);
        localStorage.setItem(`history_${userId}`, JSON.stringify(history));
    },
    
    getHistory(userId) {
        const history = JSON.parse(localStorage.getItem(`history_${userId}`)) || [];
        return history.map(h => this.getVideo(h.videoId)).filter(v => v);
    },
    
    getComments(videoId) {
        return this.comments[videoId] || [];
    },
    
    addComment(videoId, data) {
        if (!this.comments[videoId]) this.comments[videoId] = [];
        
        const comment = {
            id: 'c_' + Date.now(),
            author: data.author,
            avatar: data.avatar,
            text: data.text,
            date: 'Только что',
            timestamp: Date.now(),
            likes: 0
        };
        
        this.comments[videoId].unshift(comment);
        this.saveComments();
        return comment;
    },
    
    saveComments() {
        localStorage.setItem('maxtube_comments', JSON.stringify(this.comments));
    },
    
    createVideoCard(video, basePath = '') {
        if (!video) return '';
        
        const bp = basePath || this.getBasePath();
        
        let thumbSrc = video.thumbnail;
        if (!thumbSrc.startsWith('data:') && !thumbSrc.startsWith('blob:') && !thumbSrc.startsWith('http')) {
            thumbSrc = bp + video.thumbnail;
        }
        
        let avatarSrc = video.channelAvatar;
        if (!avatarSrc.startsWith('data:') && !avatarSrc.startsWith('blob:') && !avatarSrc.startsWith('http')) {
            avatarSrc = bp + video.channelAvatar;
        }
        
        return `
            <a href="${bp}pages/watch.html?v=${video.id}" class="video-card">
                <div class="video-thumbnail">
                    <img src="${thumbSrc}" alt="${video.title}" loading="lazy" 
                         onerror="this.src='${bp}Videos/Preview.png'">
                    <span class="duration">${video.duration}</span>
                </div>
                <div class="video-info">
                    <img src="${avatarSrc}" alt="${video.channel}" class="channel-avatar-small"
                         onerror="this.src='${bp}logo.png'">
                    <div class="video-details">
                        <h3 class="video-title">${video.title}</h3>
                        <div class="video-meta">
                            <span class="channel-name">${video.channel}</span>
                            <div class="video-stats">
                                <span>${this.formatViews(video.views)} просмотров</span>
                                <span>•</span>
                                <span>${video.uploadDate}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </a>
        `;
    },
    
    loadVideos(containerId, category = 'all', basePath = '') {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const videos = this.getVideosByCategory(category);
        const loading = document.getElementById('loading');
        const emptyState = document.getElementById('emptyState');
        
        if (loading) loading.style.display = 'none';
        
        if (videos.length === 0) {
            container.innerHTML = '';
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        
        const bp = basePath || this.getBasePath();
        container.innerHTML = videos.map(v => this.createVideoCard(v, bp)).join('');
    }
};


window.VideoManager = VideoManager;
