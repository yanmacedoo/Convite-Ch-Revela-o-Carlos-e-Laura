/* ==========================================================================
   CONFIGURAÇÃO GERAL (FÁCIL EDICAO)
   ========================================================================== */
const CONFIG = {
    // Número do WhatsApp dos pais para confirmação de presença (formato internacional sem + ou -)
    whatsappNumber: "5581999999999", // SUBSTITUA pelo número correto
    
    // Mensagem padrão de confirmação no WhatsApp
    whatsappMessage: "Olá! Gostaria de confirmar minha presença no Chá Revelação do Carlos André e Laura! 💖💙",
    
    // Link do Google Maps para o local do evento (Praia de Pratigi)
    locationMapsUrl: "https://maps.google.com/?q=Praia+de+Pratigi", // SUBSTITUA pelo link exato se necessário
    
    // Chave PIX dos pais para presentes virtuais/fraldas
    pixKey: "charevelacao@email.com", // SUBSTITUA pela chave correta
    
    // Mídias do projeto e seus respectivos tamanhos exatos em bytes (para cálculo de carregamento preciso)
    mediaFiles: [
        { id: "envelope", url: "assets/envelope.png", type: "image", size: 998510 },
        { id: "card", url: "assets/card_convite.png", type: "image", size: 2154409 },
        { id: "music", url: "assets/musica_fundo.m4a", type: "audio", size: 2730012 },
        { id: "video", url: "assets/video_abertura.mp4", type: "video", size: 14249012 }
    ]
};

/* ==========================================================================
   VARIÁVEIS DE ESTADO GLOBAL
   ========================================================================== */
const blobUrls = {};
let isMuted = false;
let currentVolume = 0.5;

// Seletores do DOM
const DOM = {
    loadingScreen: document.getElementById("loading-screen"),
    envelopeScreen: document.getElementById("envelope-screen"),
    videoScreen: document.getElementById("video-screen"),
    invitationScreen: document.getElementById("invitation-screen"),
    
    progressBar: document.getElementById("loader-progress-bar"),
    progressPercentage: document.getElementById("loader-percentage"),
    btnOpenInvitation: document.getElementById("btn-open-invitation"),
    
    introVideo: document.getElementById("intro-video"),
    btnSkipVideo: document.getElementById("btn-skip-video"),
    
    bgMusic: document.getElementById("bg-music"),
    btnVolumeControl: document.getElementById("btn-volume-control"),
    
    btnConfirmar: document.getElementById("btn-whatsapp-confirm"),
    btnLocalizacao: document.getElementById("btn-maps-location"),
    
    btnOpenDressCode: document.getElementById("btn-open-dresscode"),
    btnOpenGifts: document.getElementById("btn-open-gifts"),
    
    modalDressCode: document.getElementById("modal-dresscode"),
    modalGifts: document.getElementById("modal-gifts"),
    
    btnCopyPix: document.getElementById("btn-copy-pix"),
    pixKeyText: document.getElementById("pix-key-text"),
    
    particlesContainer: document.getElementById("particles-js")
};

/* ==========================================================================
   INICIALIZAÇÃO DO SITE E PRÉ-CARREGAMENTO
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
    // Definir links dinâmicos no HTML
    DOM.btnConfirmar.href = `https://api.whatsapp.com/send?phone=${CONFIG.whatsappNumber}&text=${encodeURIComponent(CONFIG.whatsappMessage)}`;
    DOM.btnLocalizacao.href = CONFIG.locationMapsUrl;
    DOM.pixKeyText.textContent = CONFIG.pixKey;
    
    // Iniciar pré-carregamento
    preloadMedia();
    
    // Configurar ouvintes de eventos
    setupEventListeners();
});

/* ==========================================================================
   LÓGICA DE PRÉ-CARREGAMENTO COM PROGRESSO REAL
   ========================================================================== */
async function preloadMedia() {
    const totalBytesExpected = CONFIG.mediaFiles.reduce((acc, file) => acc + file.size, 0);
    let totalBytesLoaded = 0;
    const loadedBytesMap = {};
    
    // Inicializa o mapa de progresso por arquivo
    CONFIG.mediaFiles.forEach(file => {
        loadedBytesMap[file.id] = 0;
    });

    // Função para atualizar a barra de progresso no DOM
    function updateProgress() {
        totalBytesLoaded = Object.values(loadedBytesMap).reduce((acc, val) => acc + val, 0);
        const percentage = Math.min(100, Math.floor((totalBytesLoaded / totalBytesExpected) * 100));
        
        // Atualiza a porcentagem de texto
        DOM.progressPercentage.textContent = `${percentage}%`;
        
        // Atualiza o círculo de progresso SVG (dashoffset de 283 a 0)
        const circumference = 283;
        const offset = circumference - (percentage / 100) * circumference;
        DOM.progressBar.style.strokeDashoffset = offset;
    }

    // Função para baixar uma mídia individual usando XMLHttpRequest (estável no iOS e com controle de erro robusto)
    function downloadFile(file) {
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.open("GET", file.url, true);
            xhr.responseType = "blob";
            
            // Define timeout de 25 segundos para conexões lentas móveis
            xhr.timeout = 25000;

            xhr.onprogress = function(event) {
                if (event.lengthComputable) {
                    loadedBytesMap[file.id] = Math.min(file.size, (event.loaded / event.total) * file.size);
                } else {
                    loadedBytesMap[file.id] = Math.min(file.size, event.loaded);
                }
                updateProgress();
            };

            xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status < 300 && xhr.response) {
                    const blob = xhr.response;
                    blobUrls[file.id] = URL.createObjectURL(blob);
                } else {
                    console.warn(`Erro HTTP ${xhr.status} ao carregar ${file.url}. Usando fallback.`);
                    blobUrls[file.id] = file.url; // Fallback para URL direta
                }
                loadedBytesMap[file.id] = file.size;
                updateProgress();
                resolve();
            };

            xhr.onerror = function() {
                console.error(`Erro de rede ao carregar ${file.url}. Usando fallback.`);
                blobUrls[file.id] = file.url; // Fallback para URL direta
                loadedBytesMap[file.id] = file.size;
                updateProgress();
                resolve();
            };

            xhr.ontimeout = function() {
                console.warn(`Timeout ao carregar ${file.url}. Usando fallback.`);
                blobUrls[file.id] = file.url; // Fallback para URL direta
                loadedBytesMap[file.id] = file.size;
                updateProgress();
                resolve();
            };

            xhr.send();
        });
    }

    // Executa o download de todas as mídias em paralelo
    const downloadPromises = CONFIG.mediaFiles.map(file => downloadFile(file));
    await Promise.all(downloadPromises);
    
    // Garante que todos marquem 100% no fim
    CONFIG.mediaFiles.forEach(file => {
        loadedBytesMap[file.id] = file.size;
    });
    updateProgress();
    
    // Pequena pausa para sensação visual agradável antes de liberar
    setTimeout(() => {
        transitionToEnvelope();
    }, 800);
}

/* ==========================================================================
   TRANSICÕES DE TELA E GERENCIAMENTO DE ESTADOS
   ========================================================================== */

// Transição do carregamento para o envelope
function transitionToEnvelope() {
    // Aplicar URLs do Blob nos elementos de mídia correspondentes
    const envelopeImg = document.querySelector(".envelope-img");
    envelopeImg.src = blobUrls["envelope"];
    
    // Ocultar loader e exibir envelope
    DOM.loadingScreen.classList.remove("active");
    DOM.envelopeScreen.classList.add("active");
}

// Transição do envelope para o vídeo
function startInvitationFlow() {
    // Configura o áudio e vídeo com os Blob URLs corretos
    DOM.introVideo.src = blobUrls["video"];
    DOM.bgMusic.src = blobUrls["music"];
    
    // Configura volumes iniciais
    DOM.bgMusic.volume = 0.5;
    DOM.introVideo.volume = 1.0;
    
    // Tenta reproduzir a música e o vídeo simultaneamente
    // Nota: Como o usuário acabou de interagir (clique no envelope), o play() é permitido.
    DOM.bgMusic.play().catch(e => console.log("Áudio bloqueado ou falhou:", e));
    DOM.introVideo.play().catch(e => console.log("Vídeo bloqueado ou falhou:", e));
    
    // Transiciona as telas
    DOM.envelopeScreen.classList.remove("active");
    DOM.videoScreen.classList.add("active");
    
    // Quando o vídeo acabar, vai para a tela principal
    DOM.introVideo.onended = () => {
        transitionToMainInvitation();
    };
}

// Transição do vídeo para o convite principal
function transitionToMainInvitation() {
    // Pausa e reseta o vídeo
    DOM.introVideo.pause();
    DOM.introVideo.onended = null;
    
    // Aplica o Blob URL na imagem do convite principal
    const invitationImg = document.querySelector(".invitation-img");
    invitationImg.src = blobUrls["card"];
    
    // Transiciona as telas
    DOM.videoScreen.classList.remove("active");
    DOM.invitationScreen.classList.add("active");
    
    // Cria as partículas de luz decorativas na tela do convite
    createParticles();
    
    // Transição suave de volume da música de fundo (50% para 100%)
    if (!isMuted) {
        fadeAudioVolume(DOM.bgMusic, 1.0, 1500);
    }
}

// Função para fazer transição suave (fade) de volume no elemento de áudio
function fadeAudioVolume(audio, targetVolume, duration = 1500) {
    const startVolume = audio.volume;
    const difference = targetVolume - startVolume;
    if (difference === 0) return;
    
    const stepMs = 50;
    const steps = duration / stepMs;
    const increment = difference / steps;
    let currentStep = 0;
    
    const interval = setInterval(() => {
        currentStep++;
        const newVolume = startVolume + (increment * currentStep);
        audio.volume = Math.max(0, Math.min(1.0, newVolume));
        
        if (currentStep >= steps) {
            audio.volume = targetVolume;
            clearInterval(interval);
        }
    }, stepMs);
}

/* ==========================================================================
   INTERATIVIDADE E CONTROLES (VOLUME, MODAIS, COPIAR)
   ========================================================================== */
function setupEventListeners() {
    // Clique na tela do envelope
    DOM.btnOpenInvitation.addEventListener("click", () => {
        startInvitationFlow();
    });
    
    // Clique para pular o vídeo
    DOM.btnSkipVideo.addEventListener("click", () => {
        transitionToMainInvitation();
    });
    
    // Controle de volume (mutar/desmutar)
    DOM.btnVolumeControl.addEventListener("click", () => {
        toggleMute();
    });
    
    // Modais - Abertura
    DOM.btnOpenDressCode.addEventListener("click", () => {
        openModal(DOM.modalDressCode);
    });
    
    DOM.btnOpenGifts.addEventListener("click", () => {
        openModal(DOM.modalGifts);
    });
    
    // Modais - Fechamento
    document.querySelectorAll(".btn-close-modal").forEach(btn => {
        btn.addEventListener("click", (e) => {
            closeModal(e.target.closest(".modal-overlay"));
        });
    });
    
    // Fechar modais ao clicar fora da caixa do modal
    document.querySelectorAll(".modal-overlay").forEach(overlay => {
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) {
                closeModal(overlay);
            }
        });
    });
    
    // Copiar chave PIX
    DOM.btnCopyPix.addEventListener("click", () => {
        copyPixKey();
    });
}

// Controle de mudo
function toggleMute() {
    isMuted = !isMuted;
    
    const iconOn = DOM.btnVolumeControl.querySelector("svg path:last-child");
    const iconOff = DOM.btnVolumeControl.querySelector("svg path:first-child");
    
    if (isMuted) {
        // Reduz volume a zero suavemente
        fadeAudioVolume(DOM.bgMusic, 0, 500);
        // Exibe ícone de mutado
        iconOn.style.display = "none";
        iconOff.style.display = "block";
    } else {
        // Aumenta volume ao máximo suavemente (1.0 na tela do convite, ou 0.5 nas outras)
        const targetVol = DOM.invitationScreen.classList.contains("active") ? 1.0 : 0.5;
        fadeAudioVolume(DOM.bgMusic, targetVol, 500);
        // Exibe ícone de tocando
        iconOn.style.display = "block";
        iconOff.style.display = "none";
    }
}

// Abrir Modal
function openModal(modal) {
    modal.classList.add("active");
    // Trava rolagem do fundo
    document.body.style.overflow = "hidden";
}

// Fechar Modal
function closeModal(modal) {
    modal.classList.remove("active");
    // Libera rolagem do fundo
    document.body.style.overflow = "";
}

// Lógica de cópia de chave PIX
function copyPixKey() {
    navigator.clipboard.writeText(CONFIG.pixKey).then(() => {
        const copyText = document.getElementById("copy-text");
        const originalText = copyText.textContent;
        
        // Altera interface para sucesso
        DOM.btnCopyPix.classList.add("copied");
        copyText.textContent = "Copiado!";
        
        // Reseta após 2 segundos
        setTimeout(() => {
            DOM.btnCopyPix.classList.remove("copied");
            copyText.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error("Erro ao copiar PIX: ", err);
    });
}

/* ==========================================================================
   GERAÇÃO DE PARTÍCULAS CSS DE CORAÇÃO E LUZ
   ========================================================================== */
function createParticles() {
    const particleCount = 20;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement("div");
        particle.classList.add("particle");
        
        // Tamanho aleatório (entre 4px e 12px)
        const size = Math.random() * 8 + 4;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        // Posição inicial horizontal aleatória (%)
        particle.style.left = `${Math.random() * 100}%`;
        
        // Atraso de animação aleatório (entre 0 e 10s) para as partículas subirem em momentos diferentes
        particle.style.animationDelay = `${Math.random() * 10}s`;
        
        // Duração da animação aleatória (entre 8s e 15s)
        particle.style.animationDuration = `${Math.random() * 7 + 8}s`;
        
        // Opacidade inicial aleatória
        particle.style.opacity = Math.random() * 0.5 + 0.2;
        
        // Adiciona ao container
        DOM.particlesContainer.appendChild(particle);
    }
}
