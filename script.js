class NumberFeed {
    constructor() {
        this.feed = document.getElementById('feed');
        this.currentIndex = 0;
        this.numbers = [];
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        this.isScrolling = false;
        this.score = 10;
        this.maxScore = 10;
        this.scoreElement = document.getElementById('score');
        this.gold = 0;
        this.goldElement = document.getElementById('gold');
        this.goldChance = 0.3; // 30% chance positive values give gold instead of health
        this.currentFloor = 1;
        this.floorElement = document.getElementById('floor');
        this.floorUpdateTimeout = null;
        this.armor = 10;
        this.armorElement = document.getElementById('armor');
        
        this.init();
    }
    
    init() {
        this.generateNumbers();
        this.createFeedItems();
        this.setupEventListeners();
        this.setActiveItem(0);
    }
    
    generateNumbers() {
        // Clear existing numbers - we'll generate per floor now
        this.numbers = [];
        
        // Just create placeholder array for 50 floors
        for (let i = 0; i < 50; i++) {
            this.numbers.push(null); // Will be generated per slide
        }
    }
    
    generateNumberForFloor(floor) {
        // Generate a single number based on the floor
        if (Math.random() < 0.5) {
            // Negative number (attack) - scale with floor: -1 to -(1 + floor)
            const maxDamage = 1 + floor;
            return -(Math.floor(Math.random() * maxDamage) + 1);
        } else {
            // Positive number (health/gold) - scale with floor: +1 to +(1 + floor)
            const maxHealing = 1 + floor;
            return Math.floor(Math.random() * maxHealing) + 1;
        }
    }
    
    createFeedItems() {
        this.numbers.forEach((number, index) => {
            const item = document.createElement('div');
            item.className = 'feed-item';
            item.dataset.index = index;
            
            // Create horizontal container
            const horizontalContainer = document.createElement('div');
            horizontalContainer.className = 'horizontal-container';
            
            // Generate 3-5 random slides for each feed item
            const slideCount = Math.floor(Math.random() * 3) + 3; // 3-5 slides
            const slideNumbers = [];
            const currentFloor = index + 1; // Floor number for this row
            
            for (let i = 0; i < slideCount; i++) {
                if (i === slideCount - 1) {
                    // Last slide is always gold - scale with floor
                    const maxGold = 1 + currentFloor;
                    slideNumbers.push(Math.floor(Math.random() * maxGold) + 1);
                } else {
                    slideNumbers.push(this.generateNumberForFloor(currentFloor));
                }
            }
            
            // Create slides
            slideNumbers.forEach((slideNumber, slideIndex) => {
                const slide = document.createElement('div');
                slide.className = 'slide';
                slide.dataset.scored = 'false';
                
                const numberDisplay = document.createElement('div');
                numberDisplay.className = 'number-display';
                
                // First slide shows "START" instead of number
                if (slideIndex === 0) {
                    numberDisplay.textContent = 'START';
                    numberDisplay.classList.add('start');
                    slide.dataset.scored = 'true'; // START slides don't add to score
                } else {
                    // Determine if positive value should give gold, max HP, or regular health
                    const isLastSlide = slideIndex === slideNumbers.length - 1;
                    let isGold = false;
                    let isMaxHP = false;
                    
                    if (slideNumber > 0) {
                        if (isLastSlide) {
                            isGold = true; // Last slide is always gold
                        } else {
                            const rand = Math.random();
                            if (rand < 0.2) { // 20% chance for max HP potion
                                isMaxHP = true;
                            } else if (rand < 0.2 + this.goldChance) { // 30% chance for gold after max HP
                                isGold = true;
                            }
                            // Otherwise it's regular health (remaining ~50%)
                        }
                    }
                    
                    // Add icons and prefix for numbers
                    let displayText;
                    if (slideNumber > 0) {
                        if (isGold) {
                            displayText = `💰 +${slideNumber}`; // Gold coin for gold reward
                            slide.dataset.isGold = 'true';
                            slide.dataset.isMaxHP = 'false';
                        } else if (isMaxHP) {
                            displayText = `⬆️ +1`; // Up arrow for max HP increase (always +1)
                            slide.dataset.isGold = 'false';
                            slide.dataset.isMaxHP = 'true';
                        } else {
                            displayText = `🧪 +${slideNumber}`; // Magic potion for health
                            slide.dataset.isGold = 'false';
                            slide.dataset.isMaxHP = 'false';
                        }
                    } else if (slideNumber < 0) {
                        displayText = `🗡️ ${slideNumber}`; // Sword for negative
                        slide.dataset.isGold = 'false';
                        slide.dataset.isMaxHP = 'false';
                    } else {
                        displayText = slideNumber; // Zero stays plain
                        slide.dataset.isGold = 'false';
                        slide.dataset.isMaxHP = 'false';
                    }
                    
                    numberDisplay.textContent = displayText;
                    numberDisplay.dataset.originalNumber = slideNumber;
                    
                    // Add color class based on number value and type
                    if (slideNumber > 0) {
                        if (isGold) {
                            numberDisplay.classList.add('gold');
                        } else if (isMaxHP) {
                            numberDisplay.classList.add('max-hp');
                        } else {
                            numberDisplay.classList.add('positive');
                        }
                    } else if (slideNumber < 0) {
                        numberDisplay.classList.add('negative');
                    } else {
                        numberDisplay.classList.add('zero');
                    }
                }
                
                slide.appendChild(numberDisplay);
                horizontalContainer.appendChild(slide);
            });
            
            item.appendChild(horizontalContainer);
            
            // Create dots indicator
            if (slideCount > 1) {
                const dotsContainer = document.createElement('div');
                dotsContainer.className = 'dots-container';
                
                for (let i = 0; i < slideCount; i++) {
                    const dot = document.createElement('div');
                    dot.className = 'dot';
                    if (i === 0) dot.classList.add('active');
                    dotsContainer.appendChild(dot);
                }
                
                item.appendChild(dotsContainer);
                
                // Add scroll listener for this horizontal container
                this.setupHorizontalScrollListener(horizontalContainer, dotsContainer);
            }
            
            // Add swipe indicator to first item
            if (index === 0) {
                const indicator = document.createElement('div');
                indicator.className = 'swipe-indicator';
                indicator.textContent = 'Swipe up/down or left/right';
                item.appendChild(indicator);
            }
            
            this.feed.appendChild(item);
        });
    }
    
    setupEventListeners() {
        // Touch events for mobile
        this.feed.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.feed.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.feed.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        
        // Mouse events for desktop
        this.feed.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.feed.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.feed.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        // Scroll event
        document.querySelector('.feed-container').addEventListener('scroll', (e) => this.handleScroll(e));
    }
    
    setupHorizontalScrollListener(horizontalContainer, dotsContainer) {
        let lastActiveIndex = 0;
        
        horizontalContainer.addEventListener('scroll', () => {
            const scrollLeft = horizontalContainer.scrollLeft;
            const containerWidth = horizontalContainer.clientWidth;
            const activeIndex = Math.round(scrollLeft / containerWidth);
            
            // Update active dot
            const dots = dotsContainer.querySelectorAll('.dot');
            dots.forEach((dot, index) => {
                dot.classList.toggle('active', index === activeIndex);
            });
            
            // Add score when swiping to a new slide
            if (activeIndex !== lastActiveIndex) {
                const slides = horizontalContainer.querySelectorAll('.slide');
                if (slides[activeIndex]) {
                    const slide = slides[activeIndex];
                    const numberDisplay = slide.querySelector('.number-display');
                    
                    // Only score if not already scored and not a START slide
                    if (numberDisplay && slide.dataset.scored === 'false') {
                        const originalNumber = numberDisplay.dataset.originalNumber;
                        if (originalNumber !== undefined) {
                            const number = parseInt(originalNumber);
                            const isGold = slide.dataset.isGold === 'true';
                            const isMaxHP = slide.dataset.isMaxHP === 'true';
                            
                            if (isGold) {
                                this.addGold(number);
                                this.explodeAndReplace(numberDisplay, slide);
                            } else if (isMaxHP) {
                                this.addMaxHP(1);
                                this.explodeAndReplace(numberDisplay, slide);
                            } else if (number < 0) {
                                // Attack - roll the dice before applying damage
                                this.rollAttack(numberDisplay, slide, number);
                            } else {
                                // Regular health potion
                                this.addToScore(number);
                                this.explodeAndReplace(numberDisplay, slide);
                            }
                        }
                    }
                }
                lastActiveIndex = activeIndex;
            }
        });
    }
    
    addToScore(points) {
        if (points > 0) {
            // Healing - cap at max HP
            this.score = Math.min(this.score + points, this.maxScore);
        } else {
            // Damage - can go below 0
            this.score += points;
        }
        
        this.scoreElement.textContent = `${this.score}/${this.maxScore}`;
        
        // Add a brief animation to show HP change
        this.scoreElement.style.transform = 'scale(1.2)';
        this.scoreElement.style.color = points > 0 ? '#4CAF50' : points < 0 ? '#F44336' : '#FFC107';
        
        setTimeout(() => {
            this.scoreElement.style.transform = 'scale(1)';
            this.scoreElement.style.color = '#fff';
        }, 200);
        
        // Check for game over
        if (this.score <= 0) {
            this.gameOver();
        }
    }
    
    addGold(amount) {
        this.gold += amount;
        this.goldElement.textContent = this.gold;
        
        // Add a brief animation to show gold gain
        this.goldElement.style.transform = 'scale(1.2)';
        this.goldElement.style.color = '#FFF700'; // Brighter gold for animation
        
        setTimeout(() => {
            this.goldElement.style.transform = 'scale(1)';
            this.goldElement.style.color = '#FFD700'; // Back to normal gold
        }, 200);
    }
    
    addMaxHP(amount) {
        this.maxScore += amount;
        // Also heal the player by the same amount when max HP increases
        this.score = Math.min(this.score + amount, this.maxScore);
        this.scoreElement.textContent = `${this.score}/${this.maxScore}`;
        
        // Add a special animation to show max HP increase
        this.scoreElement.style.transform = 'scale(1.3)';
        this.scoreElement.style.color = '#9C27B0'; // Purple for max HP increase
        this.scoreElement.style.textShadow = '0 0 15px rgba(156, 39, 176, 0.8)';
        
        setTimeout(() => {
            this.scoreElement.style.transform = 'scale(1)';
            this.scoreElement.style.color = '#fff';
            this.scoreElement.style.textShadow = 'none';
        }, 500); // Longer animation for max HP
    }
    
    gameOver() {
        // Show game over message
        this.showGameOverMessage();
        
        // Restart after 3 seconds
        setTimeout(() => {
            this.restartGame();
        }, 3000);
    }
    
    showGameOverMessage() {
        // Create game over overlay
        const overlay = document.createElement('div');
        overlay.id = 'game-over-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'transparent';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '9999';
        overlay.style.color = '#fff';
        overlay.style.fontSize = '48px';
        overlay.style.fontWeight = 'bold';
        overlay.style.textAlign = 'center';
        overlay.innerHTML = 'GAME OVER';
        
        // Create red fill element
        const redFill = document.createElement('div');
        redFill.style.position = 'fixed';
        redFill.style.top = '0';
        redFill.style.left = '0';
        redFill.style.width = '100%';
        redFill.style.height = '0%';
        redFill.style.backgroundColor = '#DC143C';
        redFill.style.zIndex = '9998';
        redFill.style.transition = 'height 3s ease-out';
        
        document.body.appendChild(overlay);
        document.body.appendChild(redFill);
        
        // Start red fill animation
        setTimeout(() => {
            redFill.style.height = '100%';
        }, 100);
    }
    
    restartGame() {
        // Create black screen overlay during reset
        const blackOverlay = document.createElement('div');
        blackOverlay.style.position = 'fixed';
        blackOverlay.style.top = '0';
        blackOverlay.style.left = '0';
        blackOverlay.style.width = '100%';
        blackOverlay.style.height = '100%';
        blackOverlay.style.backgroundColor = '#000';
        blackOverlay.style.zIndex = '10000';
        document.body.appendChild(blackOverlay);
        
        // Remove game over overlay and red fill
        const overlay = document.getElementById('game-over-overlay');
        if (overlay) {
            overlay.remove();
        }
        
        // Remove red fill elements
        const redFills = document.querySelectorAll('div[style*="background-color: rgb(220, 20, 60)"]');
        redFills.forEach(fill => fill.remove());
        
        // Reset HP
        this.score = 10;
        this.maxScore = 10;
        this.scoreElement.textContent = `${this.score}/${this.maxScore}`;
        
        // Reset floor
        this.currentFloor = 1;
        this.floorElement.textContent = this.currentFloor;
        
        // Reset armor
        this.armor = 10;
        this.armorElement.textContent = this.armor;
        
        // Reset current index and scroll to top
        this.currentIndex = 0;
        this.scrollToItem(0);
        this.setActiveItem(0);
        
        // Regenerate completely new random feed
        this.feed.innerHTML = '';
        this.generateNumbers(); // Generate new random numbers
        this.createFeedItems(); // Create new feed with new numbers
        this.setActiveItem(0);
        
        // Remove black overlay after everything is reset
        setTimeout(() => {
            if (blackOverlay.parentNode) {
                blackOverlay.parentNode.removeChild(blackOverlay);
            }
        }, 500); // Keep black screen for 0.5 seconds
    }
    
    rollAttack(numberDisplay, slide, finalDamage) {
        // Mark as scored to prevent re-scoring
        slide.dataset.scored = 'true';
        
        // Extract sword and number from original text (e.g., "🗡️ -5")
        const originalText = numberDisplay.textContent;
        const sword = '🗡️';
        
        // Roll d20 for attack with floor bonus (+1 every 5 floors)
        const floorBonus = Math.floor(this.currentFloor / 5);
        const attackRoll = Math.floor(Math.random() * 20) + 1 + floorBonus;
        const isHit = attackRoll > this.armor;
        
        // Start rolling animation - keep sword, replace number with dice
        let rollCount = 0;
        const maxRolls = 6; // Roll 6 times before showing result
        const rollInterval = 100; // 100ms between each roll (0.6s total)
        
        // Create a span for the dice with rotation animation
        const diceSpan = document.createElement('span');
        diceSpan.textContent = '🎲';
        diceSpan.style.display = 'inline-block';
        diceSpan.style.animation = 'spin 0.2s linear infinite';
        
        // Start with the dice immediately
        numberDisplay.innerHTML = `${sword} `;
        numberDisplay.appendChild(diceSpan);
        
        const rollTimer = setInterval(() => {
            rollCount++;
            
            if (rollCount >= maxRolls) {
                clearInterval(rollTimer);
                
                if (isHit) {
                    // Hit - show original damage
                    numberDisplay.textContent = originalText;
                    this.addToScore(finalDamage);
                } else {
                    // Miss - show MISS instead
                    numberDisplay.textContent = `${sword} MISS`;
                    numberDisplay.classList.add('miss');
                    // No damage applied
                }
                
                // Wait 1 second before changing to grey "used up" appearance
                setTimeout(() => {
                    numberDisplay.classList.add('used');
                }, 1000);
            }
        }, rollInterval);
    }
    
    explodeAndReplace(numberDisplay, slide) {
        // Mark as scored to prevent re-scoring
        slide.dataset.scored = 'true';
        
        // Wait 1 second before changing to grey "used up" appearance
        setTimeout(() => {
            numberDisplay.classList.add('used');
        }, 1000);
    }
    
    handleTouchStart(e) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
    }
    
    handleTouchMove(e) {
        // Allow horizontal scrolling, prevent vertical scrolling
        const horizontalContainer = e.target.closest('.horizontal-container');
        if (!horizontalContainer) {
            e.preventDefault();
        }
    }
    
    handleTouchEnd(e) {
        this.touchEndX = e.changedTouches[0].clientX;
        this.touchEndY = e.changedTouches[0].clientY;
        this.handleSwipe();
    }
    
    handleMouseDown(e) {
        this.touchStartY = e.clientY;
        this.isMouseDown = true;
    }
    
    handleMouseMove(e) {
        if (this.isMouseDown) {
            e.preventDefault();
        }
    }
    
    handleMouseUp(e) {
        if (this.isMouseDown) {
            this.touchEndY = e.clientY;
            this.handleSwipe();
            this.isMouseDown = false;
        }
    }
    
    handleSwipe() {
        const swipeThreshold = 50;
        const horizontalDistance = this.touchStartX - this.touchEndX;
        const verticalDistance = this.touchStartY - this.touchEndY;
        
        // Determine if this is primarily a horizontal or vertical swipe
        if (Math.abs(horizontalDistance) > Math.abs(verticalDistance)) {
            // Horizontal swipe - handle within the current feed item
            // This is handled by CSS scroll-snap, so we don't need to do anything
            return;
        }
        
        // Vertical swipe - navigate between feed items
        if (Math.abs(verticalDistance) > swipeThreshold) {
            if (verticalDistance > 0) {
                // Swiped up - go to next item
                this.nextItem();
            } else {
                // Swiped down - go to previous item
                this.previousItem();
            }
        }
    }
    
    handleKeyDown(e) {
        switch(e.key) {
            case 'ArrowUp':
            case 'k':
                e.preventDefault();
                this.previousItem();
                break;
            case 'ArrowDown':
            case 'j':
                e.preventDefault();
                this.nextItem();
                break;
        }
    }
    
    handleScroll(e) {
        // Debounce scroll events
        if (this.isScrolling) return;
        
        this.isScrolling = true;
        setTimeout(() => {
            this.updateActiveItem();
            this.isScrolling = false;
        }, 100);
    }
    
    updateActiveItem() {
        const container = document.querySelector('.feed-container');
        const containerHeight = container.clientHeight;
        const scrollTop = container.scrollTop;
        
        // Calculate which item should be active based on scroll position
        const newIndex = Math.round(scrollTop / containerHeight);
        
        if (newIndex !== this.currentIndex && newIndex >= 0 && newIndex < this.numbers.length) {
            this.setActiveItem(newIndex);
        }
    }
    
    nextItem() {
        if (this.currentIndex < this.numbers.length - 1) {
            this.currentIndex++;
            this.scrollToItem(this.currentIndex);
            this.setActiveItem(this.currentIndex);
        }
    }
    
    previousItem() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.scrollToItem(this.currentIndex);
            this.setActiveItem(this.currentIndex);
        }
    }
    
    scrollToItem(index) {
        const container = document.querySelector('.feed-container');
        const targetScrollTop = index * container.clientHeight;
        
        container.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth'
        });
    }
    
    setActiveItem(index) {
        // Remove active class from all items
        document.querySelectorAll('.feed-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to current item
        const activeItem = document.querySelector(`[data-index="${index}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
            this.currentIndex = index;
            
            // Update floor display with debouncing
            if (this.floorUpdateTimeout) {
                clearTimeout(this.floorUpdateTimeout);
            }
            
            this.floorUpdateTimeout = setTimeout(() => {
                this.currentFloor = index + 1;
                this.floorElement.textContent = this.currentFloor;
            }, 200); // Wait 200ms before updating floor to let scroll settle
            
            // Add score for the first visible slide in the new frame (if it's not START and not initial load)
            if (index > 0) { // Don't score on initial load (index 0)
                const firstSlide = activeItem.querySelector('.slide');
                if (firstSlide && firstSlide.dataset.scored === 'false') {
                    const numberDisplay = firstSlide.querySelector('.number-display');
                    if (numberDisplay && numberDisplay.dataset.originalNumber !== undefined) {
                        const number = parseInt(numberDisplay.dataset.originalNumber);
                        const isGold = firstSlide.dataset.isGold === 'true';
                        const isMaxHP = firstSlide.dataset.isMaxHP === 'true';
                        
                        if (isGold) {
                            this.addGold(number);
                            this.explodeAndReplace(numberDisplay, firstSlide);
                        } else if (isMaxHP) {
                            this.addMaxHP(1);
                            this.explodeAndReplace(numberDisplay, firstSlide);
                        } else if (number < 0) {
                            // Attack - roll the dice before applying damage
                            this.rollAttack(numberDisplay, firstSlide, number);
                        } else {
                            // Regular health potion
                            this.addToScore(number);
                            this.explodeAndReplace(numberDisplay, firstSlide);
                        }
                    }
                }
            }
        }
        
        // Hide swipe indicator after first interaction
        if (index > 0) {
            const indicator = document.querySelector('.swipe-indicator');
            if (indicator) {
                indicator.style.display = 'none';
            }
        }
    }
}

// Initialize the feed when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new NumberFeed();
});