/* ==========================================================================
   CONFIGURAÇÃO GERAL (FÁCIL EDICAO)
   ========================================================================== */
const CONFIG = {
    // Número do WhatsApp dos pais para confirmação de presença (formato internacional sem + ou -)
    whatsappNumber: "5581999999999", // SUBSTITUA pelo número correto
    
    // Mensagem padrão de confirmação no WhatsApp
    whatsappMessage: "Olá! Gostaria de confirmar minha presença no Chá Revelação do Carlos André e Laura! 💖💙",
    

    
    // Chave PIX dos pais para presentes virtuais/fraldas
    pixKey: "charevelacao@email.com", // SUBSTITUA pela chave correta
    
    // Mídias do projeto e seus respectivos tamanhos exatos em bytes (para cálculo de carregamento preciso)
    mediaFiles: [
        { id: "envelope", url: "assets/envelope.png", type: "image", size: 2458013 },
        { id: "card", url: "assets/card_convite.png", type: "image", size: 2154409 },
        { id: "music", url: "assets/musica_fundo.m4a", type: "audio", size: 2730012 },
        { id: "video", url: "assets/video_abertura.mp4", type: "video", size: 14358892 }
    ]
};

/* ==========================================================================
   VARIÁVEIS DE ESTADO GLOBAL
   ========================================================================== */
/* ==========================================================================
   VARIÁVEIS DE ESTADO GLOBAL E REFERÊNCIAS DO DOM
   ========================================================================== */
const blobUrls = {};
let isMuted = false;
let currentVolume = 0.5;

// Variáveis de Banco de Dados (Firebase ou LocalStorage)
let db = null;
let isFirebaseMode = false;

// Variáveis da Web Audio API para tocar música em paralelo no iOS sem conflito com o vídeo
let audioCtx = null;
let audioBuffer = null;
let audioSource = null;
let gainNode = null;

// Objeto global que conterá as referências do DOM após a inicialização
const DOM = {};

function initDOMReferences() {
    DOM.loadingScreen = document.getElementById("loading-screen");
    DOM.envelopeScreen = document.getElementById("envelope-screen");
    DOM.videoScreen = document.getElementById("video-screen");
    DOM.invitationScreen = document.getElementById("invitation-screen");
    
    DOM.progressBar = document.getElementById("loader-progress-bar");
    DOM.progressPercentage = document.getElementById("loader-percentage");
    DOM.btnOpenInvitation = document.getElementById("btn-open-invitation");
    
    DOM.introVideo = document.getElementById("intro-video");
    DOM.btnSkipVideo = document.getElementById("btn-skip-video");
    
    DOM.bgMusic = document.getElementById("bg-music");
    DOM.btnVolumeControl = document.getElementById("btn-volume-control");
    
    DOM.btnConfirmar = document.getElementById("btn-whatsapp-confirm");
    DOM.btnLocalizacao = document.getElementById("btn-maps-location");
    
    DOM.btnOpenDressCode = document.getElementById("btn-open-dresscode");
    DOM.btnOpenGifts = document.getElementById("btn-open-gifts");
    
    DOM.modalDressCode = document.getElementById("modal-dresscode");
    DOM.modalGifts = document.getElementById("modal-gifts");
    
    DOM.btnCopyPix = document.getElementById("btn-copy-pix");
    DOM.pixKeyText = document.getElementById("pix-key-text");
    
    DOM.particlesContainer = document.getElementById("particles-js");
    DOM.transitionOverlay = document.getElementById("white-transition-overlay");
    
    // Referências do Modal de RSVP (Confirmação de Presença)
    DOM.modalConfirm = document.getElementById("modal-confirm");
    DOM.btnOpenConfirm = document.getElementById("btn-open-confirm");
    DOM.rsvpForm = document.getElementById("rsvp-form");
    DOM.btnAddCompanion = document.getElementById("btn-add-companion");
    DOM.companionsContainer = document.getElementById("companions-container");
    DOM.rsvpFormContainer = document.getElementById("rsvp-form-container");
    DOM.rsvpSuccessContainer = document.getElementById("rsvp-success-container");
    DOM.btnCloseSuccess = document.getElementById("btn-close-success");
}

/* ==========================================================================
   INICIALIZAÇÃO DO SITE E PRÉ-CARREGAMENTO
   ========================================================================== */
function init() {
    console.log("Inicializando convite digital...");
    
    // 1. Inicializa todas as referências do DOM de forma segura
    initDOMReferences();
    
    // Valida se os elementos vitais do loader estão presentes
    if (!DOM.loadingScreen || !DOM.progressPercentage || !DOM.progressBar) {
        console.error("Erro crítico: Elementos de carregamento não encontrados no DOM.");
        return;
    }

    // 2. Inicializa o Banco de Dados (Firebase ou LocalStorage)
    initDatabase();

    // 3. Definir links dinâmicos no HTML
    if (DOM.btnConfirmar) {
        DOM.btnConfirmar.href = `https://api.whatsapp.com/send?phone=${CONFIG.whatsappNumber}&text=${encodeURIComponent(CONFIG.whatsappMessage)}`;
    }
    if (DOM.btnLocalizacao) {
        DOM.btnLocalizacao.href = CONFIG.locationMapsUrl;
    }
    if (DOM.pixKeyText) {
        DOM.pixKeyText.textContent = CONFIG.pixKey;
    }
    
    // 4. Configurar ouvintes de eventos
    setupEventListeners();
    
    // 5. Iniciar pré-carregamento das mídias
    preloadMedia();
}

// Inicialização segura à prova de falhas de carregamento diferido (Vite / defer)
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}

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
                    
                    // Se for a música de fundo, decodifica também como ArrayBuffer para a Web Audio API
                    if (file.id === "music") {
                        const reader = new FileReader();
                        reader.onload = function() {
                            const arrayBuffer = reader.result;
                            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                            if (!audioCtx) audioCtx = new AudioContextClass();
                            
                            audioCtx.decodeAudioData(arrayBuffer, function(buffer) {
                                audioBuffer = buffer;
                                console.log("Música decodificada com sucesso para a Web Audio API.");
                            }, function(e) {
                                console.error("Erro ao decodificar áudio na Web Audio API:", e);
                            });
                        };
                        reader.readAsArrayBuffer(blob);
                    }
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

// Função para iniciar a música de fundo usando a Web Audio API (contorna restrições de concorrência do iOS)
function playMusicWebAudio(initialVolume) {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!audioCtx) audioCtx = new AudioContextClass();

        // Resume o contexto se estiver suspenso (exigência dos navegadores)
        if (audioCtx.state === "suspended") {
            audioCtx.resume();
        }

        if (audioBuffer) {
            // Se já houver um áudio tocando, interrompe
            if (audioSource) {
                try { audioSource.stop(); } catch(e) {}
            }

            audioSource = audioCtx.createBufferSource();
            audioSource.buffer = audioBuffer;
            audioSource.loop = true;

            // Cria o controle de ganho (volume)
            gainNode = audioCtx.createGain();
            gainNode.gain.setValueAtTime(initialVolume, audioCtx.currentTime);

            // Conexões: Fonte -> Volume -> Alto-falantes
            audioSource.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            audioSource.start(0);
            console.log("Web Audio API: Trilha iniciada a " + (initialVolume * 100) + "% de volume.");
        } else {
            console.warn("Áudio não decodificado a tempo. Usando fallback tradicional.");
            DOM.bgMusic.src = CONFIG.mediaFiles.find(f => f.id === "music").url;
            DOM.bgMusic.volume = initialVolume;
            DOM.bgMusic.play().catch(e => console.log("Fallback de áudio tradicional falhou:", e));
        }
    } catch (err) {
        console.error("Falha ao configurar Web Audio API:", err);
    }
}

// Faz o fade de volume linear nativo na Web Audio API
function fadeMusicVolumeWebAudio(targetVolume, durationSeconds = 1.5) {
    if (gainNode && audioCtx) {
        // Cancela agendamentos futuros e estabiliza volume atual
        gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
        gainNode.gain.setValueAtTime(gainNode.gain.value, audioCtx.currentTime);
        // Executa a rampa linear de volume
        gainNode.gain.linearRampToValueAtTime(targetVolume, audioCtx.currentTime + durationSeconds);
        console.log(`Web Audio API: Fade de volume agendado para ${targetVolume} em ${durationSeconds}s.`);
    }
}

// Transição do envelope para o vídeo
function startInvitationFlow() {
    // Configura o vídeo
    DOM.introVideo.src = CONFIG.mediaFiles.find(f => f.id === "video").url;
    DOM.introVideo.volume = 1.0;
    
    // 1. Toca a música de fundo usando a Web Audio API a 20% de volume
    playMusicWebAudio(0.2);
    
    // 2. Aguarda 150ms para inicializar o vídeo de abertura com áudio.
    // Isso dá tempo ao sistema operacional móvel para mixar os dois canais sem rejeição.
    setTimeout(() => {
        DOM.introVideo.play()
            .then(() => console.log("Vídeo de abertura iniciado com sucesso."))
            .catch(e => console.log("Vídeo bloqueado pelo navegador:", e));
    }, 150);
    
    // Transiciona as telas
    DOM.envelopeScreen.classList.remove("active");
    DOM.videoScreen.classList.add("active");
    
    // Quando o vídeo acabar, vai para a tela principal
    DOM.introVideo.onended = () => {
        transitionToMainInvitation();
    };
}

// Transição do vídeo para o convite principal (com fade em branco suave)
function transitionToMainInvitation() {
    // 1. Inicia o fade-in do overlay branco
    if (DOM.transitionOverlay) {
        DOM.transitionOverlay.classList.add("active");
    }
    
    // 2. Aguarda a transição de fade-in branca terminar (500ms)
    setTimeout(() => {
        // Pausa e reseta o vídeo
        DOM.introVideo.pause();
        DOM.introVideo.onended = null;
        
        // Aplica o Blob URL na imagem do convite principal
        const invitationImg = document.querySelector(".invitation-img");
        invitationImg.src = blobUrls["card"];
        
        // Transiciona as telas por baixo do painel branco
        DOM.videoScreen.classList.remove("active");
        DOM.invitationScreen.classList.add("active");
        
        // Cria as partículas de luz decorativas
        createParticles();
        
        // Sobe o volume da música de 30% para 100% de forma suave
        if (!isMuted) {
            if (gainNode) {
                fadeMusicVolumeWebAudio(1.0, 1.5);
            } else {
                DOM.bgMusic.play().catch(() => {});
                fadeAudioVolume(DOM.bgMusic, 1.0, 1500);
            }
        }
        
        // 3. Após renderizar as telas, inicia o fade-out do branco
        setTimeout(() => {
            if (DOM.transitionOverlay) {
                DOM.transitionOverlay.classList.remove("active");
            }
        }, 100);
    }, 500);
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
   INTERATIVIDADE E GERENCIAMENTO DE DADOS
   ========================================================================== */

// Inicializa o Firebase Firestore ou define o modo de compatibilidade LocalStorage
function initDatabase() {
    if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "SUA_API_KEY") {
        try {
            // Inicializa o Firebase
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            db = firebase.firestore();
            isFirebaseMode = true;
            console.log("Firebase Firestore inicializado com sucesso.");
        } catch (e) {
            console.error("Erro ao inicializar o Firebase. Usando modo de compatibilidade LocalStorage:", e);
            isFirebaseMode = false;
        }
    } else {
        isFirebaseMode = false;
        console.log("Credenciais do Firebase não configuradas. Rodando no modo LocalStorage.");
    }
}

// Configura os ouvintes de eventos
function setupEventListeners() {
    // Clique na tela do envelope
    if (DOM.btnOpenInvitation) {
        DOM.btnOpenInvitation.addEventListener("click", () => {
            startInvitationFlow();
        });
    }
    
    // Clique para pular o vídeo
    if (DOM.btnSkipVideo) {
        DOM.btnSkipVideo.addEventListener("click", () => {
            transitionToMainInvitation();
        });
    }
    
    // Controle de volume (mutar/desmutar)
    if (DOM.btnVolumeControl) {
        DOM.btnVolumeControl.addEventListener("click", () => {
            toggleMute();
        });
    }
    
    // Modais - Abertura
    if (DOM.btnOpenConfirm) {
        DOM.btnOpenConfirm.addEventListener("click", () => {
            openModal(DOM.modalConfirm);
        });
    }
    
    if (DOM.btnOpenDressCode) {
        DOM.btnOpenDressCode.addEventListener("click", () => {
            openModal(DOM.modalDressCode);
        });
    }
    
    if (DOM.btnOpenGifts) {
        DOM.btnOpenGifts.addEventListener("click", () => {
            openModal(DOM.modalGifts);
        });
    }
    
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
    
    // Copiar chave PIX (Se o botão existir)
    if (DOM.btnCopyPix) {
        DOM.btnCopyPix.addEventListener("click", () => {
            copyPixKey();
        });
    }

    // --- Ouvintes do Modal de RSVP (Confirmação de Presença) ---
    if (DOM.btnAddCompanion) {
        DOM.btnAddCompanion.addEventListener("click", () => {
            addCompanionInput();
        });
    }

    if (DOM.rsvpForm) {
        DOM.rsvpForm.addEventListener("submit", (e) => {
            e.preventDefault();
            submitRSVP();
        });
    }

    if (DOM.btnCloseSuccess) {
        DOM.btnCloseSuccess.addEventListener("click", () => {
            closeModal(DOM.modalConfirm);
            // Reseta o modal de confirmação para o estado inicial de formulário após fechar
            setTimeout(() => {
                DOM.rsvpFormContainer.style.display = "block";
                DOM.rsvpSuccessContainer.style.display = "none";
                DOM.rsvpForm.reset();
                if (DOM.companionsContainer) DOM.companionsContainer.innerHTML = "";
            }, 400);
        });
    }
}

// Cria um campo de texto dinâmico para acompanhante com botão de remoção
function addCompanionInput() {
    if (!DOM.companionsContainer) return;
    
    const row = document.createElement("div");
    row.className = "companion-input-row";
    
    const input = document.createElement("input");
    input.type = "text";
    input.className = "input-field companion-name-input";
    input.placeholder = "Nome do acompanhante";
    input.required = true;
    
    const btnRemove = document.createElement("button");
    btnRemove.type = "button";
    btnRemove.className = "btn-remove-companion";
    btnRemove.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width: 16px; height: 16px;">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
    `;
    
    btnRemove.onclick = function() {
        row.style.animation = "slideDown 0.2s reverse cubic-bezier(0.16, 1, 0.3, 1) forwards";
        setTimeout(() => {
            row.remove();
        }, 200);
    };
    
    row.appendChild(input);
    row.appendChild(btnRemove);
    DOM.companionsContainer.appendChild(row);
    
    // Foca automaticamente no campo criado
    input.focus();
}

// Envia a confirmação de presença (salva no Firestore ou no LocalStorage)
function submitRSVP() {
    const guestNameInput = document.getElementById("guest-name");
    if (!guestNameInput) return;
    
    const guestName = guestNameInput.value.trim();
    if (!guestName) return;
    
    // Coleta o nome de todos os acompanhantes
    const companionInputs = document.querySelectorAll(".companion-name-input");
    const companions = [];
    companionInputs.forEach(input => {
        const name = input.value.trim();
        if (name) companions.push(name);
    });
    
    // Objeto padrão de dados para gravação
    const rsvpId = Math.random().toString(36).substr(2, 9); // ID temporário para o modo LocalStorage
    
    if (isFirebaseMode && db) {
        // Modo Firebase Cloud: Grava no Firestore
        db.collection("confirmacoes").add({
            nome: guestName,
            acompanhantes: companions,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            console.log("Presença registrada no Firestore.");
            showRsvpSuccess();
        })
        .catch(err => {
            console.error("Falha ao salvar no Firestore. Salvando localmente como backup:", err);
            saveToLocalStorage({ id: rsvpId, nome: guestName, acompanhantes: companions, timestamp: new Date().toISOString() });
        });
    } else {
        // Modo Demo: Salva localmente no navegador
        saveToLocalStorage({ id: rsvpId, nome: guestName, acompanhantes: companions, timestamp: new Date().toISOString() });
    }
}

// Salva a presença no LocalStorage (Modo Demo ou Backup offline)
function saveToLocalStorage(data) {
    try {
        let stored = localStorage.getItem("confirmacoes");
        let list = [];
        if (stored) {
            list = JSON.parse(stored);
        }
        list.push(data);
        localStorage.setItem("confirmacoes", JSON.stringify(list));
        console.log("Presença salva localmente no LocalStorage.");
        showRsvpSuccess();
    } catch (e) {
        console.error("Erro ao gravar no LocalStorage:", e);
        // Exibe tela de sucesso de qualquer forma para o usuário final
        showRsvpSuccess();
    }
}

// Exibe a tela de sucesso (feedback visual premium)
function showRsvpSuccess() {
    if (DOM.rsvpFormContainer && DOM.rsvpSuccessContainer) {
        DOM.rsvpFormContainer.style.display = "none";
        DOM.rsvpSuccessContainer.style.display = "block";
    }
}

// Controle de mudo
function toggleMute() {
    isMuted = !isMuted;
    
    const iconOn = DOM.btnVolumeControl.querySelector("svg path:last-child");
    const iconOff = DOM.btnVolumeControl.querySelector("svg path:first-child");
    
    if (isMuted) {
        // Reduz volume a zero suavemente
        if (gainNode) {
            fadeMusicVolumeWebAudio(0, 0.5);
        } else {
            fadeAudioVolume(DOM.bgMusic, 0, 500);
        }
        // Exibe ícone de mutado
        iconOn.style.display = "none";
        iconOff.style.display = "block";
    } else {
        // Aumenta volume ao máximo (1.0 na tela do convite, ou 0.2 no vídeo)
        const targetVol = DOM.invitationScreen.classList.contains("active") ? 1.0 : 0.2;
        if (gainNode) {
            fadeMusicVolumeWebAudio(targetVol, 0.5);
        } else {
            fadeAudioVolume(DOM.bgMusic, targetVol, 500);
        }
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
