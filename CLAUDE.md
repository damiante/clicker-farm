# Clicker Farm - Developer Documentation

This document provides comprehensive technical information about the Clicker Farm game for AI agents and developers working on this codebase.

## Project Overview

Clicker Farm is a browser-based clicker/farming game hybrid built with vanilla JavaScript, HTML5 Canvas, and CSS. It features procedurally generated worlds with natural river formations, expandable terrain, and persistent browser storage.

**Key Technologies:**
- Vanilla JavaScript (ES6 modules)
- HTML5 Canvas API
- LocalStorage API
- PointerEvent API (unified mouse/touch input)
- No frameworks or build tools required

**Deployment:**
- Designed for GitHub Pages hosting
- Pure static files - no server-side components
- No build/compilation step required

## Architecture Overview

### Design Principles

This codebase follows four critical design principles defined in the requirements:

1. **Extensibility**: OOP architecture ready for future entities, NPCs, and game mechanics
2. **Centralized Configuration**: All tunable values in [js/config/GameConfig.js](js/config/GameConfig.js) and [js/config/UITheme.js](js/config/UITheme.js)
3. **Unified UI Theme**: Reusable components ([Modal.js](js/ui/Modal.js), [Button.js](js/ui/Button.js)) that consume centralized theme
4. **Cross-Platform Compatibility**: Mobile and desktop support via PointerEvent API

### Core Systems

#### 1. World Generation System

**Files:**
- [js/world/WorldGenerator.js](js/world/WorldGenerator.js) - Procedural generation algorithm
- [js/world/ChunkManager.js](js/world/ChunkManager.js) - Chunk tracking and expansion
- [js/world/Tile.js](js/world/Tile.js) - Individual tile representation
- [js/world/TileMap.js](js/world/TileMap.js) - Tile data structure

**Algorithm:**
- Seeded random generation using [js/utils/SeededRandom.js](js/utils/SeededRandom.js)
- Each chunk (10x10 tiles) uses seed: `baseSeed + chunkX * 31 + chunkY * 37`
- Rivers generated via random walk with:
  - Width: 1-2 tiles (GameConfig.WORLD.RIVER_MAX_WIDTH = 2)
  - Meander: 0.3 (GameConfig.WORLD.RIVER_MEANDER)
  - Segment length: 8 tiles (GameConfig.WORLD.RIVER_SEGMENT_LENGTH)
- Edge boundary tracking enables seamless chunk expansion
- Tiles compressed with run-length encoding for efficient storage
- Per-chunk expansion: Each chunk's exposed edges get individual expansion buttons

**Chunk Expansion System:**
- Each chunk with an exposed edge (no adjacent chunk) displays an expansion button
- Buttons positioned at chunk edges (north/south/east/west)
- Clicking expands that specific chunk by adding one adjacent 10x10 chunk
- Rivers continue seamlessly from parent chunk edge boundaries
- Implementation: `ChunkManager.expandChunk(chunkX, chunkY, direction)`

**How to Extend:**
- Add new tile types: Update `GameConfig.TILES` with `{ id, asset, code }`
- Modify river behavior: Adjust parameters in GameConfig.WORLD
- Add terrain features: Extend WorldGenerator.generateChunk() method
- Change chunk size: Modify INITIAL_CHUNK_SIZE and EXPANSION_CHUNK_SIZE

#### 2. Rendering System

**Files:**
- [js/rendering/Renderer.js](js/rendering/Renderer.js) - Canvas rendering with viewport culling
- [js/rendering/AssetLoader.js](js/rendering/AssetLoader.js) - Image loading and caching

**Features:**
- Viewport culling: Only renders visible tiles for performance
- Camera system: Zoom and pan controls with smooth movement
  - Initial zoom fits entire play area on screen
  - Zoom sensitivity: 0.95/1.05 (reduced for smooth control)
  - Pan via mouse drag or touch drag
- Anti-aliasing prevention:
  - Image smoothing disabled (`ctx.imageSmoothingEnabled = false`)
  - Screen positions floored for pixel alignment
  - Tiles rendered with 1px overlap to eliminate gaps
- Expansion button rendering: Per-chunk buttons at exposed edges
- Background color: #151216 (GameConfig.RENDERING.BACKGROUND_COLOR)

**How to Extend:**
- Add entity rendering: Implement in Renderer.renderWorld() after tiles
- Add particle effects: Create new method in Renderer class
- Change tile size: Modify GameConfig.WORLD.TILE_SIZE (default: 32px)

#### 3. State Management System

**Files:**
- [js/core/StateManager.js](js/core/StateManager.js) - LocalStorage persistence

**State Schema:**
```javascript
{
  version: '1.0',
  timestamp: 1705689600000,
  player: { money: 150 },
  world: {
    seed: 42,
    chunks: [
      { x: 0, y: 0, tiles: "g100w3g97...", edgeBoundaries: {...} }
    ]
  },
  entities: []
}
```

**Features:**
- Auto-save every 30 seconds (GameConfig.STORAGE.AUTO_SAVE_INTERVAL)
- Debounced saves on player actions (500ms delay)
- Run-length encoded tile data to minimize storage
- Version field for future migration support

**How to Extend:**
- Add new state fields: Update getGameState() in [js/core/Game.js](js/core/Game.js)
- Implement migrations: Check state.version in StateManager.load()
- Add export/import: Extend StateManager with new methods

#### 4. UI System

**Files:**
- [js/ui/Button.js](js/ui/Button.js) - Reusable button component
- [js/ui/Modal.js](js/ui/Modal.js) - Reusable modal component
- [js/ui/MoneyDisplay.js](js/ui/MoneyDisplay.js) - Money counter
- [js/ui/SettingsMenu.js](js/ui/SettingsMenu.js) - Settings modal
- [js/ui/UIManager.js](js/ui/UIManager.js) - UI orchestration

**Theme System:**
All UI components consume [js/config/UITheme.js](js/config/UITheme.js):
- Colors: Primary (#4A90E2), Danger (#E74C3C), Success (#2ECC71)
- Typography: Font sizes, family
- Spacing: Padding, gaps, border radius
- Shadows: Button and modal elevation

**Modal Pattern:**
Modals use a consistent dismiss pattern:
- Button handlers call `modal.hide()` directly
- Modal's `onClose` callback executes after animation completes
- Use action flags to determine post-close behavior
- Capture modal reference with `modalRef` for button closures

**How to Extend:**
- Add new UI component: Extend Modal or Button pattern, consume UITheme
- Add new menu: Create class similar to SettingsMenu, integrate via UIManager
- Theme customization: Edit UITheme.js values - changes propagate everywhere
- Multi-modal flows: Use action flags and onClose callbacks for chaining

#### 5. Input System

**Files:**
- [js/core/InputManager.js](js/core/InputManager.js) - Unified input handling

**Features:**
- PointerEvent API: Works with mouse, touch, and pen
- Touch action prevention: Disables pinch-zoom, pull-to-refresh
- Event normalization: All events include {x, y} position
- Camera controls:
  - **Mouse wheel zoom**: Zooms in/out centered on cursor position (delta: 0.95/1.05)
  - **Mouse drag pan**: Click and drag to move camera around world
  - **Touch drag pan**: Single-finger drag to move camera
  - **Pinch zoom**: Two-finger pinch to zoom in/out (mobile)

**How to Extend:**
- Add tile clicking: Convert screen coordinates with Renderer.screenToWorld()
- Add multi-touch gestures: Extend InputManager pointer event handlers

#### 6. Game Loop

**Files:**
- [js/core/Game.js](js/core/Game.js) - Main orchestrator

**Lifecycle:**
1. `init()`: Load assets, check saved state, initialize systems
2. `start()`: Begin game loop with requestAnimationFrame
3. `update(deltaTime)`: Update entities each frame
4. `render()`: Render world, entities, and UI

**How to Extend:**
- Add game systems: Initialize in Game.init()
- Add update logic: Extend Game.update()
- Add entities: Push to Game.entities array

### Entity System

**Files:**
- [js/entities/Entity.js](js/entities/Entity.js) - Base class for all game objects

**Current Implementation:**
```javascript
class Entity {
  constructor(x, y, type)
  update(deltaTime)      // Override in subclasses
  render(ctx, camera)    // Override in subclasses
  serialize()            // For save/load
  static deserialize()   // Factory pattern
}
```

**How to Extend:**
```javascript
// Example: Create an Animal entity
import { Entity } from './Entity.js';

export class Animal extends Entity {
  constructor(x, y, species) {
    super(x, y, 'animal');
    this.species = species;
    this.hunger = 0;
  }

  update(deltaTime) {
    this.hunger += deltaTime * 0.1;
    // Movement logic, AI, etc.
  }

  render(ctx, cameraX, cameraY) {
    // Draw animal sprite
  }

  serialize() {
    return {
      ...super.serialize(),
      species: this.species,
      hunger: this.hunger
    };
  }
}
```

## Configuration Guide

### Game Configuration

Edit [js/config/GameConfig.js](js/config/GameConfig.js):

```javascript
WORLD: {
  INITIAL_CHUNK_SIZE: 10,         // Tiles per chunk (10x10)
  EXPANSION_CHUNK_SIZE: 10,       // Size of expanded chunks
  TILE_SIZE: 32,                  // Pixels per tile
  RIVER_MAX_WIDTH: 2,             // Max river width in tiles
  RIVER_MEANDER: 0.3,             // River curvature
  RIVER_SEGMENT_LENGTH: 8,        // Tiles per river segment
}

ECONOMY: {
  STARTING_MONEY: 0,              // Initial player money
  CLICK_REWARD: 1,                // Money per click
}

STORAGE: {
  AUTO_SAVE_INTERVAL: 30000,      // Auto-save frequency (ms)
}

TILES: {
  GRASS: { id: 'grass', asset: './assets/grass.png', code: 'g' },
  WATER: { id: 'water', asset: './assets/water.png', code: 'w' },
  // Add new tiles here
}
```

### UI Theme Configuration

Edit [js/config/UITheme.js](js/config/UITheme.js):

```javascript
COLORS: {
  PRIMARY: '#4A90E2',             // Main action buttons
  DANGER: '#E74C3C',              // Destructive actions
  MODAL_OVERLAY: 'rgba(0,0,0,0.7)', // Modal backdrop
}

TYPOGRAPHY: {
  BUTTON_FONT_SIZE: '16px',
  MONEY_FONT_SIZE: '24px',
}

SPACING: {
  BORDER_RADIUS: '8px',           // All rounded corners
}
```

## Common Development Tasks

### Adding a New Tile Type

1. Create tile asset: Place 32x32 PNG in [assets/](assets/)
2. Update GameConfig.TILES:
```javascript
FARMLAND: { id: 'farmland', asset: './assets/farmland.png', code: 'f' }
```
3. Modify WorldGenerator to place new tile type
4. Update compression/decompression in WorldGenerator

### Adding a New Economy Feature

1. Add configuration to GameConfig.ECONOMY
2. Create new Button in UIManager.initialize()
3. Add click handler that calls Game method
4. Update StateManager schema if persistence needed
5. Schedule save after state change

### Adding a New Entity Type

1. Create class extending Entity in [js/entities/](js/entities/)
2. Implement update(), render(), serialize(), deserialize()
3. Add spawn logic in appropriate system
4. Register in Game.entities array
5. Update StateManager to persist entity

### Modifying Procedural Generation

1. Edit WorldGenerator.generateChunk() in [js/world/WorldGenerator.js](js/world/WorldGenerator.js)
2. Adjust parameters in GameConfig.WORLD
3. Test with multiple seeds
4. Clear LocalStorage to regenerate world

### Adjusting Camera Controls

1. **Change zoom sensitivity**: Edit InputManager.js zoom delta (currently 0.95/1.05)
   - Lower values = more sensitive (e.g., 0.9/1.1)
   - Higher values = less sensitive (e.g., 0.98/1.02)

2. **Change zoom limits**: Edit Renderer.js minZoom/maxZoom (currently 0.25/4.0)

3. **Change initial view**: Edit Game.js centerViewOnPlayArea()
   - Adjust zoom multiplier (currently 0.9 for 90% fit)
   - Modify centering calculation

4. **Add pan speed modifier**: Edit InputManager.js pan() method
   - Multiply deltaX/deltaY by speed factor

## File Structure Reference

```
/Users/testad/Documents/code/clicker-farm/
├── index.html                    # Entry point
├── styles/
│   └── main.css                  # Global styles
├── js/
│   ├── config/
│   │   ├── GameConfig.js         # Game values (MODIFY HERE)
│   │   └── UITheme.js            # UI styling (MODIFY HERE)
│   ├── core/
│   │   ├── Game.js               # Main orchestrator
│   │   ├── StateManager.js       # Save/load system
│   │   └── InputManager.js       # Input handling
│   ├── world/
│   │   ├── WorldGenerator.js     # Procedural generation
│   │   ├── ChunkManager.js       # Chunk system
│   │   ├── TileMap.js            # Tile storage
│   │   └── Tile.js               # Tile class
│   ├── rendering/
│   │   ├── Renderer.js           # Canvas rendering
│   │   └── AssetLoader.js        # Image loading
│   ├── ui/
│   │   ├── UIManager.js          # UI orchestrator
│   │   ├── Button.js             # Reusable button
│   │   ├── Modal.js              # Reusable modal
│   │   ├── MoneyDisplay.js       # Money counter
│   │   └── SettingsMenu.js       # Settings modal
│   ├── entities/
│   │   └── Entity.js             # Base entity class
│   ├── utils/
│   │   └── SeededRandom.js       # RNG utility
│   └── main.js                   # Initialization
├── assets/
│   ├── grass.png                 # 32x32 grass tile
│   └── water.png                 # 32x32 water tile
├── README.md
└── CLAUDE.md                     # This file
```

## Debugging Tips

### Common Issues

**World not rendering:**
- Check browser console for errors
- Verify assets loaded: `assetLoader.isLoaded()`
- Check camera position: `renderer.getCamera()`

**Save/load not working:**
- Check LocalStorage quota (5-10MB limit)
- Verify GameConfig.STORAGE.SAVE_KEY is unique
- Clear storage: `localStorage.clear()`

**Rivers look unnatural:**
- Adjust GameConfig.WORLD parameters
- Increase RIVER_MEANDER for more curves
- Adjust RIVER_SEGMENT_LENGTH for longer/shorter segments
- Modify RIVER_MAX_WIDTH for wider/narrower rivers

**Zoom/pan controls not working:**
- Check InputManager is properly initialized
- Verify pointer events are being captured
- Check zoom limits (minZoom: 0.25, maxZoom: 4.0)
- Inspect camera position: `renderer.getCamera()`

**Tiles showing grid lines:**
- Verify image smoothing is disabled in Renderer
- Check that screen positions are floored
- Ensure tiles are rendered with +1 overlap

**Performance issues:**
- Reduce auto-save frequency
- Verify viewport culling in Renderer.renderWorld()
- Check entity count in Game.entities

### Console Commands

```javascript
// Access game instance (if exposed globally for debugging)
game.player.money = 1000;          // Add money
game.expandWorld('north');         // Force expansion
game.stateManager.reset();         // Clear save
game.chunkManager.getAllChunks();  // Inspect chunks
```

## Testing Checklist

- [ ] Initial load generates 10x10 world with rivers
- [ ] Initial view shows entire play area (zoomed out to fit)
- [ ] Mouse wheel zoom in/out works smoothly
- [ ] Mouse drag panning works
- [ ] Pinch zoom works on mobile
- [ ] Touch drag panning works on mobile
- [ ] Money increments on button click
- [ ] Money persists after page refresh
- [ ] Settings menu opens and closes properly
- [ ] Reset confirmation modal works
- [ ] Reset confirmation modal dismisses after confirming
- [ ] Reset generates new world (different seed)
- [ ] Expansion buttons appear at exposed chunk edges
- [ ] Each chunk gets its own expansion button
- [ ] Clicking expansion button adds one 10x10 chunk
- [ ] Rivers continue seamlessly across chunk boundaries
- [ ] No visible grid/aliasing between tiles
- [ ] World state persists after page refresh
- [ ] Touch works on mobile device
- [ ] No console errors
- [ ] Works on GitHub Pages

## Future Enhancement Ideas

- **NPCs/Animals**: Use Entity base class
- **Building System**: Place buildings on grass tiles
- **Resource Types**: Extend economy beyond money
- **Crafting**: Combine resources
- **Day/Night Cycle**: Add time system
- **Weather**: Visual effects
- **Multiplayer**: WebSocket integration
- **More Biomes**: Desert, forest, mountains
- **Quests**: Task system
- **Achievements**: LocalStorage tracking

## Performance Considerations

- **Viewport Culling**: Only renders tiles visible in current camera view
- **Small Chunk Size**: 10x10 tiles per chunk for efficient memory usage
- **Chunk System**: Lazy loading - chunks generated on demand
- **Asset Caching**: Images loaded once, reused across all tiles
- **Run-Length Encoding**: Compresses tile data for minimal storage
- **Auto-Save Throttling**: 500ms debounce prevents excessive writes
- **RequestAnimationFrame**: Native 60fps rendering
- **Optimized Rendering**: Image smoothing disabled, pixel-aligned positions, minimal overdraw
- **Camera Controls**: Smooth zoom/pan without performance degradation

## Browser Compatibility

Requires modern browser features:
- ES6 modules (`type="module"`)
- LocalStorage API
- Canvas 2D context
- PointerEvent API
- Arrow functions, template literals, classes

Tested on:
- Chrome 120+
- Firefox 120+
- Safari 17+
- Edge 120+

## License & Credits

This is an educational project created as a demonstration of procedural generation, game architecture, and browser-based game development.

Asset tiles created specifically for this project.
