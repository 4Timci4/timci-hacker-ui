document.addEventListener('DOMContentLoaded', () => {
    // --- OYUN AYARLARI ---
    const CONFIG = {
        difficulty: 'EASY', // Seçenekler: 'EASY', 'HARD'
        colors: {
            easy: '#10b981', // Yeşil
            hard: '#ff0055'  // Kırmızı
        }
    };

    const app = document.getElementById('app');
    
    if (window.invokeNative) {
        app.style.display = 'none';
    }

    const navItems = document.querySelectorAll('.nav-item[data-page]');
    const pages = document.querySelectorAll('.page');
    const closeBtn = document.getElementById('close-btn');

    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const targetId = item.getAttribute('data-page');
            
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            pages.forEach(p => p.classList.remove('active'));
            
            const targetPage = document.getElementById(targetId);
            if (targetPage) targetPage.classList.add('active');
        });
    });

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

    function closeUI() {
        const resourceName = window.GetParentResourceName ? window.GetParentResourceName() : 'fivem-hacker-script';
        fetch(`https://${resourceName}/closeUI`, { method: 'POST', body: JSON.stringify({}) });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeUI();
        if (e.code === 'Space' && quantumState.active) {
            e.preventDefault();
            unlockLayer();
        }
    });

    // --- QUANTUM LOCK MINIGAME ---
    const gameContainer = document.querySelector('.hack-container-inner');
    const injectBtn = document.getElementById('btn-inject');
    let canvas, ctx;
    
    let quantumState = {
        active: false,
        level: 0,
        maxLevels: 3,
        rings: [], 
        ball: { r: 5, angle: 0, speed: 0, active: false, progress: 0 },
        animationId: null
    };

    if (injectBtn) {
        injectBtn.addEventListener('click', initQuantumGame);
    }

    function initQuantumGame() {
        if (quantumState.active) return;
        quantumState.active = true;
        quantumState.level = 0;
        
        injectBtn.innerText = "KİLİDİ KIR [SPACE]";
        injectBtn.style.background = "var(--accent-warning)";
        injectBtn.style.color = "black";

        // Canvas Setup
        gameContainer.innerHTML = '';
        canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        canvas.style.borderRadius = '50%';
        canvas.style.background = 'rgba(0,0,0,0.3)';
        canvas.style.boxShadow = '0 0 30px rgba(0, 243, 255, 0.1)';
        gameContainer.appendChild(canvas);
        ctx = canvas.getContext('2d');

        createRings();
        gameLoop();
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

    function gameLoop() {
        if (!quantumState.active) return;

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

        quantumState.animationId = requestAnimationFrame(gameLoop);
    }

    function unlockLayer() {
        if (quantumState.ball.active) return;
        quantumState.ball.active = true;
        quantumState.ball.progress = 0;
    }

    function failGame() {
        quantumState.active = false;
        cancelAnimationFrame(quantumState.animationId);
        injectBtn.innerText = "BAĞLANTI HATASI";
        injectBtn.style.background = "var(--accent-red)";
        
        canvas.style.transform = "translateX(10px)";
        setTimeout(() => canvas.style.transform = "translateX(-10px)", 50);
        setTimeout(() => canvas.style.transform = "translateX(5px)", 100);
        setTimeout(() => canvas.style.transform = "none", 150);

        setTimeout(resetGameUI, 1500);
    }

    function winGame() {
        quantumState.active = false;
        cancelAnimationFrame(quantumState.animationId);
        injectBtn.innerText = "ERİŞİM ONAYLANDI";
        injectBtn.style.background = "var(--accent-green)";
        setTimeout(showDataReveal, 800);
    }

    function showDataReveal() {
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
                injectBtn.innerText = "GÖREV TAMAMLANDI";
                injectBtn.style.background = "var(--accent-blue)";
                
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
        if (quantumState.animationId) cancelAnimationFrame(quantumState.animationId);
    }

    function resetGameUI() {
        gameContainer.innerHTML = `
            <div style="color: var(--text-secondary); text-align: center; padding: 20px; display: flex; align-items: center; justify-content: center; height: 100%;">
                Sızma protokolünü başlatmak için hazır.
            </div>
        `;
        injectBtn.innerText = "DİZİLİMİ BAŞLAT";
        injectBtn.style.background = "var(--accent-primary)";
    }

    // --- OTHER UI LOGIC ---
    const btnScan = document.getElementById('btn-scan');
    const targetList = document.querySelector('.target-list');
    
    if (btnScan) {
        btnScan.addEventListener('click', () => {
            document.querySelector('.radar-sweep').style.display = 'block';
            document.querySelector('.radar-status').innerText = "TARANIYOR...";
            
            setTimeout(() => {
                document.querySelector('.radar-sweep').style.display = 'none';
                document.querySelector('.radar-status').innerText = "HEDEFLER BULUNDU";
                document.getElementById('target-results').style.display = 'block';
                
                targetList.innerHTML = '';
                const dummyTargets = [
                    { name: "Michael De Santa", role: "Emekli Suçlu", risk: "YÜKSEK" },
                    { name: "Trevor Philips", role: "Silah Tüccarı", risk: "YÜKSEK" }
                ];
                
                dummyTargets.forEach(t => {
                    const card = document.createElement('div');
                    card.className = 'target-card';
                    card.innerHTML = `
                        <div class="target-info"><h4>${t.name}</h4><p>${t.role}</p></div>
                        <button class="hack-target-btn" style="padding:4px 8px; background:var(--accent-primary); border:none; border-radius:4px; cursor:pointer; font-weight:bold;">HACK</button>
                    `;
                    targetList.appendChild(card);
                    
                    card.querySelector('.hack-target-btn').addEventListener('click', () => {
                        document.querySelector('.nav-item[data-page="hacktools"]').click();
                        setTimeout(initQuantumGame, 500);
                    });
                });
            }, 3000);
        });
    }

    // --- VPN List Logic ---
    const vpnRows = document.querySelectorAll('.vpn-row');
    vpnRows.forEach(row => {
        row.addEventListener('click', () => {
            vpnRows.forEach(r => {
                r.classList.remove('active');
            });
            row.classList.add('active');
        });
    });
});
