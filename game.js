// Advanced Tetris Game - JavaScript Implementation
// Based on the PureBasic "Blocks" game

class BlocksGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('nextPieceCanvas');
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        // Game state
        this.mode = 2; // 0=TRITRIS, 1=TETRIS, 2=HEXTRIS
        this.width = 15;
        this.height = 25;
        this.blockSize = 24;
        this.board = [];
        this.currentPiece = null;
        this.nextPiece = null;
        this.pieceX = 0;
        this.pieceY = 0;
        this.score = 0;
        this.lines = 0;
        this.level = 0;
        this.playing = false;
        this.paused = false;
        this.gameOver = false;
        
        // Timing
        this.lastTime = 0;
        this.dropTime = 0;
        this.dropSpeed = 350; // milliseconds
        this.moveTime = 0;
        this.moveSpeed = 60; // Fast repeat rate
        this.initialMoveDelay = 110; // Short initial delay before repeat starts (slightly less sensitive)
        this.rotateTime = 0;
        this.rotateSpeed = 150;
        
        // Movement state tracking
        this.keysPressed = {
            left: false,
            right: false
        };
        this.lastMoveDirection = null;
        this.moveStartTime = 0;
        
        // Slide/Wall Kick system - easily configurable
        this.slideConfig = {
            enabled: true,
            maxSlideDistance: 3, // How far pieces can slide (in blocks) - increased from 2
            slideAttempts: [
                [0, 0],   // Try original position first
                [-1, 0],  // Try left
                [1, 0],   // Try right  
                [-2, 0],  // Try further left
                [2, 0],   // Try further right
                [0, -1],  // Try up
                [-1, -1], // Try left-up
                [1, -1],  // Try right-up
                [-3, 0],  // Try max left
                [3, 0],   // Try max right
                [0, -2],  // Try further up
                [-2, -1], // Try far left-up
                [2, -1],  // Try far right-up
                [-1, -2], // Try left-far up
                [1, -2]   // Try right-far up
            ]
        };
        
        // Piece statistics
        this.pieceStats = {};
        this.totalPieces = 0;
        
        // High scores system (keyed by mode+size)
        this.highScores = this.loadHighScores();
        
        // Special message display
        this.specialMessage = '';
        this.specialMessageTime = 0;
        
        // Sprite sheet for piece textures
        this.spriteSheet = null;
        this.spriteSize = 24; // Each sprite is 24x24 pixels
        this.spriteGridSize = 6; // 6x6 grid
        this.spritesLoaded = false;
        
        // Block colors (consistent colors for each piece type 1-29) - fallback if sprites fail
        this.blockColors = [
            '#000000', // 0 - empty
            '#FF0000', // 1 - Red
            '#00FF00', // 2 - Green  
            '#0000FF', // 3 - Blue
            '#FFFF00', // 4 - Yellow
            '#FF00FF', // 5 - Magenta
            '#00FFFF', // 6 - Cyan
            '#FFA500', // 7 - Orange
            '#800080', // 8 - Purple
            '#008000', // 9 - Dark Green
            '#800000', // 10 - Maroon
            '#008080', // 11 - Teal
            '#808080', // 12 - Gray
            '#C0C0C0', // 13 - Silver
            '#FFB6C1', // 14 - Light Pink
            '#FF69B4', // 15 - Hot Pink
            '#FF1493', // 16 - Deep Pink
            '#DC143C', // 17 - Crimson
            '#B22222', // 18 - Fire Brick
            '#8B0000', // 19 - Dark Red
            '#FF6347', // 20 - Tomato
            '#FF4500', // 21 - Orange Red
            '#FF8C00', // 22 - Dark Orange
            '#FFD700', // 23 - Gold
            '#ADFF2F', // 24 - Green Yellow
            '#32CD32', // 25 - Lime Green
            '#90EE90', // 26 - Light Green
            '#98FB98', // 27 - Pale Green
            '#F0E68C', // 28 - Khaki
            '#DDA0DD'  // 29 - Plum
        ];
        
        this.loadSpriteSheet();
        this.initGame();
        this.updateHighScoresDisplay();
        this.setupEventListeners();
        this.gameLoop();
    }
    
    loadSpriteSheet() {
        this.spriteSheet = new Image();
        this.spriteSheet.onload = () => {
            this.spritesLoaded = true;
            console.log('🖼️ Sprite sheet loaded successfully!');
        };
        this.spriteSheet.onerror = () => {
            console.warn('⚠️ Failed to load sprite sheet, falling back to solid colors');
            this.spritesLoaded = false;
        };
        this.spriteSheet.src = 'piece_sprites.png';
    }
    
    initGame() {
        this.resizeCanvas();
        this.initBoard();
        this.generateNextPiece();
        this.spawnNewPiece();
        this.updateUI();
        this.playing = true;
    }
    
    resizeCanvas() {
        this.canvas.width = this.width * this.blockSize;
        this.canvas.height = this.height * this.blockSize;
    }
    
    initBoard() {
        this.board = [];
        for (let y = 0; y < this.height; y++) {
            this.board[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.board[y][x] = 0;
            }
        }
    }
    
    // Piece definitions based on the original PureBasic code
    getPieceDefinition(type, mode) {
        const pieces = {
            // TRITRIS mode pieces (3 blocks each - triominoes)
            tritris: [
                { image: 1, blocks: [[0,0], [0,0], [0,0]] }, // dot
                { image: 2, blocks: [[0,-1], [0,0], [0,1]] }, // line
                { image: 3, blocks: [[-1,0], [1,0], [1,0]] }, // spaced
                { image: 4, blocks: [[-1,0], [0,0], [0,1]] }, // L
                { image: 5, blocks: [[0,0], [1,0], [0,0]] }, // two line
                { image: 6, blocks: [[-1,-1], [0,0], [1,1]] }, // zig
                { image: 7, blocks: [[-1,-1], [0,0], [-1,1]] }, // bent
                { image: 8, blocks: [[0,0], [0,0], [0,0]] } // random
            ],
            
            // TETRIS mode pieces (standard Tetris - 4 blocks each - tetrominoes)
            tetris: [
                { image: 1, blocks: [[0,0], [1,0], [0,1], [1,1]] }, // square
                { image: 2, blocks: [[-1,1], [-1,0], [0,0], [1,0]] }, // L
                { image: 3, blocks: [[-1,0], [0,0], [1,0], [1,1]] }, // L-backwards
                { image: 4, blocks: [[-1,0], [0,0], [1,0], [2,0]] }, // line
                { image: 5, blocks: [[1,0], [0,0], [0,1], [-1,1]] }, // N
                { image: 6, blocks: [[1,1], [0,1], [0,0], [-1,0]] }, // N-backwards
                { image: 7, blocks: [[0,1], [-1,0], [0,0], [1,0]] } // T
            ],
            
            // HEXTRIS mode pieces (up to 6 blocks each - complex pieces/hexominoes)
            hextris: [
                { image: 1, blocks: [[0,0], [1,0], [0,1], [1,1]] }, // square
                { image: 2, blocks: [[-1,1], [-1,0], [0,0], [1,0]] }, // L
                { image: 3, blocks: [[-1,0], [0,0], [1,0], [1,1]] }, // L-backwards
                { image: 4, blocks: [[-1,0], [0,0], [1,0], [2,0]] }, // line
                { image: 5, blocks: [[1,0], [0,0], [0,1], [-1,1]] }, // N
                { image: 6, blocks: [[1,1], [0,1], [0,0], [-1,0]] }, // N-backwards
                { image: 7, blocks: [[0,1], [-1,0], [0,0], [1,0]] }, // T
                { image: 8, blocks: [[0,0]] }, // dot
                { image: 9, blocks: [[-1,-1], [-1,0], [0,0], [1,0], [1,1]] }, // screw
                { image: 10, blocks: [[1,-1], [1,0], [0,0], [-1,0], [-1,1]] }, // screw backwards
                { image: 11, blocks: [[-1,0], [0,0], [1,0], [0,-1], [0,1]] }, // long cross
                { image: 12, blocks: [[-1,0], [0,0], [1,0], [0,-1], [0,1], [2,0]] }, // cross
                { image: 13, blocks: [[-1,-1], [0,-1], [1,-1], [-1,1], [0,1], [1,1]] }, // layers
                { image: 14, blocks: [[-1,-1], [-1,0], [0,0], [0,1], [1,-1], [1,0]] }, // Y
                { image: 15, blocks: [[-1,0], [-1,1], [0,1], [1,0], [1,1]] }, // U
                { image: 16, blocks: [[-2,0], [-1,0], [0,0], [1,0], [2,0]] }, // 5 line
                { image: 17, blocks: [[-2,0], [-1,0], [0,0], [1,0], [2,0], [3,0]] }, // 6 line
                { image: 18, blocks: [[-1,0], [0,0], [1,0], [-1,1], [0,1], [1,1]] }, // 3x2 block
                { image: 19, blocks: [[-1,0], [0,1], [1,0]] }, // zig-zag
                { image: 20, blocks: [[-1,0], [0,0], [-1,1], [0,1], [1,0]] }, // 2x2 + notch top
                { image: 21, blocks: [[-1,0], [0,0], [-1,1], [0,1], [1,1]] }, // 2x2 + notch bottom
                { image: 22, blocks: [[0,0], [0,1]] }, // 2-line
                { image: 23, blocks: [[-1,-1], [0,-1], [1,-1], [0,0], [0,1]] }, // big T
                { image: 24, blocks: [[-1,0], [-1,1], [1,0], [1,1]] }, // short parallel
                { image: 25, blocks: [[-1,-1], [0,-1], [1,-1], [1,0], [1,1]] }, // big L backwards
                { image: 26, blocks: [[-2,0], [-1,0], [0,0], [1,0], [2,0], [0,1]] }, // TO
                { image: 27, blocks: [[-1,0], [0,0], [0,1]] }, // small L
                { image: 28, blocks: [[-1,0], [0,0], [1,0]] } // 3x1 line
            ]
        };
        
        const modeNames = ['tritris', 'tetris', 'hextris'];
        const modeKey = modeNames[mode];
        const pieceArray = pieces[modeKey];
        
        if (type >= pieceArray.length) {
            type = 0;
        }
        
        return pieceArray[type];
    }
    
    generateNextPiece() {
        let maxPieces;
        switch(this.mode) {
            case 0: maxPieces = 8; break;  // TRITRIS mode
            case 1: maxPieces = 7; break;  // TETRIS mode
            case 2: maxPieces = 28; break; // HEXTRIS mode
        }
        
        const type = Math.floor(Math.random() * maxPieces);
        this.nextPiece = this.getPieceDefinition(type, this.mode);
        this.nextPiece.type = type;
    }
    
    spawnNewPiece() {
        this.currentPiece = this.nextPiece;
        this.pieceX = Math.floor(this.width / 2);
        this.pieceY = 0;
        
        // Track piece statistics
        if (this.currentPiece) {
            const pieceType = this.currentPiece.type;
            this.pieceStats[pieceType] = (this.pieceStats[pieceType] || 0) + 1;
            this.totalPieces++;
            this.updateHistogram();
        }
        
        this.generateNextPiece();
        
        // Check if game over
        if (this.isCollision(this.currentPiece, this.pieceX, this.pieceY)) {
            this.gameOver = true;
            this.playing = false;
            this.checkAndUpdateHighScore();
            this.showGameOver();
        }
    }
    
    isCollision(piece, x, y) {
        for (let block of piece.blocks) {
            const blockX = x + block[0];
            const blockY = y + block[1];
            
            if (blockX < 0 || blockX >= this.width || 
                blockY >= this.height ||
                (blockY >= 0 && this.board[blockY][blockX] !== 0)) {
                return true;
            }
        }
        return false;
    }
    
    placePiece() {
        for (let block of this.currentPiece.blocks) {
            const blockX = this.pieceX + block[0];
            const blockY = this.pieceY + block[1];
            
            if (blockY >= 0) {
                this.board[blockY][blockX] = this.currentPiece.image;
            }
        }
        
        this.score += 30 + (10 * this.level);
        this.checkLines();
        this.spawnNewPiece();
    }
    
    checkLines() {
        let linesCleared = 0;
        
        for (let y = this.height - 1; y >= 0; y--) {
            let fullLine = true;
            for (let x = 0; x < this.width; x++) {
                if (this.board[y][x] === 0) {
                    fullLine = false;
                    break;
                }
            }
            
            if (fullLine) {
                // Remove the line
                this.board.splice(y, 1);
                // Add empty line at top
                this.board.unshift(new Array(this.width).fill(0));
                linesCleared++;
                y++; // Check the same line again
            }
        }
        
        if (linesCleared > 0) {
            this.lines += linesCleared;
            this.updateScore(linesCleared);
            this.updateLevel();
        }
    }
    
    updateScore(linesCleared) {
        let bonus = 0;
        let message = '';
        
        // Message arrays for each line clear count
        const messageArrays = {
            1: ['SINGLE!', 'GOOD!', 'WOAH!',  'ONE!'],
            2: ['DOUBLE!', 'X2!', 'TWO!', 'PAIR!', 'SWEET!'],
            3: ['TRIPLE!', 'WHAMMO!', 'THREE!', 'AMAZING!'],
            4: ['TETRIS!', 'AWESOME!', 'QUAD!', 'FOUR!', 'FANTASTIC!'],
            5: ['PENTRIS!', 'FIVE!', 'INCREDIBLE!', 'SUPER!'],
            6: ['HEXTRIS!', 'SIX!', 'ULTIMATE!', 'LEGENDARY!', 'EPIC!']
        };
        
        if (linesCleared === 1) {
            bonus = 150;
        } else if (linesCleared === 2) {
            bonus = 350;
        } else if (linesCleared === 3) {
            bonus = 2500;
        } else if (linesCleared === 4) {
            bonus = 5000;
        } else if (linesCleared === 5) {
            bonus = 10000;
        } else if (linesCleared >= 6) {
            bonus = 15000;
        }
        
        // Pick random message from appropriate array
        if (linesCleared >= 1) {
            const messages = messageArrays[Math.min(linesCleared, 6)];
            message = messages[Math.floor(Math.random() * messages.length)];
        }
        
        this.score += bonus;
        
        if (message) {
            this.showSpecialMessage(message, linesCleared);
        }
    }
    
    updateLevel() {
        const newLevel = Math.floor(this.lines / 10);
        if (newLevel > this.level) {
            this.level = newLevel;
            if (this.dropSpeed >= 75) {
                this.dropSpeed -= 25;
            } else if (this.dropSpeed > 30) {
                this.dropSpeed -= 2;
            }
            if (this.dropSpeed < 30) {
                this.dropSpeed = 30;
            }
        }
    }
    
    showSpecialMessage(message, linesCleared = 0) {
        this.specialMessage = message;
        this.specialMessageTime = 1200; // Show for 1.2 seconds (200ms longer)
        
        const messageEl = document.getElementById('specialMessage');
        messageEl.textContent = message;
        messageEl.style.display = 'block';
        
        // Apply visual effects based on lines cleared
        this.applyMessageEffects(messageEl, linesCleared);
    }
    
    applyMessageEffects(element, linesCleared) {
        // Reset all effects first
        element.className = 'special-message';
        
        if (linesCleared === 1) {
            // Basic glow
            element.classList.add('effect-glow-basic');
        } else if (linesCleared === 2) {
            // Stronger glow with pulse
            element.classList.add('effect-glow-pulse');
        } else if (linesCleared === 3) {
            // Color changing glow
            element.classList.add('effect-glow-color');
        } else if (linesCleared === 4) {
            // Fireworks effect
            element.classList.add('effect-fireworks');
        } else if (linesCleared === 5) {
            // Intense fireworks with shake
            element.classList.add('effect-fireworks-intense');
        } else if (linesCleared >= 6) {
            // Rainbow ultimate effect
            element.classList.add('effect-rainbow-ultimate');
        }
    }
    
    rotatePiece(direction) {
        if (!this.currentPiece) return;
        
        const rotatedBlocks = this.currentPiece.blocks.map(block => {
            if (direction === 1) { // Rotate clockwise (90 degrees)
                return [-block[1], block[0]];
            } else if (direction === -1) { // Rotate counterclockwise (90 degrees)
                return [block[1], -block[0]];
            } else if (direction === 2) { // Rotate 180 degrees
                return [-block[0], -block[1]];
            }
        });
        
        const rotatedPiece = { ...this.currentPiece, blocks: rotatedBlocks };
        
        // Try rotation with slide/wall kick system
        if (this.tryPlacement(rotatedPiece, this.pieceX, this.pieceY)) {
            this.currentPiece = rotatedPiece;
        }
    }
    
    movePiece(dx, dy) {
        if (!this.currentPiece) return false;
        
        const newX = this.pieceX + dx;
        const newY = this.pieceY + dy;
        
        // For horizontal movement, try sliding if enabled
        if (dx !== 0 && this.slideConfig.enabled) {
            if (this.tryPlacement(this.currentPiece, newX, newY)) {
                return true;
            }
        } else {
            // Regular movement (vertical or slide disabled)
            if (!this.isCollision(this.currentPiece, newX, newY)) {
                this.pieceX = newX;
                this.pieceY = newY;
                return true;
            }
        }
        
        return false;
    }
    
    tryPlacement(piece, targetX, targetY) {
        if (!this.slideConfig.enabled) {
            // If sliding is disabled, just try the exact position
            if (!this.isCollision(piece, targetX, targetY)) {
                this.pieceX = targetX;
                this.pieceY = targetY;
                return true;
            }
            return false;
        }
        
        // Try each slide attempt in order of preference
        for (let attempt of this.slideConfig.slideAttempts) {
            const testX = targetX + attempt[0];
            const testY = targetY + attempt[1];
            
            // Skip if slide distance exceeds maximum
            if (Math.abs(attempt[0]) > this.slideConfig.maxSlideDistance || 
                Math.abs(attempt[1]) > this.slideConfig.maxSlideDistance) {
                continue;
            }
            
            if (!this.isCollision(piece, testX, testY)) {
                this.pieceX = testX;
                this.pieceY = testY;
                return true;
            }
        }
        
        return false;
    }
    
    dropPiece() {
        if (!this.movePiece(0, 1)) {
            this.placePiece();
        }
    }
    
    updateHistogram() {
        const histogramDiv = document.getElementById('pieceHistogram');
        if (!histogramDiv) return;
        
        histogramDiv.innerHTML = '';
        
        // Get max pieces for current mode
        let maxPieces;
        switch(this.mode) {
            case 0: maxPieces = 8; break;  // TRITRIS mode
            case 1: maxPieces = 7; break;  // TETRIS mode  
            case 2: maxPieces = 28; break; // HEXTRIS mode
        }
        
        // Create histogram entries for each piece type
        for (let i = 0; i < maxPieces; i++) {
            const count = this.pieceStats[i] || 0;
            const piece = this.getPieceDefinition(i, this.mode);
            
            const statDiv = document.createElement('div');
            statDiv.className = 'piece-stat';
            
            // Create mini canvas for piece preview
            const canvas = document.createElement('canvas');
            canvas.className = 'piece-preview';
            canvas.width = 62;
            canvas.height = 34;
            const ctx = canvas.getContext('2d');
            
            // Draw piece preview
            ctx.fillStyle = '#333';
            ctx.fillRect(0, 0, 62, 34);
            
            if (piece && piece.blocks) {
                const blockSize = 9; // Slightly larger blocks for bigger preview
                const centerX = 31; // Adjusted for wider canvas (62/2 = 31)
                const centerY = 17; // Adjusted for taller canvas (34/2 = 17)
                
                for (let block of piece.blocks) {
                    const x = centerX + (block[0] * blockSize) - blockSize/2;
                    const y = centerY + (block[1] * blockSize) - blockSize/2;
                    
                    if (this.spritesLoaded && this.spriteSheet) {
                        // Draw from sprite sheet
                        this.drawSprite(ctx, x, y, piece.image, blockSize);
                    } else {
                        // Fallback to solid colors
                        ctx.fillStyle = this.blockColors[piece.image] || '#666';
                        ctx.fillRect(x, y, blockSize, blockSize);
                        
                        // Add border for better visibility
                        ctx.strokeStyle = '#fff';
                        ctx.lineWidth = 0.5;
                        ctx.strokeRect(x, y, blockSize, blockSize);
                    }
                }
            }
            
            // Create count display
            const countSpan = document.createElement('span');
            countSpan.className = 'piece-count';
            countSpan.textContent = `×${count}`;
            
            statDiv.appendChild(canvas);
            statDiv.appendChild(countSpan);
            histogramDiv.appendChild(statDiv);
        }
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw board
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.board[y][x] !== 0) {
                    this.drawBlock(x, y, this.board[y][x]);
                }
            }
        }
        
        // Draw current piece
        if (this.currentPiece && !this.gameOver) {
            for (let block of this.currentPiece.blocks) {
                const x = this.pieceX + block[0];
                const y = this.pieceY + block[1];
                if (y >= 0) {
                    this.drawBlock(x, y, this.currentPiece.image);
                }
            }
        }
        
        // Draw next piece
        this.drawNextPiece();
        
        // Update special message
        if (this.specialMessageTime > 0) {
            this.specialMessageTime -= 16; // Assuming 60 FPS
            if (this.specialMessageTime <= 0) {
                document.getElementById('specialMessage').style.display = 'none';
            }
        }
    }
    
    drawBlock(x, y, colorIndex) {
        const pixelX = x * this.blockSize;
        const pixelY = y * this.blockSize;
        
        if (this.spritesLoaded && this.spriteSheet && colorIndex > 0) {
            // Draw from sprite sheet
            this.drawSprite(this.ctx, pixelX, pixelY, colorIndex, this.blockSize);
        } else {
            // Fallback to solid colors
            this.ctx.fillStyle = this.blockColors[colorIndex] || '#666';
            this.ctx.fillRect(pixelX, pixelY, this.blockSize, this.blockSize);
            
            // Add border for better visibility
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(pixelX, pixelY, this.blockSize, this.blockSize);
        }
    }
    
    drawSprite(ctx, destX, destY, spriteIndex, destSize) {
        if (!this.spriteSheet || spriteIndex <= 0) return;
        
        // Calculate source position in sprite sheet (1-based to 0-based)
        const gridIndex = spriteIndex - 1;
        const srcX = (gridIndex % this.spriteGridSize) * this.spriteSize;
        const srcY = Math.floor(gridIndex / this.spriteGridSize) * this.spriteSize;
        
        // Draw the sprite scaled to the destination size
        ctx.drawImage(
            this.spriteSheet,
            srcX, srcY, this.spriteSize, this.spriteSize,  // Source rectangle
            destX, destY, destSize, destSize              // Destination rectangle
        );
    }
    
    drawNextPiece() {
        this.nextCtx.fillStyle = '#333';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        
        if (this.nextPiece) {
            const centerX = this.nextCanvas.width / 2;
            const centerY = this.nextCanvas.height / 2;
            const blockSize = 16;
            
            for (let block of this.nextPiece.blocks) {
                const x = centerX + (block[0] * blockSize) - blockSize/2;
                const y = centerY + (block[1] * blockSize) - blockSize/2;
                
                if (this.spritesLoaded && this.spriteSheet) {
                    // Draw from sprite sheet
                    this.drawSprite(this.nextCtx, x, y, this.nextPiece.image, blockSize);
                } else {
                    // Fallback to solid colors
                    this.nextCtx.fillStyle = this.blockColors[this.nextPiece.image] || '#666';
                    this.nextCtx.fillRect(x, y, blockSize, blockSize);
                    
                    this.nextCtx.strokeStyle = '#fff';
                    this.nextCtx.lineWidth = 1;
                    this.nextCtx.strokeRect(x, y, blockSize, blockSize);
                }
            }
        }
    }
    
    updateUI() {
        document.getElementById('currentLevel').textContent = this.level;
        document.getElementById('currentLines').textContent = this.lines;
        document.getElementById('currentScore').textContent = this.score;
        

    }
    
    getSizeKey() {
        if (this.width === 10 && this.height === 10) return 'small';
        if (this.width === 10 && this.height === 20) return 'medium';
        return 'big';
    }
    
    resetHighScores() {
        if (confirm('Are you sure you want to reset all high scores?')) {
            this.highScores = {}; // Reset to empty object for keyed system
            localStorage.removeItem('blocksHighScores');
            this.updateHighScoresDisplay();
        }
    }
    
    newGame() {
        this.gameOver = false;
        this.paused = false;
        this.score = 0;
        this.lines = 0;
        this.level = 0;
        this.dropSpeed = 350;
        this.pieceStats = {};
        this.totalPieces = 0;
        document.getElementById('gameOverOverlay').style.display = 'none';
        document.getElementById('pauseOverlay').style.display = 'none';
        this.initGame();
        this.updateHistogram();
    }
    
    togglePause() {
        if (this.gameOver) return;
        
        this.paused = !this.paused;
        document.getElementById('pauseOverlay').style.display = this.paused ? 'block' : 'none';
    }
    
    showGameOver() {
        document.getElementById('gameOverOverlay').style.display = 'block';
    }
    
    changeMode(newMode) {
        this.mode = parseInt(newMode);
        this.updateHighScoresDisplay(); // Update display for new mode+size combination
        this.newGame();
    }
    
    changeBoardSize(size) {
        switch(size) {
            case 'small':
                this.width = 10;
                this.height = 10;
                break;
            case 'medium':
                this.width = 10;
                this.height = 20;
                break;
            case 'big':
                this.width = 15;
                this.height = 25;
                break;
        }
        this.resizeCanvas();
        this.updateHighScoresDisplay(); // Update display for new mode+size combination
        this.newGame();
    }
    
    changeStyle(style) {
        const body = document.body;
        const bgElements = document.getElementById('bgElements');
        
        // Remove all style classes
        body.classList.remove('style-simple', 'style-sunny-day');
        
        // Add the new style class
        body.classList.add(`style-${style}`);
        
        // Show/hide background elements based on style
        if (style === 'sunny-day') {
            bgElements.style.display = 'block';
        } else {
            bgElements.style.display = 'none';
        }
        
        console.log(`🎨 Style changed to: ${style.toUpperCase()}`);
    }
    
    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (!this.playing || this.paused) {
                if (e.key === 'w' || e.key === 'W') {
                    this.togglePause();
                }
                if (e.key === 'r' || e.key === 'R') {
                    this.newGame();
                }
                return;
            }
            
            const now = Date.now();
            
            switch(e.key) {
                case 'a':
                case 'A':
                    if (!this.keysPressed.left) {
                        this.keysPressed.left = true;
                        this.movePiece(-1, 0); // Immediate move
                        this.lastMoveDirection = -1;
                        this.moveStartTime = now;
                        this.moveTime = now;
                    }
                    break;
                case 'd':
                case 'D':
                    if (!this.keysPressed.right) {
                        this.keysPressed.right = true;
                        this.movePiece(1, 0); // Immediate move
                        this.lastMoveDirection = 1;
                        this.moveStartTime = now;
                        this.moveTime = now;
                    }
                    break;
                case 's':
                case 'S':
                    this.dropSpeed = 35; // Fast drop (10x faster than normal ~350ms, much safer than old 10ms)
                    break;
                case 'w':
                case 'W':
                    this.togglePause();
                    break;
                case 'j':
                case 'J':
                    if (now - this.rotateTime > this.rotateSpeed) {
                        this.rotatePiece(-1); // Rotate counterclockwise (CCW)
                        this.rotateTime = now;
                    }
                    break;
                case 'k':
                case 'K':
                    if (now - this.rotateTime > this.rotateSpeed) {
                        this.rotatePiece(2); // Rotate 180 degrees
                        this.rotateTime = now;
                    }
                    break;
                case 'l':
                case 'L':
                    if (now - this.rotateTime > this.rotateSpeed) {
                        this.rotatePiece(1); // Rotate clockwise (CW)
                        this.rotateTime = now;
                    }
                    break;
                case 'r':
                case 'R':
                    this.newGame();
                    break;
                case 'Escape':
                    this.togglePause();
                    break;
            }
            
            e.preventDefault();
        });
        
        // Handle key release
        document.addEventListener('keyup', (e) => {
            switch(e.key) {
                case 'a':
                case 'A':
                    this.keysPressed.left = false;
                    if (this.lastMoveDirection === -1) {
                        this.lastMoveDirection = null;
                    }
                    break;
                case 'd':
                case 'D':
                    this.keysPressed.right = false;
                    if (this.lastMoveDirection === 1) {
                        this.lastMoveDirection = null;
                    }
                    break;
                case 's':
                case 'S':
                    // Reset drop speed when fast drop key is released
                    const baseSpeed = 350 - (25 * this.level);
                    this.dropSpeed = Math.max(baseSpeed, 30);
                    break;
            }
        });
        
        // UI controls
        document.getElementById('gameMode').addEventListener('change', (e) => {
            this.changeMode(e.target.value);
        });
        
        document.getElementById('boardSize').addEventListener('change', (e) => {
            this.changeBoardSize(e.target.value);
        });
        
        document.getElementById('gameStyle').addEventListener('change', (e) => {
            this.changeStyle(e.target.value);
        });
        
        document.getElementById('newGame').addEventListener('click', () => {
            this.newGame();
        });
        
        document.getElementById('resetHiScore').addEventListener('click', (e) => {
            e.preventDefault();
            this.resetHighScores();
        });
    }
    
    gameLoop() {
        const now = Date.now();
        const deltaTime = now - this.lastTime;
        this.lastTime = now;
        
        if (this.playing && !this.paused && !this.gameOver) {
            this.dropTime += deltaTime;
            
            if (this.dropTime >= this.dropSpeed) {
                this.dropPiece();
                this.dropTime = 0;
            }
            
            // Handle continuous movement
            this.handleContinuousMovement(now);
            
            this.updateUI();
        }
        
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    handleContinuousMovement(now) {
        if (this.lastMoveDirection !== null) {
            const timeSinceStart = now - this.moveStartTime;
            const timeSinceLastMove = now - this.moveTime;
            
            // After initial delay, start repeating moves
            if (timeSinceStart > this.initialMoveDelay && timeSinceLastMove > this.moveSpeed) {
                if ((this.lastMoveDirection === -1 && this.keysPressed.left) ||
                    (this.lastMoveDirection === 1 && this.keysPressed.right)) {
                    this.movePiece(this.lastMoveDirection, 0);
                    this.moveTime = now;
                }
            }
        }
    }
    
    // Easy configuration methods for slide system
    configureSlide(options = {}) {
        if (options.enabled !== undefined) {
            this.slideConfig.enabled = options.enabled;
        }
        if (options.maxSlideDistance !== undefined) {
            this.slideConfig.maxSlideDistance = options.maxSlideDistance;
        }
        if (options.customAttempts !== undefined) {
            this.slideConfig.slideAttempts = options.customAttempts;
        }
        
        console.log('Slide configuration updated:', this.slideConfig);
    }
    
    // Preset slide configurations
    setSlidePreset(preset) {
        switch(preset) {
            case 'disabled':
                this.configureSlide({ enabled: false });
                break;
            case 'minimal':
                this.configureSlide({
                    enabled: true,
                    maxSlideDistance: 1,
                    customAttempts: [
                        [0, 0],   // Original position
                        [-1, 0],  // Left
                        [1, 0]    // Right
                    ]
                });
                break;
            case 'standard':
                this.configureSlide({
                    enabled: true,
                    maxSlideDistance: 2,
                    customAttempts: [
                        [0, 0],   // Original position
                        [-1, 0],  // Left
                        [1, 0],   // Right
                        [-2, 0],  // Further left
                        [2, 0],   // Further right
                        [0, -1]   // Up
                    ]
                });
                break;
            case 'aggressive':
                this.configureSlide({
                    enabled: true,
                    maxSlideDistance: 3,
                    customAttempts: [
                        [0, 0],   // Original position
                        [-1, 0], [1, 0],     // Adjacent sides
                        [-2, 0], [2, 0],     // Further sides
                        [0, -1],             // Up
                        [-1, -1], [1, -1],   // Diagonal up
                        [-3, 0], [3, 0],     // Max sides
                        [0, -2],             // Further up
                        [-2, -1], [2, -1]    // Far diagonal
                    ]
                });
                break;
            default:
                console.log('Unknown preset. Available: disabled, minimal, standard, aggressive');
        }
    }
    
    // High Scores Management (keyed by mode+size)
    loadHighScores() {
        try {
            const saved = localStorage.getItem('blocksHighScores');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.warn('Failed to load high scores:', error);
        }
        
        // Return default empty high scores object
        return {};
    }
    
    getHighScoreKey() {
        return `${this.mode}_${this.getSizeKey()}`;
    }
    
    getCurrentHighScores() {
        const key = this.getHighScoreKey();
        let scores = this.highScores[key];
        
        // Ensure scores is always an array
        if (!Array.isArray(scores)) {
            scores = [
                { score: 0, lines: 0, name: '', isEmpty: true },
                { score: 0, lines: 0, name: '', isEmpty: true },
                { score: 0, lines: 0, name: '', isEmpty: true }
            ];
        }
        
        // Ensure we always have exactly 3 entries
        while (scores.length < 3) {
            scores.push({ score: 0, lines: 0, name: '', isEmpty: true });
        }
        
        return scores;
    }
    
    saveHighScores() {
        try {
            localStorage.setItem('blocksHighScores', JSON.stringify(this.highScores));
        } catch (error) {
            console.warn('Failed to save high scores:', error);
        }
    }
    
    checkAndUpdateHighScore() {
        let isNewHighScore = false;
        const key = this.getHighScoreKey();
        const currentScores = this.getCurrentHighScores();
        
        // Check if current score qualifies for top 3
        for (let i = 0; i < 3; i++) {
            const existing = currentScores[i];
            
            // If this slot is empty or current score is higher
            if (!existing || existing.isEmpty || this.score > existing.score || 
                (this.score === existing.score && this.lines > existing.lines)) {
                
                // Get player name
                const name = prompt('New High Score! Enter your name:', '') || 'Anonymous';
                const currentScore = { 
                    score: this.score, 
                    lines: this.lines, 
                    name: name.substring(0, 10), // Limit to 10 characters
                    isEmpty: false 
                };
                
                // Shift existing scores down
                for (let j = 2; j > i; j--) {
                    currentScores[j] = { ...currentScores[j-1] };
                }
                
                // Insert new high score
                currentScores[i] = currentScore;
                
                // Save back to main scores object
                this.highScores[key] = currentScores;
                
                isNewHighScore = true;
                break;
            }
        }
        
        if (isNewHighScore) {
            this.saveHighScores();
            this.updateHighScoresDisplay();
            
            // Get fresh scores to find the rank
            try {
                const updatedScores = this.getCurrentHighScores();
                if (Array.isArray(updatedScores)) {
                    const rank = updatedScores.findIndex(hs => 
                        hs && hs.score === this.score && hs.lines === this.lines) + 1;
                    this.showSpecialMessage(`NEW HIGH SCORE! #${rank}`);
                } else {
                    console.error('updatedScores is not an array:', updatedScores);
                    this.showSpecialMessage('NEW HIGH SCORE!');
                }
            } catch (error) {
                console.error('Error processing high score message:', error);
                this.showSpecialMessage('NEW HIGH SCORE!');
            }
        }
        
        return isNewHighScore;
    }
    
    updateHighScoresDisplay() {
        const hiscoresContainer = document.querySelector('.hiscores-list');
        if (!hiscoresContainer) return;
        
        const currentScores = this.getCurrentHighScores();
        
        let html = '';
        for (let i = 0; i < 3; i++) {
            const hs = currentScores[i];
            if (!hs || hs.isEmpty) {
                html += `<div class="hiscore-entry">
                    <span class="rank">${i + 1}.</span>
                    <span class="score">-----</span>
                    <span class="lines">-----</span>
                    <span class="name">-----</span>
                </div>`;
            } else {
                html += `<div class="hiscore-entry">
                    <span class="rank">${i + 1}.</span>
                    <span class="score">${(hs.score || 0).toLocaleString()}</span>
                    <span class="lines">${hs.lines || 0}</span>
                    <span class="name">${hs.name || 'NO NAME'}</span>
                </div>`;
            }
        }
        hiscoresContainer.innerHTML = html;
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    window.game = new BlocksGame(); // Make game accessible globally for easy tweaking
    
    // Quick access functions for console
    window.slidePreset = (preset) => window.game.setSlidePreset(preset);
    window.configSlide = (options) => window.game.configureSlide(options);
    
    console.log('🎮 HEXTRIS game loaded!');
    console.log('🖼️ Using sprite sheet for piece textures');
    console.log('💡 Try these in console:');
    console.log('   slidePreset("minimal")    - Basic sliding');
    console.log('   slidePreset("standard")   - Default sliding (current)');
    console.log('   slidePreset("aggressive") - Maximum sliding');
    console.log('   slidePreset("disabled")   - No sliding');
    console.log('   configSlide({enabled: false}) - Custom config');
});
