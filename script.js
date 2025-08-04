class BowlingGame {
    constructor() {
        this.currentFrame = 1;
        this.currentRoll = 1;
        this.frames = [];
        this.totalScore = 0;
        this.gameComplete = false;
        this.pinsStanding = 10;
        
        // Initialize audio context
        this.audioContext = null;
        this.initializeAudio();
        
        // Initialize frames
        for (let i = 0; i < 10; i++) {
            this.frames.push({
                rolls: [],
                score: 0,
                isStrike: false,
                isSpare: false,
                isComplete: false
            });
        }
        
        this.initializeEventListeners();
        this.updateDisplay();
        this.resetPins();
    }
    
    initializeAudio() {
        // Initialize audio context on first user interaction
        document.addEventListener('click', () => {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
        }, { once: true });
    }
    
    playSound(frequency, duration, type = 'sine', volume = 0.3) {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }
    
    playRollingSound() {
        // Rolling ball sound - low rumbling
        this.playSound(80, 1.0, 'sawtooth', 0.2);
        setTimeout(() => this.playSound(60, 0.5, 'sawtooth', 0.15), 200);
    }
    
    playPinSound(pinsKnocked) {
        // Pin collision sounds
        for (let i = 0; i < pinsKnocked; i++) {
            setTimeout(() => {
                const frequency = 200 + Math.random() * 300;
                this.playSound(frequency, 0.3, 'square', 0.4);
            }, i * 50);
        }
    }
    
    playStrikeSound() {
        // Epic strike sound with explosion
        this.playSound(150, 0.2, 'sawtooth', 0.6);
        setTimeout(() => this.playSound(300, 0.3, 'square', 0.5), 100);
        setTimeout(() => this.playSound(450, 0.4, 'sine', 0.4), 200);
        setTimeout(() => this.playSound(600, 0.5, 'triangle', 0.3), 300);
    }
    
    playSpareSound() {
        // Spare sound - ascending notes
        this.playSound(200, 0.3, 'sine', 0.4);
        setTimeout(() => this.playSound(300, 0.3, 'sine', 0.4), 150);
        setTimeout(() => this.playSound(400, 0.4, 'sine', 0.3), 300);
    }
    
    playBullySound() {
        // Mocking/laughing sound
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.playSound(400 + i * 100, 0.2, 'triangle', 0.3);
            }, i * 150);
        }
    }
    
    playGutterBallSound() {
        // Sad trombone effect
        this.playSound(200, 0.3, 'sawtooth', 0.4);
        setTimeout(() => this.playSound(180, 0.3, 'sawtooth', 0.4), 300);
        setTimeout(() => this.playSound(160, 0.5, 'sawtooth', 0.4), 600);
    }
    
    initializeEventListeners() {
        const rollButton = document.getElementById('roll-button');
        const resetButton = document.getElementById('reset-button');
        const powerSlider = document.getElementById('power');
        const accuracySlider = document.getElementById('accuracy');
        
        rollButton.addEventListener('click', () => this.roll());
        resetButton.addEventListener('click', () => this.resetGame());
        
        powerSlider.addEventListener('input', (e) => {
            document.getElementById('power-value').textContent = e.target.value;
        });
        
        accuracySlider.addEventListener('input', (e) => {
            document.getElementById('accuracy-value').textContent = e.target.value;
        });
    }
    
    roll() {
        if (this.gameComplete) return;
        
        const power = parseInt(document.getElementById('power').value);
        const accuracy = parseInt(document.getElementById('accuracy').value);
        
        // Play rolling sound
        this.playRollingSound();
        
        // Calculate pins knocked down based on power and accuracy with some randomness
        const maxPins = Math.min(this.pinsStanding, 10);
        const baseKnockdown = Math.floor((power * accuracy) / 10);
        const randomFactor = Math.random() * 3 - 1.5; // -1.5 to +1.5
        let pinsKnocked = Math.max(0, Math.min(maxPins, Math.floor(baseKnockdown + randomFactor)));
        
        // Add some chance for perfect strikes with high power/accuracy
        if (power >= 8 && accuracy >= 8 && Math.random() > 0.3 && this.currentRoll === 1) {
            pinsKnocked = Math.min(maxPins, pinsKnocked + 2);
        }
        
        this.animateBall();
        this.knockDownPins(pinsKnocked);
        
        // Play pin collision sound after ball reaches pins
        setTimeout(() => {
            if (pinsKnocked > 0) {
                this.playPinSound(pinsKnocked);
            }
        }, 800);
        
        setTimeout(() => {
            this.processRoll(pinsKnocked);
        }, 1000);
    }
    
    processRoll(pinsKnocked) {
        const frameIndex = this.currentFrame - 1;
        const frame = this.frames[frameIndex];
        
        frame.rolls.push(pinsKnocked);
        this.pinsStanding -= pinsKnocked;
        
        // Check for strike and trigger explosion
        if (pinsKnocked === 10 && this.currentRoll === 1) {
            this.triggerExplosion();
            setTimeout(() => this.playStrikeSound(), 200);
        }
        
        // Check for spare
        if (this.currentRoll === 2 && frame.rolls[0] + pinsKnocked === 10) {
            setTimeout(() => this.playSpareSound(), 300);
        }
        
        // Check for bullying behavior (when player misses badly)
        if (pinsKnocked === 0 && this.currentRoll === 1) {
            this.triggerBullying();
            setTimeout(() => this.playGutterBallSound(), 500);
        }
        
        // Handle 10th frame special rules
        if (this.currentFrame === 10) {
            this.handle10thFrame(pinsKnocked);
        } else {
            this.handleRegularFrame(pinsKnocked);
        }
        
        this.updateDisplay();
        this.updateStatus();
    }
    
    handleRegularFrame(pinsKnocked) {
        const frameIndex = this.currentFrame - 1;
        const frame = this.frames[frameIndex];
        
        if (this.currentRoll === 1) {
            if (pinsKnocked === 10) {
                // Strike
                frame.isStrike = true;
                frame.isComplete = true;
                this.nextFrame();
            } else {
                this.currentRoll = 2;
            }
        } else {
            // Second roll
            if (frame.rolls[0] + pinsKnocked === 10) {
                frame.isSpare = true;
            }
            frame.isComplete = true;
            this.nextFrame();
        }
    }
    
    handle10thFrame(pinsKnocked) {
        const frame = this.frames[9];
        
        if (this.currentRoll === 1) {
            if (pinsKnocked === 10) {
                frame.isStrike = true;
                this.resetPins();
                this.currentRoll = 2;
            } else {
                this.currentRoll = 2;
            }
        } else if (this.currentRoll === 2) {
            if (frame.isStrike || frame.rolls[0] + pinsKnocked === 10) {
                if (!frame.isStrike && frame.rolls[0] + pinsKnocked === 10) {
                    frame.isSpare = true;
                }
                this.resetPins();
                this.currentRoll = 3;
            } else {
                frame.isComplete = true;
                this.gameComplete = true;
            }
        } else {
            // Third roll
            frame.isComplete = true;
            this.gameComplete = true;
        }
    }
    
    nextFrame() {
        this.currentFrame++;
        this.currentRoll = 1;
        this.resetPins();
        
        if (this.currentFrame > 10) {
            this.gameComplete = true;
        }
    }
    
    calculateScores() {
        let totalScore = 0;
        
        for (let i = 0; i < 10; i++) {
            const frame = this.frames[i];
            let frameScore = 0;
            
            if (i < 9) { // Frames 1-9
                if (frame.isStrike) {
                    frameScore = 10;
                    // Add next two rolls as bonus
                    if (i + 1 < 10) {
                        const nextFrame = this.frames[i + 1];
                        if (nextFrame.rolls.length > 0) {
                            frameScore += nextFrame.rolls[0];
                            if (nextFrame.isStrike && i + 2 < 10) {
                                // Next frame is also a strike, get first roll of frame after that
                                const frameAfterNext = this.frames[i + 2];
                                if (frameAfterNext.rolls.length > 0) {
                                    frameScore += frameAfterNext.rolls[0];
                                }
                            } else if (nextFrame.rolls.length > 1) {
                                frameScore += nextFrame.rolls[1];
                            }
                        }
                    }
                } else if (frame.isSpare) {
                    frameScore = 10;
                    // Add next roll as bonus
                    if (i + 1 < 10) {
                        const nextFrame = this.frames[i + 1];
                        if (nextFrame.rolls.length > 0) {
                            frameScore += nextFrame.rolls[0];
                        }
                    }
                } else {
                    frameScore = frame.rolls.reduce((sum, roll) => sum + roll, 0);
                }
            } else { // 10th frame
                frameScore = frame.rolls.reduce((sum, roll) => sum + roll, 0);
            }
            
            totalScore += frameScore;
            frame.score = totalScore;
        }
        
        this.totalScore = totalScore;
    }
    
    updateDisplay() {
        this.calculateScores();
        
        // Update frame displays
        for (let i = 0; i < 10; i++) {
            const frame = this.frames[i];
            const frameElement = document.getElementById(`frame-${i + 1}`);
            
            // Highlight current frame
            if (i + 1 === this.currentFrame && !this.gameComplete) {
                frameElement.classList.add('active');
            } else {
                frameElement.classList.remove('active');
            }
            
            // Update rolls display
            if (i < 9) { // Frames 1-9
                const roll1Element = document.getElementById(`frame-${i + 1}-roll-1`);
                const roll2Element = document.getElementById(`frame-${i + 1}-roll-2`);
                
                if (frame.rolls.length > 0) {
                    if (frame.isStrike) {
                        roll1Element.textContent = 'X';
                        roll1Element.classList.add('strike');
                        roll2Element.textContent = '';
                    } else {
                        roll1Element.textContent = frame.rolls[0] || '-';
                        if (frame.rolls.length > 1) {
                            if (frame.isSpare) {
                                roll2Element.textContent = '/';
                                roll2Element.classList.add('spare');
                            } else {
                                roll2Element.textContent = frame.rolls[1] || '-';
                            }
                        }
                    }
                }
            } else { // 10th frame
                const roll1Element = document.getElementById(`frame-10-roll-1`);
                const roll2Element = document.getElementById(`frame-10-roll-2`);
                const roll3Element = document.getElementById(`frame-10-roll-3`);
                
                if (frame.rolls.length > 0) {
                    roll1Element.textContent = frame.rolls[0] === 10 ? 'X' : (frame.rolls[0] || '-');
                    if (frame.rolls[0] === 10) roll1Element.classList.add('strike');
                }
                if (frame.rolls.length > 1) {
                    if (frame.rolls[0] === 10) {
                        roll2Element.textContent = frame.rolls[1] === 10 ? 'X' : (frame.rolls[1] || '-');
                        if (frame.rolls[1] === 10) roll2Element.classList.add('strike');
                    } else {
                        if (frame.rolls[0] + frame.rolls[1] === 10) {
                            roll2Element.textContent = '/';
                            roll2Element.classList.add('spare');
                        } else {
                            roll2Element.textContent = frame.rolls[1] || '-';
                        }
                    }
                }
                if (frame.rolls.length > 2) {
                    roll3Element.textContent = frame.rolls[2] === 10 ? 'X' : (frame.rolls[2] || '-');
                    if (frame.rolls[2] === 10) roll3Element.classList.add('strike');
                }
            }
            
            // Update frame score
            const scoreElement = document.getElementById(`frame-${i + 1}-score`);
            scoreElement.textContent = frame.score || 0;
        }
        
        // Update total score
        document.getElementById('total-score').textContent = this.totalScore;
        
        // Update current frame and roll info
        document.getElementById('current-frame').textContent = Math.min(this.currentFrame, 10);
        document.getElementById('current-roll').textContent = this.currentRoll;
        
        // Disable roll button if game is complete
        const rollButton = document.getElementById('roll-button');
        rollButton.disabled = this.gameComplete;
    }
    
    updateStatus() {
        const statusElement = document.getElementById('status-message');
        
        if (this.gameComplete) {
            let message = `Game Complete! Final Score: ${this.totalScore}`;
            if (this.totalScore === 300) {
                message += " 🎉 PERFECT GAME! 🎉";
            } else if (this.totalScore >= 200) {
                message += " 🎳 Excellent bowling!";
            } else if (this.totalScore >= 150) {
                message += " 👍 Great job!";
            } else if (this.totalScore >= 100) {
                message += " 👌 Good game!";
            }
            statusElement.textContent = message;
        } else {
            const frameIndex = this.currentFrame - 1;
            const frame = this.frames[frameIndex];
            
            if (frame.rolls.length > 0 && this.currentRoll === 2) {
                if (frame.isStrike) {
                    statusElement.textContent = "🎳 STRIKE! Moving to next frame...";
                } else if (frame.isSpare) {
                    statusElement.textContent = "⚡ SPARE! Nice recovery!";
                } else {
                    statusElement.textContent = `Frame ${this.currentFrame}, Roll ${this.currentRoll}. ${this.pinsStanding} pins remaining.`;
                }
            } else {
                statusElement.textContent = `Frame ${this.currentFrame}, Roll ${this.currentRoll}. ${this.pinsStanding} pins standing. Adjust power and accuracy, then roll!`;
            }
        }
    }
    
    resetPins() {
        this.pinsStanding = 10;
        const pins = document.querySelectorAll('.pin');
        pins.forEach(pin => {
            pin.classList.remove('knocked-down');
        });
    }
    
    knockDownPins(count) {
        const standingPins = document.querySelectorAll('.pin:not(.knocked-down)');
        const pinsToKnock = Array.from(standingPins).slice(0, count);
        
        pinsToKnock.forEach((pin, index) => {
            setTimeout(() => {
                pin.classList.add('knocked-down');
            }, index * 100);
        });
    }
    
    animateBall() {
        const ball = document.getElementById('ball');
        ball.classList.add('rolling');
        
        setTimeout(() => {
            ball.classList.remove('rolling');
        }, 1000);
    }
    
    triggerBullying() {
        // Get all bully pins (pins 5, 7, 10)
        const bullyPins = document.querySelectorAll('.person.bully');
        
        // Play bullying sound
        this.playBullySound();
        
        bullyPins.forEach((bully, index) => {
            setTimeout(() => {
                bully.classList.add('bullying');
                
                // Remove bullying animation after 2 seconds
                setTimeout(() => {
                    bully.classList.remove('bullying');
                }, 2000);
            }, index * 200);
        });
        
        // Update status with bullying message
        const bullyMessages = [
            "😈 The bullies are laughing at your gutter ball!",
            "🤣 Pin 5: 'Is that the best you can do?'",
            "😏 Pin 7: 'My grandma bowls better than that!'",
            "🙄 Pin 10: 'Maybe try a different sport?'"
        ];
        
        const randomMessage = bullyMessages[Math.floor(Math.random() * bullyMessages.length)];
        document.getElementById('status-message').textContent = randomMessage;
    }
    
    triggerExplosion() {
        // Create explosion element
        const explosion = document.createElement('div');
        explosion.className = 'explosion';
        
        // Add explosion to pins container
        const pinsContainer = document.querySelector('.pins-container');
        pinsContainer.appendChild(explosion);
        
        // Create particle effects
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const particles = document.createElement('div');
                particles.className = 'explosion-particles';
                particles.style.top = Math.random() * 100 + '%';
                particles.style.left = Math.random() * 100 + '%';
                pinsContainer.appendChild(particles);
                
                // Remove particles after animation
                setTimeout(() => {
                    if (particles.parentNode) {
                        particles.parentNode.removeChild(particles);
                    }
                }, 1000);
            }, i * 100);
        }
        
        // Remove explosion after animation
        setTimeout(() => {
            if (explosion.parentNode) {
                explosion.parentNode.removeChild(explosion);
            }
        }, 1000);
        
        // Update status with strike celebration
        document.getElementById('status-message').textContent = "💥 STRIKE! Amazing shot! The pins are blown away! 💥";
    }
    
    resetGame() {
        this.currentFrame = 1;
        this.currentRoll = 1;
        this.totalScore = 0;
        this.gameComplete = false;
        this.pinsStanding = 10;
        
        // Reset frames
        this.frames = [];
        for (let i = 0; i < 10; i++) {
            this.frames.push({
                rolls: [],
                score: 0,
                isStrike: false,
                isSpare: false,
                isComplete: false
            });
        }
        
        // Reset display
        for (let i = 1; i <= 10; i++) {
            document.getElementById(`frame-${i}-roll-1`).textContent = '-';
            document.getElementById(`frame-${i}-roll-1`).className = 'roll';
            document.getElementById(`frame-${i}-roll-2`).textContent = '-';
            document.getElementById(`frame-${i}-roll-2`).className = 'roll';
            if (i === 10) {
                document.getElementById(`frame-${i}-roll-3`).textContent = '-';
                document.getElementById(`frame-${i}-roll-3`).className = 'roll';
            }
            document.getElementById(`frame-${i}-score`).textContent = '0';
        }
        
        // Remove any bullying animations
        document.querySelectorAll('.person.bully').forEach(bully => {
            bully.classList.remove('bullying');
        });
        
        this.resetPins();
        this.updateDisplay();
        this.updateStatus();
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new BowlingGame();
});
