# Technical Documentation

## Drop Speed Progression System

### Starting Speed
- **Level 0**: **800ms** (pieces drop every 0.8 seconds)

### Speed Increase Rate by Level Range

**📈 Levels 0-10: Fast Acceleration**
- **Rate**: -50ms per level
- **Formula**: `Math.max(300, 800 - (level × 50))`
- **Speed Range**: 800ms → 300ms

**📊 Levels 11-20: Moderate Acceleration** 
- **Rate**: -20ms per level
- **Formula**: `Math.max(100, 300 - ((level - 10) × 20))`
- **Speed Range**: 300ms → 100ms

**⚡ Levels 21-29: Fine-Tuning**
- **Rate**: -5ms per level
- **Formula**: `Math.max(50, 100 - ((level - 20) × 5))`
- **Speed Range**: 100ms → 50ms

**🏁 Level 30+: Maximum Speed**
- **Rate**: No change
- **Speed**: **50ms** (capped at maximum playable speed)

### Complete Speed Table

| Level | Drop Speed | Time to Drop | Description |
|-------|------------|--------------|-------------|
| 0     | 800ms     | 0.80s       | Starting speed |
| 1     | 750ms     | 0.75s       | |
| 5     | 550ms     | 0.55s       | |
| 10    | 300ms     | 0.30s       | End of fast acceleration |
| 11    | 280ms     | 0.28s       | Start of moderate acceleration |
| 15    | 200ms     | 0.20s       | |
| 20    | 100ms     | 0.10s       | End of moderate acceleration |
| 21    | 95ms      | 0.095s      | Start of fine-tuning |
| 25    | 75ms      | 0.075s      | |
| 29    | 55ms      | 0.055s      | |
| 30+   | **50ms**  | **0.05s**   | **Maximum speed** |

### Min/Max Speeds
- **Maximum (slowest)**: **800ms** (Level 0)
- **Minimum (fastest)**: **50ms** (Level 30+)
- **Fast drop speed** (S key/controller down): **50ms** (same as max level)

---

## Linear Rotation System

### Coordinate System
Pieces are defined using a **relative coordinate system** where each block is positioned relative to the piece's center point `[x, y]`:
- **X-axis**: Horizontal (negative = left, positive = right)
- **Y-axis**: Vertical (negative = up, positive = down)

### Rotation Mathematics

The game uses **linear transformation matrices** for piece rotation:

#### **90° Clockwise Rotation** (`direction = 1`)
```javascript
[x', y'] = [-y, x]
```
- **Matrix**: `[[0, -1], [1, 0]]`
- **Transform**: `(x,y) → (-y, x)`

#### **90° Counter-Clockwise Rotation** (`direction = -1`)
```javascript
[x', y'] = [y, -x]
```
- **Matrix**: `[[0, 1], [-1, 0]]`
- **Transform**: `(x,y) → (y, -x)`

#### **180° Rotation** (`direction = 2`)
```javascript
[x', y'] = [-x, -y]
```
- **Matrix**: `[[-1, 0], [0, -1]]`
- **Transform**: `(x,y) → (-x, -y)`

### Rotation Implementation

```javascript
const rotatedBlocks = this.currentPiece.blocks.map(block => {
    if (direction === 1) { // Clockwise
        return [-block[1], block[0]];
    } else if (direction === -1) { // Counter-clockwise
        return [block[1], -block[0]];
    } else if (direction === 2) { // 180 degrees
        return [-block[0], -block[1]];
    }
});
```

### Example: T-Piece Rotation

**Original T-Piece**: `[[0,1], [-1,0], [0,0], [1,0]]`
```
  █
█ █ █
```

**After 90° Clockwise**:
```javascript
[0,1]  → [-1, 0]
[-1,0] → [0, -1] 
[0,0]  → [0, 0]
[1,0]  → [0, 1]
```
Result: `[[-1,0], [0,-1], [0,0], [0,1]]`
```
█
█
█ █
```

---

## Wall Kick / Slide System

When a rotation would cause a collision, the game attempts to "slide" the piece to a valid position using a **priority-ordered list of offset attempts**.

### Slide Configuration
```javascript
slideConfig: {
    enabled: true,
    maxSlideDistance: 3, // Maximum blocks to slide
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
}
```

### Algorithm
1. **Attempt rotation** at current position
2. **If collision detected**, iterate through `slideAttempts` in order
3. **For each offset `[dx, dy]`**:
   - Check if `Math.abs(dx)` or `Math.abs(dy)` exceeds `maxSlideDistance`
   - Test position `[currentX + dx, currentY + dy]`
   - If valid, apply rotation and move piece to new position
4. **If no valid position found**, rotation fails (piece stays in original state)

---

## Input Systems

### Keyboard Controls
- **A/D**: Left/Right movement with repeat system
  - **Initial delay**: 110ms before repeat starts
  - **Repeat rate**: 60ms between moves
- **S**: Soft drop (temporarily sets drop speed to 50ms)
- **J/L**: Rotate counter-clockwise/clockwise
- **K**: Rotate 180°

### Gamepad Controls
- **D-pad Left/Right**: Advanced movement with acceleration protection
  - **Initial delay**: 200ms before continuous movement
  - **Move cooldown**: 80ms minimum between any moves
  - **Continuous rate**: 40ms between moves during hold
- **D-pad Down**: Soft drop (same as S key)
- **A/B/Y/X**: Various rotation controls
- **Start**: Pause during game, restart when game over

### Gamepad Movement Algorithm
```javascript
// On button press
if (isPressed && !state.pressed) {
    // Check cooldown to prevent accidental rapid moves
    if (timeSinceLastMove < gamepadMoveCooldown) return;
    
    // Immediate first move
    movePiece(direction);
    state.pressed = true;
    state.startTime = now;
}

// Continuous movement after delay
if (isPressed && holdDuration > gamepadInitialDelay) {
    if (timeSinceLastMove > gamepadMoveDelay) {
        movePiece(direction);
    }
}
```

---

## Game Modes

### TRITRIS (Mode 0)
- **Piece count**: 8 different triominoes (3 blocks each)
- **Complexity**: Simple shapes for beginners

### TETRIS (Mode 1) 
- **Piece count**: 7 standard tetrominoes (4 blocks each)
- **Complexity**: Classic Tetris gameplay

### HEXTRIS (Mode 2)
- **Piece count**: 28 complex pieces (up to 6 blocks each)
- **Complexity**: Advanced shapes including hexominoes, lines, dots, and complex formations

---

## Performance Considerations

### Frame Rate
- **Target**: 60 FPS
- **Game loop**: Uses `requestAnimationFrame` for smooth rendering
- **Delta time**: Tracks time between frames for consistent timing

### Collision Detection
- **Algorithm**: Simple bounds checking + board state lookup
- **Optimization**: Early exits on obvious failures
- **Complexity**: O(n) where n = number of blocks in piece

### Rendering
- **Canvas-based**: 2D context with block-by-block rendering
- **Sprite system**: Texture atlas support with fallback to solid colors
- **Optimization**: Only redraws when game state changes
