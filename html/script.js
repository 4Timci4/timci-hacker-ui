document.addEventListener('DOMContentLoaded', () => {
    // --- ENHANCED CONFIGURATION SYSTEM ---
    const CONFIG = {
        difficulty: localStorage.getItem('silent-operator-difficulty') || 'EASY',
        theme: localStorage.getItem('silent-operator-theme') || 'dark',
        animations: localStorage.getItem('silent-operator-animations') !== 'false',
        sounds: localStorage.getItem('silent-operator-sounds') === 'true',
        colors: {
            easy: '#10b981',
            hard: '#ff0055'
        },
        ui: {
            toastDuration: 3000,
            loadingDelay: 300,
            animationSpeed: 'normal'
        }
    };

    // Save config changes
    function saveConfig() {
        localStorage.setItem('silent-operator-difficulty', CONFIG.difficulty);
        localStorage.setItem('silent-operator-theme', CONFIG.theme);
        localStorage.setItem('silent-operator-animations', CONFIG.animations);
        localStorage.setItem('silent-operator-sounds', CONFIG.sounds);
    }

    // --- DOM CACHE - Performance optimization ---
    const domCache = {
        app: document.getElementById('app'),
        navItems: document.querySelectorAll('.nav-item[data-page]'),
        pages: document.querySelectorAll('.page'),
        closeBtn: document.getElementById('close-btn'),
        injectBtn: null,
        btnScan: null,
        targetList: null,
        vpnRows: null,
        radarSweep: null,
        radarStatus: null,
        targetResults: null,
        gameContainer: null
    };

    // Initialize cached elements
    const app = domCache.app;
    const navItems = domCache.navItems;
    const pages = domCache.pages;
    const closeBtn = domCache.closeBtn;
    
    if (window.invokeNative) {
        app.style.display = 'none';
    }
    
    // --- EVENT LISTENER CLEANUP MANAGEMENT ---
    const eventListeners = new Set();
    
    function addManagedEventListener(element, event, handler, options) {
        element.addEventListener(event, handler, options);
        eventListeners.add({ element, event, handler, options });
    }
    
    function cleanupAllEventListeners() {
        eventListeners.forEach(({ element, event, handler, options }) => {
            element.removeEventListener(event, handler, options);
        });
        eventListeners.clear();
    }
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', cleanupAllEventListeners);

    // --- CENTRALIZED STATE MANAGEMENT ---
    class AppState {
        constructor() {
            this.state = {
                currentPage: 'dashboard',
                isGameActive: false,
                isScanning: false,
                user: {
                    name: 'OP_PHANTOM',
                    level: 4,
                    reputation: 1250
                },
                network: {
                    status: 'online',
                    vpn: 'singapore-1',
                    trace: 0
                },
                notifications: [],
                lastAction: null
            };
            this.listeners = new Set();
        }

        setState(newState, action = null) {
            const prevState = { ...this.state };
            this.state = { ...this.state, ...newState };
            this.state.lastAction = action;
            
            // Notify all subscribers
            this.listeners.forEach(callback => {
                try {
                    callback(this.state, prevState, action);
                } catch (error) {
                    console.error('State listener error:', error);
                }
            });

            // Auto-save important state
            this.saveState();
        }

        subscribe(callback) {
            this.listeners.add(callback);
            return () => this.listeners.delete(callback);
        }

        getState() {
            return { ...this.state };
        }

        saveState() {
            try {
                const persistentState = {
                    user: this.state.user,
                    network: this.state.network
                };
                localStorage.setItem('silent-operator-state', JSON.stringify(persistentState));
            } catch (error) {
                console.error('Failed to save state:', error);
            }
        }

        loadState() {
            try {
                const saved = localStorage.getItem('silent-operator-state');
                if (saved) {
                    const parsedState = JSON.parse(saved);
                    this.setState(parsedState, 'LOAD_STATE');
                }
            } catch (error) {
                console.error('Failed to load state:', error);
            }
        }
    }

    // Initialize global state
    const appState = new AppState();
    appState.loadState();

    // --- TOAST NOTIFICATION SYSTEM ---
    class ToastSystem {
        constructor() {
            this.container = null;
            this.createContainer();
        }

        createContainer() {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            this.container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 12px;
                pointer-events: none;
            `;
            document.body.appendChild(this.container);
        }

        show(message, type = 'info', duration = CONFIG.ui.toastDuration) {
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            
            const colors = {
                info: 'var(--accent-primary)',
                success: 'var(--accent-green)',
                warning: 'var(--accent-warning)',
                error: 'var(--accent-red)'
            };

            toast.style.cssText = `
                background: linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.8) 100%);
                backdrop-filter: blur(20px);
                border: 1px solid ${colors[type] || colors.info};
                border-radius: 8px;
                padding: 16px 20px;
                color: white;
                font-family: var(--font-mono);
                font-size: var(--text-xs);
                max-width: 300px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.4);
                pointer-events: auto;
                transform: translateX(100%);
                transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                position: relative;
                overflow: hidden;
            `;

            // Progress bar
            const progressBar = document.createElement('div');
            progressBar.style.cssText = `
                position: absolute;
                bottom: 0;
                left: 0;
                height: 2px;
                background: ${colors[type] || colors.info};
                width: 100%;
                transform-origin: left;
                animation: toastProgress ${duration}ms linear;
            `;

            toast.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 4px; height: 4px; background: ${colors[type] || colors.info}; border-radius: 50%; opacity: 0.8;"></div>
                    ${message}
                </div>
            `;
            toast.appendChild(progressBar);

            this.container.appendChild(toast);

            // Animate in
            requestAnimationFrame(() => {
                toast.style.transform = 'translateX(0)';
            });

            // Auto remove
            setTimeout(() => {
                toast.style.transform = 'translateX(100%)';
                toast.style.opacity = '0';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }, duration);

            // Manual close on click
            toast.addEventListener('click', () => {
                toast.style.transform = 'translateX(100%)';
                toast.style.opacity = '0';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            });
        }
    }

    // Add toast animations to CSS
    const toastStyles = document.createElement('style');
    toastStyles.textContent = `
        @keyframes toastProgress {
            0% { transform: scaleX(1); }
            100% { transform: scaleX(0); }
        }
        
        .toast:hover {
            transform: translateX(0) scale(1.02) !important;
        }
    `;
    document.head.appendChild(toastStyles);

    // Initialize toast system
    const toast = new ToastSystem();
    window.showToast = (message, type, duration) => toast.show(message, type, duration);

    // --- CONFIRMATION DIALOG SYSTEM ---
    class ConfirmationDialog {
        constructor() {
            this.overlay = null;
            this.dialog = null;
            this.resolve = null;
        }

        show(title, message, options = {}) {
            return new Promise((resolve) => {
                this.resolve = resolve;
                this.createDialog(title, message, options);
            });
        }

        createDialog(title, message, options) {
            // Create overlay
            this.overlay = document.createElement('div');
            this.overlay.style.cssText = `
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(8px);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;

            // Create dialog
            this.dialog = document.createElement('div');
            this.dialog.style.cssText = `
                background: linear-gradient(135deg, rgba(10,10,12,0.95) 0%, rgba(5,5,5,0.98) 100%);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(0, 243, 255, 0.3);
                border-radius: 12px;
                padding: 32px;
                max-width: 400px;
                width: 90%;
                text-align: center;
                transform: scale(0.8) translateY(20px);
                transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                box-shadow:
                    0 20px 40px rgba(0,0,0,0.6),
                    inset 0 1px 0 rgba(255,255,255,0.1);
            `;

            const confirmText = options.confirmText || 'Onayla';
            const cancelText = options.cancelText || 'İptal';
            const type = options.type || 'warning';
            
            const iconColors = {
                warning: 'var(--accent-warning)',
                danger: 'var(--accent-red)',
                info: 'var(--accent-primary)'
            };

            const icons = {
                warning: '⚠',
                danger: '🚫',
                info: 'ℹ'
            };

            this.dialog.innerHTML = `
                <div style="margin-bottom: 24px;">
                    <div style="width: 48px; height: 48px; border-radius: 50%; background: ${iconColors[type]}15; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                        ${icons[type] || icons.info}
                    </div>
                    <h3 style="font-family: var(--font-mono); font-size: 1.2rem; color: white; margin-bottom: 12px; text-transform: uppercase;">${title}</h3>
                    <p style="font-family: var(--font-ui); font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5;">${message}</p>
                </div>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button class="dialog-btn dialog-cancel" style="
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.2);
                        color: var(--text-primary);
                        padding: 12px 24px;
                        border-radius: 6px;
                        font-family: var(--font-mono);
                        font-size: 0.8rem;
                        cursor: pointer;
                        transition: all 0.2s;
                        text-transform: uppercase;
                        min-width: 100px;
                    ">${cancelText}</button>
                    <button class="dialog-btn dialog-confirm" style="
                        background: ${iconColors[type]};
                        border: 1px solid ${iconColors[type]};
                        color: black;
                        padding: 12px 24px;
                        border-radius: 6px;
                        font-family: var(--font-mono);
                        font-size: 0.8rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                        text-transform: uppercase;
                        min-width: 100px;
                    ">${confirmText}</button>
                </div>
            `;

            this.overlay.appendChild(this.dialog);
            document.body.appendChild(this.overlay);

            // Event listeners
            const cancelBtn = this.dialog.querySelector('.dialog-cancel');
            const confirmBtn = this.dialog.querySelector('.dialog-confirm');

            cancelBtn.addEventListener('click', () => this.close(false));
            confirmBtn.addEventListener('click', () => this.close(true));

            // Close on overlay click
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) {
                    this.close(false);
                }
            });

            // Escape key
            const escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    this.close(false);
                    document.removeEventListener('keydown', escapeHandler);
                }
            };
            document.addEventListener('keydown', escapeHandler);

            // Animate in
            requestAnimationFrame(() => {
                this.overlay.style.opacity = '1';
                this.dialog.style.transform = 'scale(1) translateY(0)';
            });

            // Focus management
            confirmBtn.focus();
        }

        close(confirmed) {
            if (!this.overlay) return;

            this.overlay.style.opacity = '0';
            this.dialog.style.transform = 'scale(0.8) translateY(20px)';

            setTimeout(() => {
                if (this.overlay && this.overlay.parentNode) {
                    this.overlay.parentNode.removeChild(this.overlay);
                }
                this.overlay = null;
                this.dialog = null;
                
                if (this.resolve) {
                    this.resolve(confirmed);
                    this.resolve = null;
                }
            }, 300);
        }
    }

    // Initialize confirmation dialog
    const confirmDialog = new ConfirmationDialog();
    window.showConfirm = (title, message, options) => confirmDialog.show(title, message, options);

    // --- ENHANCED ERROR HANDLING ---
    class ErrorHandler {
        static handle(error, context = 'Unknown', showToUser = true) {
            const timestamp = new Date().toISOString();
            const errorInfo = {
                message: error.message || 'Unknown error',
                context,
                timestamp,
                stack: error.stack,
                userAgent: navigator.userAgent
            };

            // Log to console
            console.error(`[${context}] Error at ${timestamp}:`, error);

            // Store in local storage for debugging
            try {
                const errors = JSON.parse(localStorage.getItem('silent-operator-errors') || '[]');
                errors.push(errorInfo);
                // Keep only last 10 errors
                if (errors.length > 10) {
                    errors.shift();
                }
                localStorage.setItem('silent-operator-errors', JSON.stringify(errors));
            } catch (storageError) {
                console.error('Failed to store error info:', storageError);
            }

            // Show user-friendly message
            if (showToUser) {
                const userMessage = this.getUserFriendlyMessage(error, context);
                toast.show(userMessage, 'error', 4000);
            }

            // Update app state
            appState.setState({
                lastError: errorInfo
            }, 'ERROR_OCCURRED');

            return errorInfo;
        }

        static getUserFriendlyMessage(error, context) {
            const contextMessages = {
                'QUANTUM_GAME': 'Sızma protokolünde bir hata oluştu. Lütfen tekrar deneyin.',
                'VPN_CONNECTION': 'VPN bağlantısında sorun yaşandı. Bağlantı kontrol ediliyor.',
                'SCAN_OPERATION': 'Tarama işleminde hata oluştu. Sistem yeniden başlatılıyor.',
                'CONFIG_SAVE': 'Ayarlar kaydedilemedi. Yerel depolama kontrol edin.',
                'NETWORK': 'Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin.'
            };

            return contextMessages[context] || 'Beklenmeyen bir hata oluştu. Sistem kurtarılıyor.';
        }

        static getStoredErrors() {
            try {
                return JSON.parse(localStorage.getItem('silent-operator-errors') || '[]');
            } catch {
                return [];
            }
        }

        static clearStoredErrors() {
            localStorage.removeItem('silent-operator-errors');
        }
    }

    // Global error handler
    window.addEventListener('error', (event) => {
        ErrorHandler.handle(event.error, 'GLOBAL_ERROR', false);
    });

    window.addEventListener('unhandledrejection', (event) => {
        ErrorHandler.handle(new Error(event.reason), 'UNHANDLED_PROMISE', false);
    });

    // Make error handler globally available
    window.handleError = ErrorHandler.handle.bind(ErrorHandler);

    // Navigation with accessibility support
    navItems.forEach((item, index) => {
        item.addEventListener('click', (e) => {
            switchToPage(item);
        });
        
        // Keyboard navigation support
        item.addEventListener('keydown', (e) => {
            handleNavKeydown(e, index);
        });
    });

    function switchToPage(selectedItem) {
        const targetId = selectedItem.getAttribute('data-page');
        
        // Update active states
        navItems.forEach(item => {
            item.classList.remove('active');
            item.setAttribute('aria-selected', 'false');
            item.setAttribute('tabindex', '-1');
        });
        
        selectedItem.classList.add('active');
        selectedItem.setAttribute('aria-selected', 'true');
        selectedItem.setAttribute('tabindex', '0');
        
        // Update page visibility
        pages.forEach(p => p.classList.remove('active'));
        
        const targetPage = document.getElementById(targetId);
        if (targetPage) targetPage.classList.add('active');
    }

    function handleNavKeydown(e, currentIndex) {
        let targetIndex = currentIndex;
        
        switch(e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                targetIndex = currentIndex > 0 ? currentIndex - 1 : navItems.length - 1;
                break;
            case 'ArrowRight':
                e.preventDefault();
                targetIndex = currentIndex < navItems.length - 1 ? currentIndex + 1 : 0;
                break;
            case 'Home':
                e.preventDefault();
                targetIndex = 0;
                break;
            case 'End':
                e.preventDefault();
                targetIndex = navItems.length - 1;
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                switchToPage(navItems[currentIndex]);
                return;
            default:
                return;
        }
        
        navItems[targetIndex].focus();
        switchToPage(navItems[targetIndex]);
    }

    if (closeBtn) closeBtn.addEventListener('click', closeUI);

    window.addEventListener('message', (event) => {
        const data = event.data;
        if (data.action === 'open') {
            app.style.display = 'flex';
        } else if (data.action === 'close') {
            app.style.display = 'none';
            stopQuantumGame();
        } else if (data.action === 'updateStatus' && data.ip) {
            const ipEl = document.querySelector('.ip-address');
            if (ipEl) ipEl.innerText = data.ip;
        }
    });

    async function closeUI() {
        try {
            const confirmed = await showConfirm(
                'Sistemi Kapat',
                'Silent Operator sistemini kapatmak istediğinizden emin misiniz?',
                {
                    type: 'danger',
                    confirmText: 'Kapat',
                    cancelText: 'İptal'
                }
            );
            
            if (confirmed) {
                // Clean up all systems
                stopQuantumGame();
                cleanupAllEventListeners();
                
                const resourceName = window.GetParentResourceName ? window.GetParentResourceName() : 'fivem-hacker-script';
                fetch(`https://${resourceName}/closeUI`, { method: 'POST', body: JSON.stringify({}) });
                
                showToast('Sistem güvenli şekilde kapatılıyor...', 'info', 2000);
            }
        } catch (error) {
            window.handleError(error, 'CLOSE_UI', true);
        }
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeUI();
            return;
        }
        
        // Game controls
        if (e.code === 'Space' && quantumState.active) {
            e.preventDefault();
            unlockLayer();
            return;
        }
        
        // Focus management - Tab trap within the application
        if (e.key === 'Tab') {
            handleTabNavigation(e);
        }
    });

    function handleTabNavigation(e) {
        const focusableElements = document.querySelectorAll(
            'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const focusableArray = Array.from(focusableElements);
        const currentIndex = focusableArray.indexOf(document.activeElement);
        
        if (e.shiftKey) {
            // Shift + Tab (backward)
            if (currentIndex <= 0) {
                e.preventDefault();
                focusableArray[focusableArray.length - 1].focus();
            }
        } else {
            // Tab (forward)
            if (currentIndex >= focusableArray.length - 1) {
                e.preventDefault();
                focusableArray[0].focus();
            }
        }
    }

    // --- QUANTUM LOCK MINIGAME ---
    let canvas, ctx;
    
    let quantumState = {
        active: false,
        level: 0,
        maxLevels: 3,
        rings: [],
        ball: { r: 5, angle: 0, speed: 0, active: false, progress: 0 },
        animationId: null,
        dirty: false,
        lastRenderTime: 0,
        timeouts: [],
        intervals: []
    };

    // Lazy load game elements
    function getGameElements() {
        if (!domCache.gameContainer) {
            domCache.gameContainer = document.querySelector('.hack-container-inner');
        }
        if (!domCache.injectBtn) {
            domCache.injectBtn = document.getElementById('btn-inject');
        }
        return {
            gameContainer: domCache.gameContainer,
            injectBtn: domCache.injectBtn
        };
    }

    // --- LOADING STATE UTILITY ---
    function showLoadingState(button, text = 'Yükleniyor...') {
        const originalText = button.innerText;
        const originalBg = button.style.background;
        
        button.disabled = true;
        button.innerText = text;
        button.style.background = 'var(--accent-warning)';
        
        // Add loading animation
        button.style.position = 'relative';
        button.style.overflow = 'hidden';
        
        const loadingOverlay = document.createElement('div');
        loadingOverlay.style.cssText = `
            position: absolute;
            top: 0; left: -100%;
            width: 100%; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            animation: loading-sweep 1.5s infinite;
        `;
        button.appendChild(loadingOverlay);
        
        // Add loading animation CSS
        if (!document.querySelector('#loading-animations')) {
            const loadingStyles = document.createElement('style');
            loadingStyles.id = 'loading-animations';
            loadingStyles.textContent = `
                @keyframes loading-sweep {
                    0% { left: -100%; }
                    100% { left: 100%; }
                }
            `;
            document.head.appendChild(loadingStyles);
        }
        
        return () => {
            button.disabled = false;
            button.innerText = originalText;
            button.style.background = originalBg;
            if (loadingOverlay && loadingOverlay.parentNode) {
                loadingOverlay.parentNode.removeChild(loadingOverlay);
            }
        };
    }

    // --- RIPPLE EFFECT UTILITY ---
    function addRippleEffect(element, type = 'default') {
        const ripple = document.createElement('div');
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        
        const colors = {
            default: 'rgba(0, 243, 255, 0.3)',
            success: 'rgba(16, 185, 129, 0.3)',
            error: 'rgba(239, 68, 68, 0.3)',
            warning: 'rgba(245, 158, 11, 0.3)'
        };
        
        ripple.style.cssText = `
            position: absolute;
            top: 50%; left: 50%;
            width: ${size}px; height: ${size}px;
            border-radius: 50%;
            background: ${colors[type] || colors.default};
            transform: translate(-50%, -50%) scale(0);
            animation: rippleEffect 0.6s ease-out;
            pointer-events: none;
            z-index: 1000;
        `;
        
        // Add ripple animation CSS
        if (!document.querySelector('#ripple-animations')) {
            const rippleStyles = document.createElement('style');
            rippleStyles.id = 'ripple-animations';
            rippleStyles.textContent = `
                @keyframes rippleEffect {
                    0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
                    100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
                }
            `;
            document.head.appendChild(rippleStyles);
        }
        
        element.style.position = element.style.position || 'relative';
        element.appendChild(ripple);
        
        setTimeout(() => {
            if (ripple && ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        }, 600);
    }

    // Initialize inject button with managed event listener
    const gameElements = getGameElements();
    if (gameElements.injectBtn) {
        addManagedEventListener(gameElements.injectBtn, 'click', initQuantumGame);
    }

    async function initQuantumGame() {
        if (quantumState.active) return;
        
        try {
            const confirmed = await showConfirm(
                'Sızma Protokolü',
                'Hedef sistemine sızma işlemini başlatmak istediğinizden emin misiniz? Bu işlem tespit edilebilir.',
                {
                    type: 'warning',
                    confirmText: 'Başlat',
                    cancelText: 'İptal'
                }
            );
            
            if (!confirmed) return;
            
            const { gameContainer, injectBtn } = getGameElements();
            if (!gameContainer || !injectBtn) return;
            
            // Show loading state
            const hideLoading = showLoadingState(injectBtn, 'Protokol başlatılıyor...');
            
            setTimeout(() => {
                try {
                    hideLoading();
                    
                    quantumState.active = true;
                    quantumState.level = 0;
                    quantumState.dirty = true;
                    
                    injectBtn.innerText = "KİLİDİ KIR [SPACE]";
                    injectBtn.style.background = "var(--accent-warning)";
                    injectBtn.style.color = "black";
                    injectBtn.disabled = false;

                    // Canvas Setup with responsive sizing
                    gameContainer.innerHTML = '';
                    canvas = document.createElement('canvas');
                    
                    // Responsive canvas size
                    const maxSize = Math.min(400, window.innerWidth * 0.8, window.innerHeight * 0.6);
                    canvas.width = maxSize;
                    canvas.height = maxSize;
                    
                    canvas.style.borderRadius = '50%';
                    canvas.style.background = 'rgba(0,0,0,0.3)';
                    canvas.style.boxShadow = '0 0 30px rgba(0, 243, 255, 0.1)';
                    canvas.style.maxWidth = '90vw';
                    canvas.style.maxHeight = '90vw';
                    canvas.style.willChange = 'transform';
                    
                    gameContainer.appendChild(canvas);
                    ctx = canvas.getContext('2d');

                    createRings();
                    lastTime = performance.now();
                    gameLoop(lastTime);
                    
                    showToast('Sızma protokolü aktif', 'success', 2000);
                    
                    // Update app state
                    appState.setState({ isGameActive: true }, 'QUANTUM_GAME_STARTED');
                    
                } catch (error) {
                    window.handleError(error, 'QUANTUM_GAME', true);
                    resetGameUI();
                }
            }, 1000);
            
        } catch (error) {
            window.handleError(error, 'QUANTUM_GAME_INIT', true);
        }
    }

    function createRings() {
        quantumState.rings = [];
        const isHard = CONFIG.difficulty === 'HARD';

        for(let i=0; i<quantumState.maxLevels; i++) {
            // Zorluk Ayarları
            let baseSpeed = 0.02 + (i * 0.01);
            let gapSize = Math.PI / 4; // 45 derece (Kolay)
            let jitterSpeed = 0;

            if (isHard) {
                baseSpeed = 0.04 + (i * 0.02); // Daha hızlı
                gapSize = (Math.PI / 6) - (i * 0.1); // Çok daha dar (30 derece ve altı)
                jitterSpeed = 0.05 + (Math.random() * 0.05);
            }

            const direction = Math.random() > 0.5 ? 1 : -1;
            
            quantumState.rings.push({
                radius: 150 - (i * 40),
                angle: Math.random() * Math.PI * 2,
                baseSpeed: baseSpeed * direction,
                gapSize: gapSize,
                jitterPhase: Math.random() * Math.PI,
                jitterSpeed: jitterSpeed
            });
        }
    }

    // FPS Kontrolü
    let lastTime = 0;
    const targetFPS = 60;
    const frameInterval = 1000 / targetFPS;

    function gameLoop(timestamp) {
        if (!quantumState.active) {
            if (quantumState.animationId) {
                cancelAnimationFrame(quantumState.animationId);
                quantumState.animationId = null;
            }
            return;
        }

        quantumState.animationId = requestAnimationFrame(gameLoop);

        // Delta Time Kontrolü
        const deltaTime = timestamp - lastTime;
        if (deltaTime < frameInterval) return;

        lastTime = timestamp - (deltaTime % frameInterval);

        // Only render if game state is dirty (performance optimization)
        if (!quantumState.dirty && timestamp - quantumState.lastRenderTime < 16) {
            return;
        }

        quantumState.dirty = false;
        quantumState.lastRenderTime = timestamp;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const isHard = CONFIG.difficulty === 'HARD';

        quantumState.rings.forEach((ring, index) => {
            if (index >= quantumState.level) {
                // Sadece Hard modda hız değişimi (sinusoidal) var
                if (isHard) {
                    ring.jitterPhase += ring.jitterSpeed;
                    const speedVariation = Math.sin(ring.jitterPhase) * 0.02;
                    ring.angle += ring.baseSpeed + speedVariation;
                } else {
                    ring.angle += ring.baseSpeed; // Sabit hız
                }
            }

            // Draw Ring
            ctx.beginPath();
            ctx.arc(cx, cy, ring.radius, ring.angle + ring.gapSize/2, ring.angle + Math.PI*2 - ring.gapSize/2);
            
            // Renkler
            if (index < quantumState.level) ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)'; 
            else if (index === quantumState.level) ctx.strokeStyle = '#00f3ff'; 
            else ctx.strokeStyle = 'rgba(255,255,255,0.1)'; 
            
            ctx.lineWidth = 12;
            ctx.lineCap = 'round';
            ctx.stroke();
            
            if (index === quantumState.level) {
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#00f3ff';
                ctx.stroke();
                ctx.shadowBlur = 0;
            }
        });

        // Entry Marker
        const cxTarget = cx + 160;
        ctx.beginPath();
        ctx.moveTo(cx + 180, cy);
        ctx.lineTo(cxTarget, cy);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Projectile
        if (quantumState.ball.active) {
            quantumState.ball.progress += 12;
            const currentRadius = 160 - quantumState.ball.progress;
            
            ctx.beginPath();
            ctx.arc(cx + currentRadius, cy, 6, 0, Math.PI*2);
            ctx.fillStyle = '#ff0055';
            ctx.fill();
            
            const activeRing = quantumState.rings[quantumState.level];
            
            if (activeRing && currentRadius <= activeRing.radius + 6 && currentRadius >= activeRing.radius - 6) {
                let ringAngle = activeRing.angle % (Math.PI*2);
                if(ringAngle < 0) ringAngle += Math.PI*2;
                
                let diff = Math.abs(ringAngle - 0);
                if (diff > Math.PI) diff = Math.PI*2 - diff;
                
                if (diff < activeRing.gapSize / 2) {
                    quantumState.level++;
                    quantumState.ball.active = false;
                    quantumState.ball.progress = 0;
                    
                    if(quantumState.level >= quantumState.maxLevels) winGame();
                } else {
                    failGame();
                }
            }
        } else {
            ctx.beginPath();
            ctx.arc(cx + 170, cy, 4, 0, Math.PI*2);
            ctx.fillStyle = '#00f3ff';
            ctx.fill();
        }

        // Core Status (Difficulty Indicator)
        ctx.beginPath();
        ctx.arc(cx, cy, 25, 0, Math.PI*2);
        ctx.fillStyle = '#1e1e24';
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.stroke();
        
        ctx.fillStyle = isHard ? '#ff0055' : '#10b981'; // Zorluk rengi
        ctx.font = 'bold 10px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(CONFIG.difficulty, cx, cy - 5);
        ctx.fillStyle = 'white';
        ctx.fillText(`${quantumState.level}/${quantumState.maxLevels}`, cx, cy + 8);
    }

    function unlockLayer() {
        if (quantumState.ball.active) return;
        quantumState.ball.active = true;
        quantumState.ball.progress = 0;
        quantumState.dirty = true;
    }

    function failGame() {
        quantumState.active = false;
        if (quantumState.animationId) {
            cancelAnimationFrame(quantumState.animationId);
            quantumState.animationId = null;
        }
        
        const { injectBtn } = getGameElements();
        if (injectBtn) {
            injectBtn.innerText = "BAĞLANTI HATASI";
            injectBtn.style.background = "var(--accent-red)";
            injectBtn.disabled = true;
        }
        
        // Enhanced shake animation with ripple effect
        if (canvas) {
            canvas.style.willChange = 'transform';
            canvas.style.transform = "translateX(10px)";
            
            // Add ripple effect
            addRippleEffect(canvas, 'error');
            
            const shakeTimeouts = [
                setTimeout(() => canvas && (canvas.style.transform = "translateX(-10px)"), 50),
                setTimeout(() => canvas && (canvas.style.transform = "translateX(5px)"), 100),
                setTimeout(() => {
                    if (canvas) {
                        canvas.style.transform = "none";
                        canvas.style.willChange = 'auto';
                    }
                }, 150)
            ];
            
            quantumState.timeouts.push(...shakeTimeouts);
        }

        // Show failure notification
        showToast('Sızma tespit edildi! Sistem korunuyor...', 'error', 3000);
        
        // Update app state
        appState.setState({
            isGameActive: false,
            lastAction: 'GAME_FAILED'
        }, 'QUANTUM_GAME_FAILED');

        const resetTimeout = setTimeout(resetGameUI, 1500);
        quantumState.timeouts.push(resetTimeout);
    }

    function winGame() {
        quantumState.active = false;
        if (quantumState.animationId) {
            cancelAnimationFrame(quantumState.animationId);
            quantumState.animationId = null;
        }
        
        const { injectBtn } = getGameElements();
        if (injectBtn) {
            injectBtn.innerText = "ERİŞİM ONAYLANDI";
            injectBtn.style.background = "var(--accent-green)";
            injectBtn.disabled = true;
        }
        
        // Add success ripple effect
        if (canvas) {
            addRippleEffect(canvas, 'success');
        }
        
        // Show success notification
        showToast('Sistem başarıyla ele geçirildi!', 'success', 3000);
        
        // Update app state
        appState.setState({
            isGameActive: false,
            user: {
                ...appState.getState().user,
                reputation: appState.getState().user.reputation + 100
            }
        }, 'QUANTUM_GAME_WON');
        
        const winTimeout = setTimeout(showDataReveal, 800);
        quantumState.timeouts.push(winTimeout);
    }

    function showDataReveal() {
        const { gameContainer, injectBtn } = getGameElements();
        
        gameContainer.innerHTML = '';
        
        const terminal = document.createElement('div');
        Object.assign(terminal.style, {
            width: "100%", height: "100%", fontFamily: "monospace", padding: "20px",
            color: "#00f3ff", overflowY: "auto", background: "rgba(0,0,0,0.8)", borderRadius: "8px", fontSize: "0.9rem"
        });
        
        terminal.innerHTML = `
            <div style="color:var(--accent-warning)">> ROOT ERİŞİMİ SAĞLANDI...</div>
            <div style="color:var(--accent-warning)">> ŞİFRELEME ÇÖZÜLÜYOR... [AES-256]</div>
            <br>
        `;
        gameContainer.appendChild(terminal);

        const leakedData = [
            { type: "SMS", from: "Bilinmeyen", msg: "Teslimat noktası değişti. Eski fabrika, gece yarısı." },
            { type: "BANKA", from: "Maze Bank", msg: "Hesap Özeti: -$120,000 (Offshore Transfer)" },
            { type: "GPS", from: "Araç", msg: "Son Konum: Vinewood Hills, Garaj." },
            { type: "NOT", from: "Sistem", msg: "Güvenlik Protokolü: Devre Dışı" }
        ];

        let i = 0;
        const interval = setInterval(() => {
            if (i >= leakedData.length) {
                clearInterval(interval);
                terminal.innerHTML += `<br><div style="color:var(--accent-green)">> İNDİRME TAMAMLANDI. (Veri Veritabanına Eklendi)</div>`;
                if (injectBtn) {
                    injectBtn.innerText = "GÖREV TAMAMLANDI";
                    injectBtn.style.background = "var(--accent-blue)";
                }
                
                const resourceName = window.GetParentResourceName ? window.GetParentResourceName() : 'fivem-hacker-script';
                fetch(`https://${resourceName}/hackResult`, { method: 'POST', body: JSON.stringify({ success: true }) });
                return;
            }
            const d = leakedData[i];
            terminal.innerHTML += `
                <div style="margin-bottom:8px; border-left: 2px solid var(--accent-primary); padding-left:8px; animation: slideIn 0.3s;">
                    <span style="color:#64748b">[${d.type}]</span> <span style="color:white; font-weight:bold;">${d.from}</span><br>
                    <span style="opacity:0.8; color:#ccc;">"${d.msg}"</span>
                </div>
            `;
            terminal.scrollTop = terminal.scrollHeight;
            i++;
        }, 1000);
    }

    function stopQuantumGame() {
        quantumState.active = false;
        quantumState.dirty = false;
        
        // Clean up all animation frames
        if (quantumState.animationId) {
            cancelAnimationFrame(quantumState.animationId);
            quantumState.animationId = null;
        }
        
        // Clean up all timeouts
        quantumState.timeouts.forEach(clearTimeout);
        quantumState.timeouts = [];
        
        // Clean up all intervals
        quantumState.intervals.forEach(clearInterval);
        quantumState.intervals = [];
        
        // Clean up canvas optimizations
        if (canvas) {
            canvas.style.willChange = 'auto';
        }
    }

    function resetGameUI() {
        const { gameContainer, injectBtn } = getGameElements();
        
        if (gameContainer) {
            gameContainer.innerHTML = `
                <div style="color: var(--text-secondary); text-align: center; padding: 20px; display: flex; align-items: center; justify-content: center; height: 100%;">
                    Sızma protokolünü başlatmak için hazır.
                </div>
            `;
        }
        
        if (injectBtn) {
            injectBtn.innerText = "DİZİLİMİ BAŞLAT";
            injectBtn.style.background = "var(--accent-primary)";
            injectBtn.disabled = false;
        }
    }

    // --- RADAR SCANNING LOGIC ---
    // Lazy load radar elements for performance
    function getRadarElements() {
        if (!domCache.btnScan) {
            domCache.btnScan = document.getElementById('btn-scan');
        }
        if (!domCache.targetList) {
            domCache.targetList = document.querySelector('.target-list');
        }
        if (!domCache.radarSweep) {
            domCache.radarSweep = document.querySelector('.radar-sweep');
        }
        if (!domCache.radarStatus) {
            domCache.radarStatus = document.querySelector('.radar-status');
        }
        if (!domCache.targetResults) {
            domCache.targetResults = document.getElementById('target-results');
        }
        
        return {
            btnScan: domCache.btnScan,
            targetList: domCache.targetList,
            radarSweep: domCache.radarSweep,
            radarStatus: domCache.radarStatus,
            targetResults: domCache.targetResults
        };
    }
    
    // Initialize scan button with managed event listener
    const radarElements = getRadarElements();
    if (radarElements.btnScan) {
        addManagedEventListener(radarElements.btnScan, 'click', async () => {
            try {
                const confirmed = await showConfirm(
                    'Radar Tarama',
                    'Yerel ağda hedef taraması yapmak istediğinizden emin misiniz? Bu işlem tespit edilebilir.',
                    {
                        type: 'warning',
                        confirmText: 'Tara',
                        cancelText: 'İptal'
                    }
                );
                
                if (!confirmed) return;
                
                // Get fresh references to elements
                const elements = getRadarElements();
                if (!elements.radarSweep || !elements.radarStatus || !elements.targetResults || !elements.targetList) {
                    throw new Error('Radar UI elementleri bulunamadı');
                }
                
                // Add ripple effect to button
                addRippleEffect(elements.btnScan, 'default');
                
                // Show loading state
                const hideLoading = showLoadingState(elements.btnScan, 'Taranıyor...');
                
                // Start radar animation
                elements.radarSweep.style.display = 'block';
                elements.radarStatus.innerText = "TARANIYOR...";
                
                // Update app state
                appState.setState({ isScanning: true }, 'SCAN_STARTED');
                
                // Simulate scanning process
                setTimeout(() => {
                    try {
                        hideLoading();
                        
                        // Stop radar animation
                        elements.radarSweep.style.display = 'none';
                        elements.radarStatus.innerText = "HEDEFLER BULUNDU";
                        elements.targetResults.style.display = 'block';
                        
                        // Clear previous results
                        elements.targetList.innerHTML = '';
                        
                        // Generate dummy targets
                        const scanTargets = [
                            { name: "Michael De Santa", role: "Emekli Suçlu", risk: "YÜKSEK" },
                            { name: "Trevor Philips", role: "Silah Tüccarı", risk: "YÜKSEK" }
                        ];
                        
                        scanTargets.forEach((t) => {
                            const card = document.createElement('button');
                            card.className = 'target-card';
                            card.setAttribute('tabindex', '0');
                            card.setAttribute('aria-label', `${t.name} - ${t.role} - Risk: ${t.risk} - Hack için Enter tuşuna basın`);
                            card.innerHTML = `
                                <div class="target-info"><h4>${t.name}</h4><p>${t.role}</p></div>
                                <span class="hack-target-btn" style="padding:4px 8px; background:var(--accent-primary); border:none; border-radius:4px; cursor:pointer; font-weight:bold; font-size: 0.8rem;">HACK</span>
                            `;
                            elements.targetList.appendChild(card);
                            
                            card.addEventListener('click', async () => {
                                try {
                                    const hackConfirmed = await showConfirm(
                                        'Hedef Saldırısı',
                                        `${t.name} hedefine sızma saldırısı başlatmak istediğinizden emin misiniz?`,
                                        {
                                            type: 'danger',
                                            confirmText: 'Saldır',
                                            cancelText: 'İptal'
                                        }
                                    );
                                    
                                    if (hackConfirmed) {
                                        addRippleEffect(card, 'warning');
                                        const hackNavItem = document.querySelector('.nav-item[data-page="hacktools"]');
                                        switchToPage(hackNavItem);
                                        setTimeout(initQuantumGame, 500);
                                        showToast(`${t.name} hedefi seçildi`, 'info', 2000);
                                    }
                                } catch (error) {
                                    window.handleError(error, 'TARGET_HACK', true);
                                }
                            });
                            
                            card.addEventListener('keydown', (e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    card.click();
                                }
                            });
                        });
                        
                        showToast(`${scanTargets.length} hedef bulundu`, 'success', 2000);
                        
                        // Update app state
                        appState.setState({
                            isScanning: false,
                            lastAction: 'SCAN_COMPLETED'
                        }, 'SCAN_COMPLETED');
                        
                    } catch (error) {
                        window.handleError(error, 'SCAN_OPERATION_COMPLETE', true);
                    }
                }, 3000);
                
            } catch (error) {
                window.handleError(error, 'SCAN_OPERATION', true);
            }
        });
    }

    // --- VPN List Logic with Accessibility ---
    const vpnRows = document.querySelectorAll('.vpn-row');
    vpnRows.forEach((row, index) => {
        row.addEventListener('click', () => {
            selectVPN(row);
        });
        
        row.addEventListener('keydown', (e) => {
            handleVPNKeydown(e, index);
        });
    });

    async function selectVPN(selectedRow) {
        try {
            const vpnName = selectedRow.querySelector('div div:first-child').textContent;
            const confirmed = await showConfirm(
                'VPN Değişikliği',
                `${vpnName} VPN sunucusuna geçmek istediğinizden emin misiniz? Mevcut bağlantı kesilecek.`,
                {
                    type: 'info',
                    confirmText: 'Bağlan',
                    cancelText: 'İptal'
                }
            );
            
            if (!confirmed) return;
            
            // Add ripple effect
            addRippleEffect(selectedRow, 'default');
            
            // Show loading state
            const loadingElement = document.createElement('span');
            loadingElement.textContent = 'Bağlanıyor...';
            loadingElement.style.cssText = 'color: var(--accent-warning); font-size: 0.8rem;';
            
            const originalContent = selectedRow.querySelector('div:last-child').textContent;
            selectedRow.querySelector('div:last-child').textContent = '';
            selectedRow.querySelector('div:last-child').appendChild(loadingElement);
            
            setTimeout(() => {
                vpnRows.forEach(row => {
                    row.classList.remove('active');
                    row.setAttribute('aria-pressed', 'false');
                });
                selectedRow.classList.add('active');
                selectedRow.setAttribute('aria-pressed', 'true');
                
                // Restore original content
                selectedRow.querySelector('div:last-child').textContent = originalContent;
                
                showToast(`${vpnName} bağlantısı kuruldu`, 'success', 2000);
                
                // Update app state
                appState.setState({
                    network: {
                        ...appState.getState().network,
                        vpn: vpnName.toLowerCase().replace(' ', '-')
                    }
                }, 'VPN_CHANGED');
                
            }, 1500);
            
        } catch (error) {
            window.handleError(error, 'VPN_CONNECTION', true);
        }
    }

    function handleVPNKeydown(e, currentIndex) {
        let targetIndex = currentIndex;
        
        switch(e.key) {
            case 'ArrowUp':
                e.preventDefault();
                targetIndex = currentIndex > 0 ? currentIndex - 1 : vpnRows.length - 1;
                break;
            case 'ArrowDown':
                e.preventDefault();
                targetIndex = currentIndex < vpnRows.length - 1 ? currentIndex + 1 : 0;
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                selectVPN(vpnRows[currentIndex]);
                return;
            default:
                return;
        }
        
        vpnRows[targetIndex].focus();
    }
});
