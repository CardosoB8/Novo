class WheelOfFortune {
    constructor() {
        this.canvas = document.getElementById('wheelCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.spinButton = document.getElementById('spinButton');
        this.statusMessage = document.getElementById('statusMessage');
        this.prizeDisplay = document.getElementById('prizeDisplay');
        this.prizeAmount = document.getElementById('prizeAmount');
        this.claimButton = document.getElementById('claimButton');
        this.alreadyPlayedWarning = document.getElementById('alreadyPlayedWarning');
        this.previousPrize = document.getElementById('previousPrize');
        this.wheelContainer = document.getElementById('wheelContainer');
        this.spinSound = document.getElementById('spinSound');
        this.winSound = document.getElementById('winSound');

        // Prize configuration - reorganizada para melhor distribuição visual
        this.prizes = [
            { amount: 200, color: '#45B7D1', textColor: '#FFFFFF' },
            { amount: 5000, color: '#96CEB4', textColor: '#FFFFFF' },
            { amount: 500, color: '#4ECDC4', textColor: '#FFFFFF' },
            { amount: 10000, color: '#FF9FF3', textColor: '#000000' },
            { amount: 1000, color: '#FF6B6B', textColor: '#FFFFFF' },
            { amount: 3000, color: '#FCEA2B', textColor: '#000000' }
        ];

        // Sistema de pesos para aleatoriedade mais realista
        this.prizeWeights = [30, 15, 25, 5, 20, 10]; // Pesos correspondentes aos prêmios
        // 200 MZN: 30% chance, 500 MZN: 25% chance, 1000 MZN: 20% chance
        // 3000 MZN: 10% chance, 5000 MZN: 15% chance, 10000 MZN: 5% chance

        this.isSpinning = false;
        this.hasPlayed = false;
        this.currentRotation = 0;
        this.finalRotation = 0;
        
        this.init();
    }

    init() {
        this.checkPreviousPlay();
        this.drawWheel();
        this.setupEventListeners();
        this.setupAudio();
    }

    checkPreviousPlay() {
        const savedData = localStorage.getItem('wheelOfFortune');
        if (savedData) {
            const data = JSON.parse(savedData);
            this.hasPlayed = true;
            this.showAlreadyPlayedWarning(data.prize);
            this.disableSpinButton();
        }
    }

    setupEventListeners() {
        this.spinButton.addEventListener('click', () => this.handleSpin());
        this.claimButton.addEventListener('click', () => this.handleClaim());
        
        // Keyboard accessibility
        this.spinButton.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.handleSpin();
            }
        });
    }

    setupAudio() {
        // Create audio context for better browser support
        this.audioContext = null;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Audio context not supported');
        }
    }

    drawWheel() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 10;
        const sliceAngle = (2 * Math.PI) / this.prizes.length;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw outer ring
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius + 5, 0, 2 * Math.PI);
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fill();
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetY = 5;

        // Draw wheel slices - starting from top (12 o'clock)
        this.prizes.forEach((prize, index) => {
            const startAngle = (index * sliceAngle) - (Math.PI / 2);
            const endAngle = ((index + 1) * sliceAngle) - (Math.PI / 2);

            // Draw slice
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            this.ctx.lineTo(centerX, centerY);
            this.ctx.fillStyle = prize.color;
            this.ctx.fill();
            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();

            // Draw text
            this.ctx.save();
            this.ctx.translate(centerX, centerY);
            this.ctx.rotate(startAngle + sliceAngle / 2);
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillStyle = prize.textColor;
            this.ctx.font = 'bold 18px Poppins, sans-serif';
            this.ctx.fillText(`${prize.amount}`, radius * 0.7, 0);
            this.ctx.font = 'bold 14px Poppins, sans-serif';
            this.ctx.fillText('MZN', radius * 0.7, 20);
            this.ctx.restore();
        });

        // Reset shadow
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetY = 0;

        // Draw center circle
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fill();
        this.ctx.strokeStyle = '#CCCCCC';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    handleSpin() {
        if (this.isSpinning || this.hasPlayed) {
            if (this.hasPlayed) {
                this.showAlreadyPlayedWarning();
            }
            return;
        }

        this.isSpinning = true;
        this.disableSpinButton();
        this.hideMessages();
        this.updateStatus('Girando a roleta...', 'text-yellow-300');

        // Play spin sound
        this.playSound(this.spinSound);

        // ALEATORIEDADE COM PESOS: Prêmios maiores têm menor chance
        const selectedPrizeIndex = this.getWeightedRandomPrize();
        const degreesPerSlice = 360 / this.prizes.length;
        
        // Calcular rotação para que o prêmio selecionado pare no ponteiro
        const minSpins = 5 + Math.random() * 3; // 5-8 voltas
        const prizeCenter = selectedPrizeIndex * degreesPerSlice + (degreesPerSlice / 2);
        
        // Adicionar variação aleatória dentro da fatia para parecer mais natural
        const variation = (Math.random() - 0.5) * (degreesPerSlice * 0.6);
        const targetAngle = prizeCenter + variation;
        
        const totalRotation = (minSpins * 360) + targetAngle;
        
        // Armazenar rotação final para cálculo preciso
        this.finalRotation = totalRotation;
        
        console.log(`Prêmio selecionado por peso: ${this.prizes[selectedPrizeIndex].amount} MZN (índice: ${selectedPrizeIndex})`);

        // Apply CSS animation
        this.wheelContainer.style.setProperty('--spin-degrees', `${totalRotation}deg`);
        this.wheelContainer.classList.add('wheel-spinning');

        // Handle spin completion
        setTimeout(() => {
            this.handleSpinComplete();
        }, 4000);
    }

    handleSpinComplete() {
        this.isSpinning = false;
        this.hasPlayed = true;
        this.wheelContainer.classList.remove('wheel-spinning');

        // Play win sound
        this.playSound(this.winSound);

        // DETECTAR VISUALMENTE qual prêmio está no ponteiro
        const winningPrize = this.detectPrizeAtPointer();

        // Save to localStorage
        const gameData = {
            prize: winningPrize.amount,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem('wheelOfFortune', JSON.stringify(gameData));

        // Show the exact prize detected at pointer position
        this.showPrize(winningPrize.amount);
        this.updateStatus('Parabéns! Você ganhou!', 'text-green-400');
        
        console.log(`Detecção visual: Prêmio no ponteiro = ${winningPrize.amount} MZN`);
    }

    detectPrizeAtPointer() {
        // Calcular exatamente qual fatia está sob o ponteiro após a rotação
        const finalAngle = this.finalRotation % 360;
        const degreesPerSlice = 360 / this.prizes.length; // 60° por fatia
        
        // O ponteiro está no topo (0°). A roda foi desenhada com:
        // - Fatia 0 (1000 MZN) iniciando no topo e indo até 60°
        // - Fatia 1 (500 MZN) de 60° até 120°
        // - E assim por diante...
        
        // Após a rotação, determinar qual fatia está agora no topo
        // Como a roda gira no sentido horário:
        let normalizedAngle = (360 - finalAngle) % 360;
        if (normalizedAngle < 0) normalizedAngle += 360;
        
        const sliceIndex = Math.floor(normalizedAngle / degreesPerSlice) % this.prizes.length;
        
        console.log(`Rotação final: ${finalAngle}°, Ângulo normalizado: ${normalizedAngle}°, Fatia: ${sliceIndex}`);
        
        return this.prizes[sliceIndex];
    }

    getWeightedRandomPrize() {
        // Implementa seleção aleatória com pesos
        const totalWeight = this.prizeWeights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < this.prizeWeights.length; i++) {
            random -= this.prizeWeights[i];
            if (random <= 0) {
                return i;
            }
        }
        
        // Fallback (não deveria acontecer)
        return 0;
    }

    showPrize(amount) {
        this.prizeAmount.textContent = `${amount.toLocaleString()} MZN`;
        this.prizeDisplay.classList.remove('hidden');
        this.prizeDisplay.classList.add('prize-highlight');
    }

    showAlreadyPlayedWarning(previousAmount = null) {
        if (previousAmount) {
            this.previousPrize.textContent = `Seu prêmio anterior: ${previousAmount.toLocaleString()} MZN`;
        }
        this.alreadyPlayedWarning.classList.remove('hidden');
        this.statusMessage.classList.add('hidden');
    }

    hideMessages() {
        this.prizeDisplay.classList.add('hidden');
        this.alreadyPlayedWarning.classList.add('hidden');
    }

    updateStatus(message, textClass = 'text-white') {
        this.statusMessage.innerHTML = `
            <p class="${textClass} text-lg font-medium px-6 py-3 bg-white bg-opacity-20 rounded-full backdrop-blur-sm">
                ${message}
            </p>
        `;
        this.statusMessage.classList.remove('hidden');
    }

    disableSpinButton() {
        this.spinButton.disabled = true;
        this.spinButton.classList.add('opacity-50', 'cursor-not-allowed');
        this.spinButton.innerHTML = '<i class="fas fa-lock text-2xl"></i>';
    }

    handleClaim() {
        // External link for prize claiming
        const claimUrl = 'https://media1.placard.co.mz/redirect.aspx?pid=3900&bid=1690';
        
        // Show confirmation before redirecting
        if (confirm('Você será redirecionado para resgatar seu prêmio. Continuar?')) {
            window.open(claimUrl, '_blank');
        }
    }

    playSound(audioElement) {
        try {
            // Reset audio to beginning
            audioElement.currentTime = 0;
            
            // Play with promise handling for better browser support
            const playPromise = audioElement.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log('Audio play failed:', error);
                    // Fallback: try to enable audio on user interaction
                    this.enableAudioOnInteraction();
                });
            }
        } catch (error) {
            console.log('Audio error:', error);
        }
    }

    enableAudioOnInteraction() {
        const enableAudio = () => {
            this.spinSound.play().then(() => {
                this.spinSound.pause();
                this.spinSound.currentTime = 0;
            }).catch(() => {});
            
            this.winSound.play().then(() => {
                this.winSound.pause();
                this.winSound.currentTime = 0;
            }).catch(() => {});
            
            // Remove event listeners after enabling
            document.removeEventListener('click', enableAudio);
            document.removeEventListener('touchstart', enableAudio);
        };

        document.addEventListener('click', enableAudio);
        document.addEventListener('touchstart', enableAudio);
    }

    // Method to reset the game (for testing purposes)
    resetGame() {
        localStorage.removeItem('wheelOfFortune');
        location.reload();
    }
}

// Initialize the wheel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const wheel = new WheelOfFortune();
    
    // Expose reset method for debugging (remove in production)
    window.resetWheel = () => wheel.resetGame();
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Pause any ongoing animations if page is hidden
            if (wheel.isSpinning) {
                wheel.wheelContainer.style.animationPlayState = 'paused';
            }
        } else {
            // Resume animations when page becomes visible
            if (wheel.isSpinning) {
                wheel.wheelContainer.style.animationPlayState = 'running';
            }
        }
    });
    
    // Handle orientation changes on mobile
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            wheel.drawWheel();
        }, 100);
    });
    
    // Handle window resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            wheel.drawWheel();
        }, 250);
    });
});

// Service Worker registration for offline support (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .catch(error => console.log('SW registration failed'));
    });
}

// Error handling for unhandled promise rejections
window.addEventListener('unhandledrejection', event => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
});

// Global error handler
window.addEventListener('error', event => {
    console.error('Global error:', event.error);
});
