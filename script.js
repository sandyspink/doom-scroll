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
        this.goldChance = 0.5; // 50% chance positive values give gold instead of health
        this.currentFloor = 0; // Start at floor 0 for tutorial
        this.shopAvailable = false; // Track if shop should be available on boss floors
        this.floorElement = document.getElementById('floor');
        this.floorUpdateTimeout = null;
        this.armor = 10;
        this.armorElement = document.getElementById('armor');
        this.danger = 0;
        this.dangerElement = document.getElementById('danger');
        
        // Curse system
        this.curseCountdown = 0;
        this.activeCurse = null;
        this.curseDisplayElement = document.getElementById('curse-display');
        this.curseCountdownElement = document.getElementById('curse-countdown');
        
        // Animation timers to prevent overlapping
        this.goldAnimationTimer = null;
        this.scoreAnimationTimer = null;
        
        // Track if witch has been banished
        this.witchBanished = false;
        
        this.init();
    }
    
    init() {
        this.generateNumbers();
        this.createFeedItems();
        this.setupEventListeners();
        this.setActiveItem(0);
    }
    
    getCurses() {
        return [
            {
                name: "Greed's Gambit",
                description: "Double gold found, but attacks deal double damage",
                duration: 3,
                effects: {
                    goldMultiplier: 2,
                    damageMultiplier: 2
                }
            }
        ];
    }

    generateNumbers() {
        // Clear existing numbers - we'll generate per floor now
        this.numbers = [];
        
        // Just create placeholder array for 50 floors
        for (let i = 0; i < 50; i++) {
            this.numbers.push(null); // Will be generated per slide
        }
    }
    
    generateSlideContent(floor) {
        return this.generateSlideContentWithWitchLimit(floor, false);
    }
    
    generateSlideContentWithWitchLimit(floor, hasWitchAlready) {
        const rand = Math.random();
        
        // 5% chance for witch (floors 3+, no active curse, no witch already on this floor, and not banished)
        if (floor >= 3 && this.curseCountdown === 0 && !hasWitchAlready && !this.witchBanished && rand < 0.05) {
            return 'WITCH';
        }
        
        // 20% chance for stairs (allowing descent)
        if (rand < 0.25) { // 0.05 + 0.20 = 0.25
            return 'STAIRS';
        }
        
        // 30% chance for attacks  
        if (rand < 0.55) { // 0.25 + 0.30 = 0.55
            const maxDamage = 1 + floor;
            return -(Math.floor(Math.random() * maxDamage) + 1);
        }
        
        // 45% chance for positive rewards (health/gold/maxHP)
        const maxHealing = 1 + floor;
        return Math.floor(Math.random() * maxHealing) + 1;
    }
    
    generateNumberOnlyContent(floor) {
        // Version that only returns numbers, no special strings
        const rand = Math.random();
        
        // 30% chance for attacks
        if (rand < 0.30) { 
            const maxDamage = 1 + floor;
            return -(Math.floor(Math.random() * maxDamage) + 1);
        }
        
        // 70% chance for positive rewards (health/gold/maxHP)
        const maxHealing = 1 + floor;
        return Math.floor(Math.random() * maxHealing) + 1;
    }
    
    generateNumberForFloor(floor) {
        // Keep this for backward compatibility, but redirect to new method
        return this.generateSlideContent(floor);
    }
    
    createFeedItems() {
        this.numbers.forEach((number, index) => {
            const item = document.createElement('div');
            item.className = 'feed-item';
            item.dataset.index = index;
            
            // Create horizontal container
            const horizontalContainer = document.createElement('div');
            horizontalContainer.className = 'horizontal-container';
            
            // First row is tutorial with fixed content
            let slideNumbers = [];
            const currentFloor = index + 1; // Floor number for this row
            
            // Skip tutorial for now - start directly with regular floors
            {
                // Generate 4-9 random slides for each feed item
                const slideCount = Math.floor(Math.random() * 6) + 4; // 4-9 slides
                console.log(`Floor ${currentFloor}: Generating ${slideCount} slides`); // Debug
                
                // Make shop decision for this floor (20% chance)
                const shopAvailable = Math.random() < 0.2;
                console.log(`Floor ${currentFloor}: Shop available:`, shopAvailable);
                
                // Pre-determine all slide types
                slideNumbers = [];
                let hasWitch = false;
                
                // First slide is always the floor indicator
                slideNumbers.push('FLOOR_INDICATOR');
                
                // Generate content for middle slides (excluding boss and final)
                for (let i = 1; i < slideCount - 2; i++) {
                    if (currentFloor === 3 && i === slideCount - 3 && this.curseCountdown === 0 && !this.witchBanished) {
                        // Force witch as third-to-last slide on floor 3 for testing (unless banished)
                        slideNumbers.push('WITCH');
                        hasWitch = true;
                    } else {
                        const content = this.generateSlideContentWithWitchLimit(currentFloor, hasWitch);
                        console.log(`Floor ${currentFloor}, slide ${i}: Generated content`, content); // Debug
                        if (content === 'WITCH') {
                            hasWitch = true;
                        }
                        slideNumbers.push(content);
                    }
                }
                
                // Always add boss as second-to-last slide
                slideNumbers.push('BOSS');
                
                // Add shop as last slide based on pre-determined availability
                if (this.activeCurse?.effects.disableShops || !shopAvailable) {
                    // Generate guaranteed gold reward instead of shop
                    slideNumbers.push('GOLD');
                } else {
                    slideNumbers.push('SHOP');
                }
            }
            
            console.log(`Floor ${currentFloor}: Final slideNumbers array:`, slideNumbers); // Debug
            
            // Create slides
            slideNumbers.forEach((slideNumber, slideIndex) => {
                const slide = document.createElement('div');
                slide.className = 'slide';
                slide.dataset.scored = 'false';
                
                const numberDisplay = document.createElement('div');
                numberDisplay.className = 'text-number-large';
                
                // Handle tutorial slides
                if (slideNumber === 'INTRO') {
                    this.createSlideLabel(slide, 'Story');
                    numberDisplay.className = 'text-body';
                    numberDisplay.innerHTML = 'You are a knight who must endure the endless depths to find the<br>Scroll of Doom<br>at the bottom of the<br>Demon\'s Lair';
                    slide.dataset.scored = 'true'; // Story slides don't add to score
                } else if (slideNumber === 'TUTORIAL1') {
                    this.createSlideLabel(slide, 'Tutorial');
                    numberDisplay.className = 'text-body';
                    numberDisplay.innerHTML = 'Collect 💰 Gold to buy things from the shop';
                    slide.dataset.scored = 'true';
                } else if (slideNumber === 'TUTORIAL2') {
                    this.createSlideLabel(slide, 'Tutorial');
                    numberDisplay.className = 'text-body';
                    numberDisplay.innerHTML = 'Upgrade your 🛡️ Armor to prevent damage';
                    slide.dataset.scored = 'true';
                } else if (slideNumber === 'TUTORIAL3') {
                    this.createSlideLabel(slide, 'Tutorial');
                    numberDisplay.className = 'text-body';
                    numberDisplay.innerHTML = 'Avoid fights when you\'re low on health';
                    slide.dataset.scored = 'true';
                } else if (slideNumber === 'TUTORIAL4') {
                    this.createSlideLabel(slide, 'Tutorial');
                    numberDisplay.className = 'text-body';
                    numberDisplay.innerHTML = 'Scroll down to start<br>Swipe left/right to enter a dungeon floor';
                    slide.dataset.scored = 'true';
                } else if (slideNumber === 'SHOP') {
                    this.createSlideLabel(slide, 'Shop');
                    console.log('Creating shop slide!'); // Debug log
                    // Create shop items instead of just text
                    this.createShopSlide(slide, currentFloor);
                    // Don't duplicate the dataset here - createShopSlide handles it
                } else if (slideNumber === 'WITCH') {
                    this.createSlideLabel(slide, 'Witch');
                    this.createWitchSlide(slide, currentFloor);
                } else if (slideNumber === 'FLOOR_INDICATOR') {
                    this.createSlideLabel(slide, 'Floor Entrance');
                    this.createFloorIndicatorSlide(slide, currentFloor);
                } else if (slideNumber === 'STAIRS') {
                    this.createSlideLabel(slide, 'Stairs Down');
                    this.createStairsSlide(slide);
                    slide.dataset.canDescend = 'true';
                } else if (slideNumber === 'BOSS') {
                    this.createSlideLabel(slide, 'Boss Fight!');
                    this.createBossSlide(slide, currentFloor);
                } else if (slideNumber === 'GOLD') {
                    const goldAmount = Math.floor(Math.random() * currentFloor) + currentFloor;
                    slide.dataset.scored = 'false'; // Set to false so it gets processed
                    slide.dataset.isGold = 'true';
                    slide.dataset.isMaxHP = 'false';
                    
                    this.createSlideLabel(slide, 'You found gold!');
                    
                    const goldDisplay = document.createElement('div');
                    goldDisplay.innerHTML = `<div>💰</div><div>+${goldAmount}</div>`;
                    goldDisplay.className = 'text-number-large gold';
                    goldDisplay.dataset.originalNumber = goldAmount;
                    
                    slide.appendChild(goldDisplay);
                } else {
                    // Determine if positive value should give gold, max HP, or regular health
                    const isLastSlide = slideIndex === slideNumbers.length - 1;
                    let isGold = false;
                    let isMaxHP = false;
                    
                    if (slideNumber > 0) {
                        const rand = Math.random();
                        if (rand < 0.2) { // 20% chance for max HP potion
                            isMaxHP = true;
                        } else if (rand < 0.2 + this.goldChance) { // 30% chance for gold after max HP
                            isGold = true;
                        }
                        // Otherwise it's regular health (remaining ~50%)
                    }
                    
                    // Add slide labels based on type
                    if (slideNumber > 0) {
                        if (isGold) {
                            this.createSlideLabel(slide, 'You found gold!');
                        } else if (isMaxHP) {
                            this.createSlideLabel(slide, 'Max HP increased!');
                        } else {
                            this.createSlideLabel(slide, 'You found a health potion!');
                        }
                    } else if (slideNumber < 0) {
                        this.createSlideLabel(slide, 'An enemy attacks!');
                    } else {
                        this.createSlideLabel(slide, 'Nothing');
                    }
                    
                    // Create vertical layout with emoji above text/number
                    let emoji, text;
                    if (slideNumber > 0) {
                        if (isGold) {
                            emoji = '💰';
                            text = `+${slideNumber}`;
                            slide.dataset.isGold = 'true';
                            slide.dataset.isMaxHP = 'false';
                        } else if (isMaxHP) {
                            emoji = '⬆️';
                            text = '+1';
                            slide.dataset.isGold = 'false';
                            slide.dataset.isMaxHP = 'true';
                        } else {
                            emoji = '🧪';
                            text = `+${slideNumber}`;
                            slide.dataset.isGold = 'false';
                            slide.dataset.isMaxHP = 'false';
                        }
                    } else if (slideNumber < 0) {
                        emoji = '🗡️';
                        text = `${slideNumber}`;
                        slide.dataset.isGold = 'false';
                        slide.dataset.isMaxHP = 'false';
                    } else {
                        emoji = '';
                        text = slideNumber;
                        slide.dataset.isGold = 'false';
                        slide.dataset.isMaxHP = 'false';
                    }
                    
                    // Create vertical layout
                    if (emoji) {
                        numberDisplay.innerHTML = `<div>${emoji}</div><div>${text}</div>`;
                    } else {
                        numberDisplay.textContent = text;
                    }
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
                
                if (slideNumber !== 'SHOP' && slideNumber !== 'WITCH' && slideNumber !== 'FLOOR_INDICATOR' && slideNumber !== 'STAIRS' && slideNumber !== 'BOSS' && !['INTRO', 'TUTORIAL1', 'TUTORIAL2', 'TUTORIAL3', 'TUTORIAL4'].includes(slideNumber)) {
                    slide.appendChild(numberDisplay);
                } else if (['INTRO', 'TUTORIAL1', 'TUTORIAL2', 'TUTORIAL3', 'TUTORIAL4'].includes(slideNumber)) {
                    // Tutorial slides already have numberDisplay created above
                    slide.appendChild(numberDisplay);
                }
                horizontalContainer.appendChild(slide);
            });
            
            item.appendChild(horizontalContainer);
            
            // Create dots indicator
            if (slideNumbers.length > 1) {
                const dotsContainer = document.createElement('div');
                dotsContainer.className = 'dots-container';
                
                for (let i = 0; i < slideNumbers.length; i++) {
                    const dot = document.createElement('div');
                    dot.className = 'dot';
                    if (i === 0) dot.classList.add('active');
                    
                    // Check if this slide is an attack (negative number or BOSS)
                    const slideContent = slideNumbers[i];
                    if ((typeof slideContent === 'number' && slideContent < 0) || slideContent === 'BOSS') {
                        dot.classList.add('attack-dot');
                    }
                    
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
                indicator.textContent = 'Swipe right';
                item.appendChild(indicator);
            }
            
            this.feed.appendChild(item);
            console.log(`Floor ${currentFloor}: Feed item created and appended, total slides: ${item.querySelectorAll('.slide').length}`); // Debug
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
        
        // Wheel event to control scrolling
        document.querySelector('.feed-container').addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        // Scroll event
        document.querySelector('.feed-container').addEventListener('scroll', (e) => this.handleScroll(e));
    }
    
    setupHorizontalScrollListener(horizontalContainer, dotsContainer) {
        let lastActiveIndex = 0;
        let isDragging = false;
        let startX = 0;
        let scrollLeft = 0;
        
        // Mouse drag support for horizontal scrolling
        horizontalContainer.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.pageX - horizontalContainer.offsetLeft;
            scrollLeft = horizontalContainer.scrollLeft;
            horizontalContainer.style.cursor = 'grabbing';
            e.preventDefault();
        });
        
        horizontalContainer.addEventListener('mouseleave', () => {
            isDragging = false;
            horizontalContainer.style.cursor = 'grab';
        });
        
        horizontalContainer.addEventListener('mouseup', () => {
            isDragging = false;
            horizontalContainer.style.cursor = 'grab';
        });
        
        horizontalContainer.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const x = e.pageX - horizontalContainer.offsetLeft;
            const walk = (x - startX) * 2; // Scroll speed
            horizontalContainer.scrollLeft = scrollLeft - walk;
        });
        
        // Set cursor style
        horizontalContainer.style.cursor = 'grab';
        
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
                    const numberDisplay = slide.querySelector('.text-number-large');
                    
                    // Only score if not already scored and not a START slide
                    if (slide.dataset.scored === 'false') {
                        console.log('Checking slide with isShop:', slide.dataset.isShop, 'hasNumberDisplay:', !!numberDisplay); // Debug log
                        const isShop = slide.dataset.isShop === 'true';
                        
                        if (isShop) {
                            console.log('Opening shop! isShop:', isShop, 'scored:', slide.dataset.scored); // Debug log
                            this.openShop(slide);
                        } else if (slide.dataset.isWitch === 'true') {
                            console.log('Witch encounter!'); // Debug log
                            this.startWitchEncounter(slide);
                        } else if (slide.dataset.isBoss === 'true') {
                            console.log('Boss fight!'); // Debug log
                            const numberDisplay = slide.querySelector('.text-number-large');
                            const bossDamage = parseInt(numberDisplay.dataset.originalNumber);
                            this.rollBossAttack(numberDisplay, slide, bossDamage);
                        } else {
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
                }
                lastActiveIndex = activeIndex;
            }
        });
    }
    
    addToScore(points) {
        let modifiedPoints = points;
        const oldScore = this.score;
        
        if (points > 0) {
            // Apply healing curse effects
            modifiedPoints = this.applyCurseEffects(points, 'healing');
            // Healing - cap at max HP
            this.score = Math.min(this.score + modifiedPoints, this.maxScore);
        } else {
            // Apply damage curse effects
            modifiedPoints = this.applyCurseEffects(points, 'damage');
            // Damage - can go below 0
            this.score += modifiedPoints;
        }
        
        // Add animation styles during counting
        this.scoreElement.style.transform = 'scale(1.2)';
        this.scoreElement.style.color = modifiedPoints > 0 ? '#4CAF50' : modifiedPoints < 0 ? '#F44336' : '#FFC107';
        
        // Animate the counter up/down
        this.animateCounterUp(this.scoreElement, oldScore, this.score, 400);
        
        setTimeout(() => {
            this.scoreElement.style.transform = 'scale(1)';
            this.scoreElement.style.color = '#fff';
        }, 500);
        
        // Check for game over
        if (this.score <= 0) {
            this.gameOver();
        }
    }
    
    addGold(amount) {
        const modifiedAmount = this.applyCurseEffects(amount, 'gold');
        const oldGold = this.gold;
        this.gold += modifiedAmount;
        
        // Add animation styles during counting
        this.goldElement.style.transform = 'scale(1.2)';
        this.goldElement.style.color = '#FFF700'; // Brighter gold for animation
        
        // Animate the counter up
        this.animateCounterUp(this.goldElement, oldGold, this.gold, 400);
        
        setTimeout(() => {
            this.goldElement.style.transform = 'scale(1)';
            this.goldElement.style.color = '#FFD700'; // Back to normal gold
        }, 500);
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
    
    createShopSlide(slide, floor) {
        // Store floor for dynamic checking when player reaches this slide
        slide.dataset.shopFloor = floor;
        slide.dataset.scored = 'false'; // Make sure it can be detected
        slide.dataset.isShop = 'true'; // Make sure shop detection works
        
        // Create initial shop display (will be replaced when opened)
        const shopDisplay = document.createElement('div');
        shopDisplay.className = 'text-number-large shop';
        shopDisplay.textContent = '🏪 SHOP';
        shopDisplay.className = 'text-number-large shop';
        shopDisplay.style.color = '#D4AF37';
        shopDisplay.style.textAlign = 'center';
        shopDisplay.style.opacity = '0'; // Hide initially to prevent flicker
        
        slide.appendChild(shopDisplay);
        console.log('Created shop slide with isShop:', slide.dataset.isShop, 'scored:', slide.dataset.scored); // Debug
    }
    
    createWitchSlide(slide, floor) {
        slide.dataset.scored = 'false';
        slide.dataset.isWitch = 'true';
        
        // Create witch display
        const witchDisplay = document.createElement('div');
        witchDisplay.className = 'text-number-large';
        witchDisplay.textContent = '🧙‍♀️ WITCH';
        witchDisplay.className = 'text-number-large';
        witchDisplay.style.color = '#8B008B';
        witchDisplay.style.textAlign = 'center';
        witchDisplay.style.textShadow = '0 0 10px rgba(139, 0, 139, 0.8)';
        
        slide.appendChild(witchDisplay);
    }
    
    createFloorIndicatorSlide(slide, floor) {
        slide.dataset.scored = 'true'; // Floor indicators don't affect gameplay
        
        // Create floor indicator display
        const floorDisplay = document.createElement('div');
        floorDisplay.className = 'text-h1';
        floorDisplay.textContent = `Floor ${floor}`;
        floorDisplay.style.color = '#D4AF37';
        floorDisplay.style.textAlign = 'center';
        floorDisplay.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.8)';
        
        slide.appendChild(floorDisplay);
    }
    
    createStairsSlide(slide) {
        slide.dataset.scored = 'true'; // Stairs don't affect gameplay, just allow descent
        
        // Create stairs display with vertical layout and instructions
        const stairsDisplay = document.createElement('div');
        stairsDisplay.className = 'text-number-large';
        stairsDisplay.innerHTML = `
            <div>🪜</div>
            <div></div>
            <div class="text-body" style="color: #9E9E9E; line-height: 1.3;">
                Swipe down to descend<br>or swipe right to keep going
            </div>
        `;
        stairsDisplay.style.color = '#8B4513';
        stairsDisplay.style.textAlign = 'center';
        stairsDisplay.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.8)';
        
        slide.appendChild(stairsDisplay);
    }
    
    createBossSlide(slide, floor) {
        slide.dataset.scored = 'false';
        slide.dataset.isBoss = 'true';
        
        // Calculate boss damage based on floor (stronger bosses on deeper floors)
        const bossDamage = -(2 + floor); // Bosses hit harder than regular enemies
        
        // Create boss display with vertical layout
        const bossDisplay = document.createElement('div');
        bossDisplay.className = 'text-number-large';
        bossDisplay.innerHTML = `<div>🐉</div><div>${bossDamage}</div>`;
        bossDisplay.style.color = '#DC143C';
        bossDisplay.style.textAlign = 'center';
        bossDisplay.style.textShadow = '0 0 15px rgba(220, 20, 60, 0.8)';
        bossDisplay.dataset.originalNumber = bossDamage;
        
        slide.appendChild(bossDisplay);
    }
    
    startWitchEncounter(slide) {
        slide.dataset.scored = 'true'; // Prevent re-triggering
        
        // Get a random curse and store it on the slide
        const curses = this.getCurses();
        const randomCurse = curses[Math.floor(Math.random() * curses.length)];
        
        // Hide the witch display immediately to prevent flicker
        const witchDisplay = slide.querySelector('.text-number-large');
        if (witchDisplay) {
            witchDisplay.style.opacity = '0';
        }
        
        // Create witch encounter UI like shop
        this.createWitchUI(slide, randomCurse);
    }
    
    createWitchUI(slide, curse) {
        // Clear existing content
        slide.innerHTML = '';
        
        // Create witch container
        const witchContainer = document.createElement('div');
        witchContainer.className = 'witch-container';
        witchContainer.style.display = 'flex';
        witchContainer.style.flexDirection = 'column';
        witchContainer.style.alignItems = 'center';
        witchContainer.style.justifyContent = 'center';
        witchContainer.style.height = '100%';
        witchContainer.style.width = '100%';
        witchContainer.style.maxWidth = '400px';
        witchContainer.style.padding = '20px';
        witchContainer.style.boxSizing = 'border-box';
        
        // Witch emoji and title
        const title = document.createElement('div');
        title.innerHTML = '🧙‍♀️<br>Witch';
        title.className = 'text-number-large';
        title.style.color = '#8B008B';
        title.style.marginBottom = '15px';
        title.style.textAlign = 'center';
        title.style.lineHeight = '1.3';
        title.style.textShadow = '0 0 10px rgba(139, 0, 139, 0.8)';
        witchContainer.appendChild(title);
        
        // Curse name
        const curseName = document.createElement('div');
        curseName.textContent = curse.name;
        curseName.className = 'text-h3';
        curseName.style.color = '#D4AF37';
        curseName.style.marginBottom = '10px';
        curseName.style.textAlign = 'center';
        witchContainer.appendChild(curseName);
        
        // Brief description
        const briefDesc = document.createElement('div');
        briefDesc.textContent = curse.description;
        briefDesc.className = 'text-body';
        briefDesc.style.color = '#ffffff';
        briefDesc.style.marginBottom = '8px';
        briefDesc.style.lineHeight = '1.3';
        briefDesc.style.textAlign = 'center';
        witchContainer.appendChild(briefDesc);
        
        // Duration
        const duration = document.createElement('div');
        duration.textContent = `${curse.duration} floors`;
        duration.className = 'text-body';
        duration.style.color = '#9E9E9E';
        duration.style.marginBottom = '15px';
        duration.style.textAlign = 'center';
        witchContainer.appendChild(duration);
        
        // Buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.flexDirection = 'column';
        buttonsContainer.style.gap = '12px';
        buttonsContainer.style.alignItems = 'stretch';
        buttonsContainer.style.width = '100%';
        
        // Accept button
        const acceptBtn = document.createElement('button');
        const acceptCost = Math.ceil(this.score / 4);
        acceptBtn.textContent = `Accept Curse (-${acceptCost} HP)`;
        acceptBtn.style.backgroundColor = '#8B008B';
        acceptBtn.style.color = '#ffffff';
        acceptBtn.className = 'text-body button';
        
        acceptBtn.addEventListener('mouseenter', () => {
            acceptBtn.style.backgroundColor = '#A020A0';
        });
        acceptBtn.addEventListener('mouseleave', () => {
            acceptBtn.style.backgroundColor = '#8B008B';
        });
        
        acceptBtn.onclick = () => {
            // Cost: quarter of current HP
            const cost = Math.ceil(this.score / 4);
            this.addToScore(-cost);
            this.acceptCurse(curse);
            this.showCurseAcceptedMessage(slide);
        };
        
        // Banish button
        const banishBtn = document.createElement('button');
        const banishCost = Math.ceil(this.score / 2);
        banishBtn.textContent = `Banish Witch (-${banishCost} HP)`;
        banishBtn.style.backgroundColor = '#4CAF50';
        banishBtn.style.color = '#ffffff';
        banishBtn.className = 'text-body button';
        
        banishBtn.addEventListener('mouseenter', () => {
            banishBtn.style.backgroundColor = '#45a049';
        });
        banishBtn.addEventListener('mouseleave', () => {
            banishBtn.style.backgroundColor = '#4CAF50';
        });
        
        banishBtn.onclick = () => {
            // Cost: half of current HP
            const cost = Math.ceil(this.score / 2);
            this.addToScore(-cost);
            this.witchBanished = true; // Permanently banish the witch
            this.showWitchBanishedMessage(slide);
        };
        
        buttonsContainer.appendChild(acceptBtn);
        buttonsContainer.appendChild(banishBtn);
        witchContainer.appendChild(buttonsContainer);
        slide.appendChild(witchContainer);
    }
    
    showCurseAcceptedMessage(slide) {
        // Clear existing content and show acceptance message
        slide.innerHTML = '';
        
        const messageDisplay = document.createElement('div');
        messageDisplay.className = 'text-number-large';
        messageDisplay.innerHTML = '✨ Curse Accepted<br><span class="text-body">The witch vanishes with a cackle</span>';
        messageDisplay.style.color = '#8B008B';
        messageDisplay.style.textAlign = 'center';
        messageDisplay.style.textShadow = '0 0 15px rgba(139, 0, 139, 0.8)';
        
        slide.appendChild(messageDisplay);
        
        // Add animation
        setTimeout(() => {
            messageDisplay.classList.add('used');
        }, 1500);
    }
    
    showWitchBanishedMessage(slide) {
        // Clear existing content and show banish message
        slide.innerHTML = '';
        
        const messageDisplay = document.createElement('div');
        messageDisplay.className = 'text-number-large';
        messageDisplay.innerHTML = '💨 Witch Banished<br><span class="text-body">The witch was permanently banished!</span>';
        messageDisplay.style.color = '#4CAF50';
        messageDisplay.style.textAlign = 'center';
        messageDisplay.style.textShadow = '0 0 15px rgba(76, 175, 80, 0.6)';
        
        slide.appendChild(messageDisplay);
        
        // Add animation
        setTimeout(() => {
            messageDisplay.classList.add('used');
        }, 1500);
    }
    
    showWitchModal(curse) {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'witch-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '10000';
        modal.style.padding = '20px';
        modal.style.boxSizing = 'border-box';
        
        // Create modal content
        const content = document.createElement('div');
        content.style.backgroundColor = '#1a1a1a';
        content.style.border = '2px solid #8B008B';
        content.style.borderRadius = '15px';
        content.style.padding = '30px';
        content.style.maxWidth = '350px';
        content.style.width = '100%';
        content.style.textAlign = 'center';
        content.style.boxShadow = '0 0 20px rgba(139, 0, 139, 0.6)';
        
        // Witch emoji and title
        const title = document.createElement('div');
        title.innerHTML = '🧙‍♀️<br>A witch steps forward and offers you a curse';
        title.className = 'text-h1';
        title.style.color = '#8B008B';
        title.style.marginBottom = '20px';
        title.style.lineHeight = '1.3';
        
        // Curse name
        const curseName = document.createElement('div');
        curseName.textContent = curse.name;
        curseName.className = 'text-h2';
        curseName.style.color = '#D4AF37';
        curseName.style.marginBottom = '15px';
        
        // Curse description
        const description = document.createElement('div');
        description.textContent = curse.description;
        description.className = 'text-body';
        description.style.color = '#ffffff';
        description.style.marginBottom = '10px';
        description.style.lineHeight = '1.4';
        
        // Duration
        const duration = document.createElement('div');
        duration.textContent = `Duration: ${curse.duration} floors`;
        duration.className = 'text-body';
        duration.style.color = '#9E9E9E';
        duration.style.marginBottom = '25px';
        
        // Buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.flexDirection = 'column';
        buttonsContainer.style.gap = '12px';
        buttonsContainer.style.alignItems = 'stretch';
        buttonsContainer.style.width = '100%';
        
        // Accept button
        const acceptBtn = document.createElement('button');
        acceptBtn.textContent = 'Accept the Curse';
        acceptBtn.style.backgroundColor = '#8B008B';
        acceptBtn.style.color = '#ffffff';
        acceptBtn.style.border = 'none';
        acceptBtn.style.borderRadius = '8px';
        acceptBtn.className = 'text-body button';
        
        acceptBtn.addEventListener('mouseenter', () => {
            acceptBtn.style.backgroundColor = '#A020A0';
        });
        acceptBtn.addEventListener('mouseleave', () => {
            acceptBtn.style.backgroundColor = '#8B008B';
        });
        
        acceptBtn.onclick = () => {
            this.acceptCurse(curse);
            document.body.removeChild(modal);
        };
        
        // Banish button
        const banishBtn = document.createElement('button');
        banishBtn.textContent = 'Banish the Witch';
        banishBtn.style.backgroundColor = '#4CAF50';
        banishBtn.style.color = '#ffffff';
        banishBtn.style.border = 'none';
        banishBtn.style.borderRadius = '8px';
        banishBtn.className = 'text-body button';
        
        banishBtn.addEventListener('mouseenter', () => {
            banishBtn.style.backgroundColor = '#45a049';
        });
        banishBtn.addEventListener('mouseleave', () => {
            banishBtn.style.backgroundColor = '#4CAF50';
        });
        
        banishBtn.onclick = () => {
            document.body.removeChild(modal);
        };
        
        // Assemble modal
        buttonsContainer.appendChild(acceptBtn);
        buttonsContainer.appendChild(banishBtn);
        
        content.appendChild(title);
        content.appendChild(curseName);
        content.appendChild(description);
        content.appendChild(duration);
        content.appendChild(buttonsContainer);
        
        modal.appendChild(content);
        document.body.appendChild(modal);
    }
    
    createSlideLabel(slide, labelText, className = '') {
        const label = document.createElement('div');
        label.className = `slide-label text-h2 ${className}`;
        label.textContent = labelText;
        label.style.color = '#F2A71B'; // Match gold color
        console.log('Created label:', labelText, 'for slide'); // Debug
        slide.appendChild(label);
        return label;
    }
    
    acceptCurse(curse) {
        this.activeCurse = curse;
        this.curseCountdown = curse.duration;
        this.updateCurseDisplay();
        
        // Apply immediate effects (like halving armor)
        if (curse.effects.armorDivider) {
            this.armor = Math.floor(this.armor / curse.effects.armorDivider);
            this.armorElement.textContent = this.armor;
        }
    }
    
    updateCurseDisplay() {
        if (this.curseCountdown > 0) {
            this.curseDisplayElement.style.display = 'inline';
            this.curseCountdownElement.textContent = this.curseCountdown;
        } else {
            this.curseDisplayElement.style.display = 'none';
            this.activeCurse = null;
        }
    }
    
    applyCurseEffects(baseValue, effectType) {
        if (!this.activeCurse) return baseValue;
        
        const effects = this.activeCurse.effects;
        
        switch (effectType) {
            case 'gold':
                return effects.goldMultiplier ? baseValue * effects.goldMultiplier : baseValue;
            case 'damage':
                return effects.damageMultiplier ? baseValue * effects.damageMultiplier : baseValue;
            case 'healing':
                return effects.healingMultiplier ? baseValue * effects.healingMultiplier : baseValue;
            default:
                return baseValue;
        }
    }
    
    animateCounterUp(element, startValue, endValue, duration = 300) {
        // Ensure we're working with integers
        startValue = Math.round(startValue);
        endValue = Math.round(endValue);
        
        // Cancel any existing animation for this element
        if (element === this.goldElement && this.goldAnimationTimer) {
            clearInterval(this.goldAnimationTimer);
            this.goldAnimationTimer = null;
        } else if (element === this.scoreElement && this.scoreAnimationTimer) {
            clearInterval(this.scoreAnimationTimer);
            this.scoreAnimationTimer = null;
        }
        
        // If no change needed, just update immediately
        if (startValue === endValue) {
            if (element === this.goldElement) {
                element.textContent = endValue;
            } else if (element === this.scoreElement) {
                element.textContent = `${endValue}/${this.maxScore}`;
            }
            return;
        }
        
        const increment = endValue > startValue ? 1 : -1;
        const totalSteps = Math.abs(endValue - startValue);
        const stepDuration = Math.max(20, duration / totalSteps); // Min 20ms per step
        
        let currentValue = startValue;
        let stepCount = 0;
        
        const timer = setInterval(() => {
            currentValue += increment;
            stepCount++;
            
            // Update display based on element type
            if (element === this.goldElement) {
                element.textContent = currentValue;
            } else if (element === this.scoreElement) {
                element.textContent = `${currentValue}/${this.maxScore}`;
            }
            
            // Stop when we reach the target OR max steps to prevent infinite loops
            if (currentValue === endValue || stepCount >= totalSteps) {
                clearInterval(timer);
                
                // Clear the stored timer reference
                if (element === this.goldElement) {
                    this.goldAnimationTimer = null;
                } else if (element === this.scoreElement) {
                    this.scoreAnimationTimer = null;
                }
                
                // Ensure final value is correct
                if (element === this.goldElement) {
                    element.textContent = endValue;
                } else if (element === this.scoreElement) {
                    element.textContent = `${endValue}/${this.maxScore}`;
                }
            }
        }, stepDuration);
        
        // Store the timer reference
        if (element === this.goldElement) {
            this.goldAnimationTimer = timer;
        } else if (element === this.scoreElement) {
            this.scoreAnimationTimer = timer;
        }
    }
    
    openShop(slide) {
        console.log('openShop called! Floor:', slide.dataset.shopFloor, 'Gold:', this.gold); // Debug
        const floor = parseInt(slide.dataset.shopFloor);
        const itemCost = floor * 2;
        
        // Hide the shop display immediately to prevent flicker
        const shopDisplay = slide.querySelector('.text-number-large');
        if (shopDisplay) {
            shopDisplay.style.opacity = '0';
        }
        
        // Check if player can afford any item NOW (when they reach the slide)
        if (this.gold < itemCost) {
            // Player can't afford anything - give them double gold instead (boss loot!)
            const baseGoldAmount = Math.floor(Math.random() * floor) + floor;
            const goldAmount = baseGoldAmount * 2; // Double gold for boss loot
            slide.dataset.scored = 'true';
            this.addGold(goldAmount);
            this.showBossLootMessage(slide, goldAmount);
            return;
        }
        
        // Create shop UI dynamically when opened
        this.createShopUI(slide, floor, itemCost);
    }
    
    createShopUI(slide, floor, itemCost) {
        // Mark as scored to prevent re-opening
        slide.dataset.scored = 'true';
        
        // Show the shop display now that we know it's actually a shop
        const existingShopDisplay = slide.querySelector('.text-number-large');
        if (existingShopDisplay) {
            existingShopDisplay.style.opacity = '1';
        }
        
        // Wait a moment then clear and create the shop UI
        setTimeout(() => {
            // Clear existing content
            slide.innerHTML = '';
            
            // Create shop container
            const shopContainer = document.createElement('div');
        shopContainer.className = 'shop-container';
        shopContainer.style.display = 'flex';
        shopContainer.style.flexDirection = 'column';
        shopContainer.style.alignItems = 'stretch';
        shopContainer.style.justifyContent = 'center';
        shopContainer.style.height = '100%';
        shopContainer.style.width = '100%';
        shopContainer.style.maxWidth = '400px';
        shopContainer.style.padding = '20px';
        shopContainer.style.boxSizing = 'border-box';
        
        // Shop title
        const title = document.createElement('h3');
        title.textContent = '🛒 SHOP';
        title.style.color = '#D4AF37';
        title.className = 'text-number-large';
        title.style.marginBottom = '20px';
        title.style.textAlign = 'center';
        shopContainer.appendChild(title);
        
        // Gold display - use CURRENT gold amount
        const goldDisplay = document.createElement('div');
        goldDisplay.textContent = `Gold: ${this.gold}`;
        goldDisplay.style.color = '#FFD700';
        goldDisplay.className = 'text-body';
        goldDisplay.style.marginBottom = '20px';
        goldDisplay.style.textAlign = 'center';
        shopContainer.appendChild(goldDisplay);
        
        // Shop items
        const items = [
            { emoji: '🧪', name: 'Full Heal', action: () => this.purchaseFullHeal(itemCost, null) },
            { emoji: '🛡️', name: 'Armor +1', action: () => this.purchaseACUpgrade(itemCost, null) },
            { emoji: '❤️', name: 'Max HP +1', action: () => this.purchaseMaxHPUpgrade(itemCost, null) }
        ];
        
        items.forEach(item => {
            const canAfford = this.gold >= itemCost; // Check CURRENT gold
            
            const itemButton = document.createElement('button');
            itemButton.style.margin = '6px 0'; // Adjust margin proportionally
            itemButton.style.backgroundColor = canAfford ? '#4CAF50' : '#666';
            itemButton.style.color = '#fff';
            itemButton.style.cursor = canAfford ? 'pointer' : 'not-allowed';
            itemButton.className = 'text-body button';
            itemButton.style.opacity = canAfford ? '1' : '0.5';
            itemButton.disabled = !canAfford;
            
            // Button content
            const buttonContent = document.createElement('div');
            buttonContent.style.display = 'flex';
            buttonContent.style.justifyContent = 'center';
            buttonContent.style.alignItems = 'center';
            buttonContent.style.gap = '8px';
            
            const leftSpan = document.createElement('span');
            leftSpan.textContent = `${item.emoji} ${item.name}`;
            
            const rightSpan = document.createElement('span');
            rightSpan.textContent = `${itemCost}g`;
            rightSpan.style.color = '#FFD700';
            
            buttonContent.appendChild(leftSpan);
            buttonContent.appendChild(rightSpan);
            itemButton.appendChild(buttonContent);
            
            if (canAfford) {
                itemButton.onclick = () => {
                    item.action();
                    // Update gold display and button states after purchase using CURRENT gold
                    goldDisplay.textContent = `Gold: ${this.gold}`;
                    this.updateShopButtonStates(shopContainer, itemCost);
                };
            }
            
            shopContainer.appendChild(itemButton);
        });
        
            slide.appendChild(shopContainer);
        }, 100); // Small delay to show shop text briefly before UI
    }
    
    updateShopButtonStates(shopContainer, itemCost) {
        const buttons = shopContainer.querySelectorAll('button');
        buttons.forEach(button => {
            const canAfford = this.gold >= itemCost; // Use CURRENT gold
            button.style.backgroundColor = canAfford ? '#4CAF50' : '#666';
            button.style.cursor = canAfford ? 'pointer' : 'not-allowed';
            button.style.opacity = canAfford ? '1' : '0.5';
            button.disabled = !canAfford;
        });
    }
    
    showGoldMessage(slide, goldAmount) {
        // Clear existing content and show gold reward message
        slide.innerHTML = '';
        
        const goldDisplay = document.createElement('div');
        goldDisplay.className = 'text-number-large';
        goldDisplay.innerHTML = `<div>💰</div><div>+${goldAmount}</div>`;
        goldDisplay.classList.add('gold');
        goldDisplay.style.textAlign = 'center';
        
        slide.appendChild(goldDisplay);
        
        // Add animation
        setTimeout(() => {
            goldDisplay.classList.add('used');
        }, 1000);
    }
    
    showBossLootMessage(slide, goldAmount) {
        // Clear existing content and show boss loot reward message
        slide.innerHTML = '';
        
        const lootDisplay = document.createElement('div');
        lootDisplay.className = 'text-number-large';
        lootDisplay.innerHTML = `<div>💎</div><div>+${goldAmount}</div>`;
        lootDisplay.classList.add('gold');
        lootDisplay.style.textAlign = 'center';
        lootDisplay.style.textShadow = '0 0 15px rgba(255, 215, 0, 0.8)';
        lootDisplay.style.animation = 'pulse 1s ease-in-out infinite';
        
        slide.appendChild(lootDisplay);
        
        // Add animation
        setTimeout(() => {
            lootDisplay.classList.add('used');
        }, 1500); // Longer display time for boss loot
    }
    
    createGoldSlide(slide, goldAmount) {
        // Create a regular gold slide that looks like a normal gold reward
        const numberDisplay = document.createElement('div');
        numberDisplay.className = 'text-number-large';
        numberDisplay.textContent = `💰 +${goldAmount}`;
        numberDisplay.classList.add('gold');
        numberDisplay.dataset.originalNumber = goldAmount;
        
        slide.dataset.isGold = 'true';
        slide.dataset.isShop = 'false';
        slide.dataset.scored = 'false'; // Allow it to be scored normally
        
        slide.appendChild(numberDisplay);
    }
    
    
    createShopButton(title, price, canAfford, onClick) {
        const button = document.createElement('button');
        button.style.backgroundColor = canAfford ? '#4CAF50' : '#666';
        button.style.color = '#fff';
        button.style.cursor = canAfford ? 'pointer' : 'not-allowed';
        button.className = 'text-body button';
        button.style.opacity = canAfford ? '1' : '0.5';
        button.disabled = !canAfford;
        
        // Add hover effect for afforded buttons
        if (canAfford) {
            button.addEventListener('mouseenter', () => {
                button.style.backgroundColor = '#45a049';
            });
            button.addEventListener('mouseleave', () => {
                button.style.backgroundColor = '#4CAF50';
            });
        }
        
        const titleSpan = document.createElement('span');
        titleSpan.textContent = title;
        
        const priceSpan = document.createElement('span');
        priceSpan.textContent = price;
        priceSpan.style.color = '#FFD700';
        
        button.appendChild(titleSpan);
        button.appendChild(priceSpan);
        
        if (canAfford) {
            button.onclick = onClick;
        }
        
        return button;
    }
    
    purchaseFullHeal(cost, shopOverlay) {
        if (this.gold >= cost) {
            this.gold -= cost;
            this.score = this.maxScore; // Full heal
            this.scoreElement.textContent = `${this.score}/${this.maxScore}`;
            this.goldElement.textContent = this.gold;
            if (shopOverlay) this.closeShop(shopOverlay);
        }
    }
    
    purchaseACUpgrade(cost, shopOverlay) {
        if (this.gold >= cost) {
            this.gold -= cost;
            this.armor += 1;
            this.armorElement.textContent = this.armor;
            this.goldElement.textContent = this.gold;
            if (shopOverlay) this.closeShop(shopOverlay);
        }
    }
    
    purchaseMaxHPUpgrade(cost, shopOverlay) {
        if (this.gold >= cost) {
            this.gold -= cost;
            this.addMaxHP(1);
            this.goldElement.textContent = this.gold;
            if (shopOverlay) this.closeShop(shopOverlay);
        }
    }
    
    closeShop(shopOverlay) {
        if (shopOverlay.parentNode) {
            shopOverlay.parentNode.removeChild(shopOverlay);
        }
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
        // Create red fill element first
        const redFill = document.createElement('div');
        redFill.style.position = 'fixed';
        redFill.style.top = '0';
        redFill.style.left = '0';
        redFill.style.width = '100%';
        redFill.style.height = '0%';
        redFill.style.backgroundColor = '#DC143C';
        redFill.style.zIndex = '9998';
        redFill.style.transition = 'height 3s ease-out';
        
        // Create game over overlay (hidden initially)
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
        overlay.style.flexDirection = 'column';
        overlay.style.textAlign = 'center';
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 1s ease-in';
        
        // Game Over title
        const gameOverTitle = document.createElement('div');
        gameOverTitle.textContent = 'GAME OVER';
        gameOverTitle.className = 'text-number-large';
        gameOverTitle.style.marginBottom = '20px';
        
        // Floor count
        const floorCount = document.createElement('div');
        floorCount.textContent = `You made it to floor ${this.currentFloor}`;
        floorCount.className = 'text-h1';
        floorCount.style.marginBottom = '40px';
        
        // Tap to restart label
        const restartLabel = document.createElement('div');
        restartLabel.textContent = 'Tap to restart';
        restartLabel.className = 'text-body';
        restartLabel.style.opacity = '0.7';
        
        overlay.appendChild(gameOverTitle);
        overlay.appendChild(floorCount);
        overlay.appendChild(restartLabel);
        
        document.body.appendChild(redFill);
        document.body.appendChild(overlay);
        
        // Start red fill animation
        setTimeout(() => {
            redFill.style.height = '100%';
        }, 100);
        
        // Fade in text after red fill completes
        setTimeout(() => {
            overlay.style.opacity = '1';
        }, 3200); // After 3s red fill + 200ms buffer
        
        // Add tap to restart functionality
        overlay.addEventListener('click', () => {
            this.restartGame();
        });
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
        this.currentFloor = 0;
        this.shopAvailable = false;
        this.floorElement.textContent = this.currentFloor;
        
        // Reset armor
        this.armor = 10;
        this.armorElement.textContent = this.armor;
        
        // Reset gold
        this.gold = 0;
        this.goldElement.textContent = this.gold;
        
        // Reset curse system
        this.curseCountdown = 0;
        this.activeCurse = null;
        this.updateCurseDisplay();
        
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
        
        // Roll d20 for attack with floor bonus (+1 every 5 floors) and danger bonus
        const floorBonus = Math.floor(this.currentFloor / 5);
        const attackRoll = Math.floor(Math.random() * 20) + 1 + floorBonus + this.danger;
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
        
        // Start with the dice immediately (vertical layout)
        numberDisplay.innerHTML = `<div>${sword}</div><div></div>`;
        const textDiv = numberDisplay.querySelector('div:last-child');
        textDiv.appendChild(diceSpan);
        
        const rollTimer = setInterval(() => {
            rollCount++;
            
            if (rollCount >= maxRolls) {
                clearInterval(rollTimer);
                
                if (isHit) {
                    // Hit - show original damage (vertical layout)
                    numberDisplay.innerHTML = `<div>${sword}</div><div>${finalDamage}</div>`;
                    this.addToScore(finalDamage);
                } else {
                    // Miss - show Miss instead (vertical layout)
                    numberDisplay.innerHTML = `<div style="text-align: center;">${sword}</div><div style="text-align: center;">Miss!</div>`;
                    numberDisplay.classList.add('miss');
                    // Enemy gets stronger when they miss!
                    this.danger++;
                    this.dangerElement.textContent = this.danger;
                    // No damage applied
                }
                
                // Wait 1 second before changing to grey "used up" appearance
                setTimeout(() => {
                    numberDisplay.classList.add('used');
                }, 1000);
            }
        }, rollInterval);
    }
    
    rollBossAttack(numberDisplay, slide, finalDamage) {
        // Mark as scored to prevent re-scoring
        slide.dataset.scored = 'true';
        
        // Extract dragon and number from original text (e.g., "🐉 -7")
        const originalText = numberDisplay.textContent;
        const dragon = '🐉';
        
        // Roll d20 for boss attack with floor bonus (+1 every 5 floors) PLUS +2 boss bonus and danger bonus
        const floorBonus = Math.floor(this.currentFloor / 5);
        const bossBonus = 2; // Bosses get +2 to hit
        const attackRoll = Math.floor(Math.random() * 20) + 1 + floorBonus + bossBonus + this.danger;
        const isHit = attackRoll > this.armor;
        
        // Start rolling animation - keep dragon, replace number with dice
        let rollCount = 0;
        const maxRolls = 8; // Boss rolls longer (8 times for dramatic effect)
        const rollInterval = 120; // Slightly slower rolls for bosses (more dramatic)
        
        // Create three dice with rotation animation for boss
        const diceContainer = document.createElement('span');
        for (let i = 0; i < 3; i++) {
            const diceSpan = document.createElement('span');
            diceSpan.textContent = '🎲';
            diceSpan.style.display = 'inline-block';
            diceSpan.style.animation = 'spin 0.2s linear infinite';
            diceSpan.style.marginRight = '5px';
            diceContainer.appendChild(diceSpan);
        }
        
        // Start with the dice immediately (vertical layout)
        numberDisplay.innerHTML = `<div>${dragon}</div><div></div>`;
        const textDiv = numberDisplay.querySelector('div:last-child');
        textDiv.appendChild(diceContainer);
        
        const rollTimer = setInterval(() => {
            rollCount++;
            
            if (rollCount >= maxRolls) {
                clearInterval(rollTimer);
                
                if (isHit) {
                    // Hit - show original damage (vertical layout)
                    numberDisplay.innerHTML = `<div>${dragon}</div><div>${finalDamage}</div>`;
                    this.addToScore(finalDamage);
                } else {
                    // Miss - show Miss instead (vertical layout)
                    numberDisplay.innerHTML = `<div style="text-align: center;">${dragon}</div><div style="text-align: center;">Miss!</div>`;
                    numberDisplay.classList.add('miss');
                    // Enemy gets stronger when they miss!
                    this.danger++;
                    this.dangerElement.textContent = this.danger;
                    // No damage applied
                }
                
                // Wait 1.5 seconds before changing to grey "used up" appearance (longer for bosses)
                setTimeout(() => {
                    numberDisplay.classList.add('used');
                }, 1500);
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
        // Allow horizontal scrolling, prevent vertical scrolling unless allowed
        const horizontalContainer = e.target.closest('.horizontal-container');
        if (!horizontalContainer) {
            // Only prevent vertical scrolling if we can't descend
            const touch = e.touches[0];
            const verticalDistance = this.touchStartY - touch.clientY;
            
            // If trying to scroll down (swipe up) and can't descend, prevent it
            if (verticalDistance > 0 && !this.canDescend()) {
                e.preventDefault();
            }
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
                // Swiped up - go to next item (descent)
                if (this.canDescend()) {
                    this.nextItem();
                }
            } else {
                // Swiped down - go to previous item (always allowed)
                this.previousItem();
            }
        }
    }
    
    handleWheel(e) {
        // Check if scrolling is happening on a horizontal container
        const horizontalContainer = e.target.closest('.horizontal-container');
        if (horizontalContainer) {
            // Allow horizontal scrolling
            return;
        }
        
        // For vertical scrolling, check if we can descend
        if (e.deltaY > 0 && !this.canDescend()) {
            // Trying to scroll down but can't descend
            e.preventDefault();
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
                if (this.canDescend()) {
                    this.nextItem();
                }
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
    
    canDescend() {
        // Get the current feed item
        const currentItem = document.querySelector(`[data-index="${this.currentIndex}"]`);
        if (!currentItem) return false;
        
        // Get the current horizontal scroll position to determine which slide is active
        const horizontalContainer = currentItem.querySelector('.horizontal-container');
        if (!horizontalContainer) return false;
        
        const scrollLeft = horizontalContainer.scrollLeft;
        const containerWidth = horizontalContainer.clientWidth;
        const activeSlideIndex = Math.round(scrollLeft / containerWidth);
        
        const slides = horizontalContainer.querySelectorAll('.slide');
        const currentSlide = slides[activeSlideIndex];
        
        if (!currentSlide) return false;
        
        // Allow descent if it's the last slide (shop) or a stairs slide
        const isLastSlide = activeSlideIndex === slides.length - 1;
        const isStairsSlide = currentSlide.dataset.canDescend === 'true';
        
        return isLastSlide || isStairsSlide;
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
                const oldFloor = this.currentFloor;
                this.currentFloor = index + 1;
                this.floorElement.textContent = this.currentFloor;
                
                
                // Decrement curse countdown when moving to a new floor
                if (this.currentFloor > oldFloor && this.curseCountdown > 0) {
                    this.curseCountdown--;
                    this.updateCurseDisplay();
                    
                    // If curse expired, restore armor if it was modified
                    if (this.curseCountdown === 0 && this.activeCurse?.effects.armorDivider) {
                        this.armor *= this.activeCurse.effects.armorDivider;
                        this.armorElement.textContent = this.armor;
                    }
                }
            }, 200); // Wait 200ms before updating floor to let scroll settle
            
            // Add score for the first visible slide in the new frame (if it's not START and not initial load)
            if (index > 0) { // Don't score on initial load (index 0)
                const firstSlide = activeItem.querySelector('.slide');
                if (firstSlide && firstSlide.dataset.scored === 'false') {
                    const numberDisplay = firstSlide.querySelector('.text-number-large');
                    const isShop = firstSlide.dataset.isShop === 'true';
                    
                    if (isShop) {
                        console.log('Opening shop from vertical scroll!'); // Debug log
                        this.openShop(firstSlide);
                    } else if (firstSlide.dataset.isWitch === 'true') {
                        console.log('Witch encounter from vertical scroll!'); // Debug log
                        this.startWitchEncounter(firstSlide);
                    } else if (firstSlide.dataset.isBoss === 'true') {
                        console.log('Boss fight from vertical scroll!'); // Debug log
                        const bossDisplay = firstSlide.querySelector('.text-number-large');
                        const bossDamage = parseInt(bossDisplay.dataset.originalNumber);
                        this.rollBossAttack(bossDisplay, firstSlide, bossDamage);
                    } else if (numberDisplay && numberDisplay.dataset.originalNumber !== undefined) {
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