# Clicker Farm - Developer Guide

This document provides architectural guidance for developers and AI agents working on the Clicker Farm codebase.

## Project Overview

**Tech Stack**: Vanilla JavaScript (ES6 modules), HTML5 Canvas, CSS, LocalStorage
**Deployment**: GitHub Pages (pure static files, no build tools)
**Architecture**: Object-oriented with modular systems

## Design Principles

1. **Extensibility**: OOP architecture ready for new entities, NPCs, and mechanics
2. **Centralized Configuration**: All tunable values in config files (GameConfig.js, UITheme.js, InventoryConfig.js)
3. **Unified UI Theme**: Reusable components (Modal, Button) consuming centralized theme
4. **Cross-Platform**: PointerEvent API for unified mouse/touch input
5. **Data-Driven**: Items and menus defined in JSON files

## Core Systems

### World Generation
**Location**: `js/world/`

- **WorldGenerator.js**: Procedural generation with seeded random rivers
- **ChunkManager.js**: Chunk tracking, expansion, and per-chunk expansion buttons
- **Tile.js**: Individual tile representation with entity tracking
- Each chunk is 10x10 tiles, generated with seed: `baseSeed + chunkX * 31 + chunkY * 37`
- Rivers use random walk with meander, fork, and convergence probabilities
- Edge boundaries tracked for seamless chunk expansion

### Rendering
**Location**: `js/rendering/`

- **Renderer.js**: Canvas rendering with viewport culling, zoom/pan, grid lines
- **AssetLoader.js**: Image caching
- Viewport culling only renders visible tiles/entities
- Camera system with zoom (0.25-4.0x) and pan
- Anti-aliasing prevention: `imageSmoothingEnabled = false`, floored positions
- Tiles rendered with 1px overlap to prevent background gaps
- Grid lines drawn as solid lines (not stroked rectangles) for better visibility

### State Management
**Location**: `js/core/StateManager.js`

- LocalStorage persistence with auto-save every 30 seconds
- Debounced saves (500ms) on player actions
- State includes: player data, world chunks, entities, settings
- Run-length encoding for tile compression
- Version field for future migrations

### Inventory System
**Location**: `js/inventory/`

- **InventoryManager.js**: Business logic for add/remove/expand
- **InventoryPanel.js**: Right-side sliding panel UI
- **ItemPreviewPanel.js**: Floating preview with sell functionality
- Expandable slots (3-20) and stack sizes (5-1000)
- Exponential pricing: `price = base * (growth ^ count)`
- Selection persistence: items stay selected after placement

### Shop & Menus
**Location**: `js/menus/`

- **MenuManager.js**: Menu unlock logic based on `player.peakMoney`
- **ShopMenu.js**: Left-side collapsible shop UI
- Menus unlock when `peakMoney >= minItemPrice` (note: `>=` not `>`)
- Menu expand/collapse state independent of money
- Auto-expand only on initial load

### Item System
**Location**: `js/items/`, `data/items.json`

- **ItemRegistry.js**: Loads and caches item data from JSON
- **items.json**: Item definitions with emoji, prices, growth times, scaling
- Item types: seed, plant, growth_stage
- `overworldScale` property controls rendering size (default: 1.0)

### Plant Growth
**Location**: `js/entities/Plant.js`

- Timestamp-based growth using `Date.now()`
- Growth stages: seed → seedling → mature
- Transition times: `plantedAt + sproutTime`, `plantedAt + sproutTime + maturityTime`
- Renders using item emoji scaled by `overworldScale`
- Survives page refresh, immune to frame rate variations

### World Interaction
**Location**: `js/systems/WorldInteractionManager.js`

- Click detection: pointerdown → pointerup with minimal drag distance
- Placement: validates tile type (grass only), checks for existing entities
- Harvesting: click mature plants to add to inventory
- Placement preview: translucent emoji (40% opacity) on hover
- Mouse position tracking for preview rendering

### UI Components
**Location**: `js/ui/`

- **Modal.js**: Base modal with overlay and animation
- **Button.js**: Themed button component
- **UIManager.js**: Orchestrates UI creation and updates
- **SettingsMenu.js**: Grid toggle and reset functionality
- **PlantInfoPanel.js**: Floating panel for plant status
- All components consume UITheme.js for consistent styling

### Input Handling
**Location**: `js/core/InputManager.js`

- PointerEvent API for mouse/touch/pen
- Event normalization with {x, y} position
- Touch action prevention (pinch-zoom, pull-to-refresh disabled)
- Mouse wheel zoom, drag pan, pinch zoom, touch pan

### Game Loop
**Location**: `js/core/Game.js`

Main orchestrator:
- `init()`: Load assets, check saved state, initialize systems
- `start()`: Begin requestAnimationFrame loop
- `update(deltaTime)`: Update entities
- `render()`: Render world → entities → grid → placement preview → UI
- Central methods: `addMoney()`, `expandWorld()`, `createPlantEntity()`

## Configuration Files

### GameConfig.js
**All game constants** - tile size, chunk size, river generation, entity rendering, expansion pricing, economy values, storage settings

Key sections:
- `WORLD`: Chunk sizes, river parameters, expansion costs
- `ECONOMY`: Starting money, click reward
- `ENTITIES`: Font size, default scale, preview opacity
- `STORAGE`: Save key, auto-save interval
- `TILES`: Tile definitions with assets and codes

### UITheme.js
**All UI styling** - colors, typography, spacing, shadows

### InventoryConfig.js
**Inventory pricing formulas** - slot/stack costs, growth rates, limits

### items.json
**Item definitions** - id, name, emoji, prices, growth times, scaling

### menus.json
**Shop menu structure** - menu id, name, emoji, item lists

## State Schema

```javascript
{
  version: '1.0',
  timestamp: Date.now(),
  player: {
    money: 0,
    peakMoney: 0,
    inventory: [{itemId, count, slotIndex}],
    maxInventorySlots: 3,
    maxStackSize: 5,
    inventorySlotsPrice: 10,
    stackSizePrice: 20,
    unlockedMenus: [],
    expansionCount: 0
  },
  settings: {
    showGrid: false
  },
  world: {
    seed: 42,
    chunks: [{x, y, tiles: "compressed", edgeBoundaries}]
  },
  entities: [{type, x, y, itemId, growthStage, plantedAt, targetItemId}]
}
```

## Common Development Tasks

### Add a New Item
1. Add definition to `data/items.json` with all required fields
2. Add to menu in `data/menus.json` if purchasable
3. If new item type, update ItemRegistry/InventoryManager logic

### Add a New Entity Type
1. Create class extending Entity in `js/entities/`
2. Implement `update()`, `render()`, `serialize()`, `deserialize()`
3. Add spawn logic in appropriate system
4. Register in `Game.entities` array
5. Update StateManager to persist entity type

### Modify World Generation
1. Edit `WorldGenerator.generateChunk()` in `js/world/WorldGenerator.js`
2. Adjust parameters in `GameConfig.WORLD`
3. Add new tile types in `GameConfig.TILES`
4. Update tile compression/decompression if needed

### Add New UI Element
1. Create component consuming `UITheme.js`
2. Extend Modal or Button pattern if applicable
3. Integrate via `UIManager.initialize()`
4. Theme changes in UITheme.js propagate automatically

### Adjust Camera/Rendering
- Zoom sensitivity: `InputManager.js` zoom delta (0.95/1.05)
- Zoom limits: `Renderer.js` minZoom/maxZoom (0.25/4.0)
- Initial view: `Game.js` centerViewOnPlayArea()
- Grid visibility: `Settings.showGrid`, rendered in `Renderer.renderGrid()`

### Add New Economy Feature
1. Add config to `GameConfig.ECONOMY` or `InventoryConfig.js`
2. Create Button in `UIManager.initialize()`
3. Add click handler calling Game method
4. Update StateManager schema if persistence needed
5. Schedule save after state change: `stateManager.scheduleSave(getGameState())`

## File Structure Quick Reference

```
js/
├── config/
│   ├── GameConfig.js         # 🎯 All game values
│   ├── UITheme.js            # 🎨 All UI styling
│   └── InventoryConfig.js    # 💰 Inventory pricing
├── core/
│   ├── Game.js               # 🏗️  Main orchestrator
│   ├── StateManager.js       # 💾 Save/load
│   └── InputManager.js       # 🖱️  Input handling
├── world/
│   ├── WorldGenerator.js     # 🌍 Procedural generation
│   ├── ChunkManager.js       # 🗺️  Chunk system
│   ├── TileMap.js            # 🗃️  Tile storage
│   └── Tile.js               # 🟩 Tile class
├── rendering/
│   ├── Renderer.js           # 🎬 Canvas rendering
│   └── AssetLoader.js        # 🖼️  Image loading
├── ui/
│   ├── UIManager.js          # 🎛️  UI orchestrator
│   ├── Modal.js              # 📦 Reusable modal
│   ├── Button.js             # 🔘 Reusable button
│   ├── MoneyDisplay.js       # 💵 Money counter
│   └── SettingsMenu.js       # ⚙️  Settings modal
├── entities/
│   ├── Entity.js             # 🧬 Base entity class
│   └── Plant.js              # 🌱 Plant entity
├── inventory/
│   ├── InventoryManager.js   # 📦 Inventory logic
│   ├── InventoryPanel.js     # 🎒 Inventory UI
│   └── ItemPreviewPanel.js   # 🔍 Item preview
├── items/
│   └── ItemRegistry.js       # 📚 Item data access
├── menus/
│   ├── MenuManager.js        # 🔓 Menu unlocking
│   └── ShopMenu.js           # 🏪 Shop UI
├── systems/
│   ├── WorldInteractionManager.js  # 🖱️  Click handling
│   └── PlantInfoPanel.js           # ℹ️  Plant info UI
└── main.js                   # 🚀 Initialization

data/
├── items.json                # 📜 Item definitions
└── menus.json                # 📋 Menu structure
```

## Key Implementation Details

### Modal Dismiss Pattern
- Button handlers call `modal.hide()` directly
- Modal's `onClose` callback executes after animation
- Use action flags to determine post-close behavior
- Capture modal reference for button closures

### Entity Rendering
- Context is already scaled by zoom in `render()`
- Don't multiply by zoom again in entity rendering
- Floor positions for pixel alignment: `Math.floor(x * tileSize - camera.x)`
- Viewport culling checks entity position before rendering

### Plant Growth Flow
1. Seed placed → Plant entity created with `plantedAt` timestamp
2. `Plant.update()` checks `Date.now() - plantedAt`
3. Transitions: sprout at `sproutTime`, mature at `sproutTime + maturityTime`
4. Emoji changes automatically as `itemId` changes

### Menu Unlock Flow
1. Player earns money → `addMoney()` updates `peakMoney`
2. `MenuManager.checkUnlocks()` compares `peakMoney >= minItemPrice`
3. Unlocked menus added to `player.unlockedMenus`
4. `ShopMenu.refresh()` displays newly unlocked menus

### Drag-Drop Flow
1. User clicks inventory slot → `InventoryPanel` emits selection
2. Mouse move → `WorldInteractionManager` tracks position
3. Renders placement preview if valid tile
4. Click tile → validates, creates Plant, removes from inventory
5. Selection persists if items remain, clears if slot empty

## Debugging Tips

### Common Issues
- **Grid not aligned**: Ensure grid positions are floored like tile positions
- **Jittering on pan**: Check all screen positions use `Math.floor()`
- **World not rendering**: Verify assets loaded, check camera position
- **Save not working**: Check LocalStorage quota (5-10MB), verify save key
- **Rivers look wrong**: Adjust `GameConfig.WORLD` parameters

### Console Commands
```javascript
game.player.money = 1000;          // Add money
game.expandWorld(buttonData);      // Force expansion
game.stateManager.reset();         // Clear save
game.chunkManager.getAllChunks();  // Inspect chunks
```

## Performance Notes

- Viewport culling minimizes draw calls
- Chunk system enables lazy loading
- Asset caching prevents redundant loads
- Run-length encoding compresses tile data
- Auto-save throttling (500ms debounce)
- RequestAnimationFrame for native 60fps

## Future Enhancement Ideas

- NPCs/Animals using Entity base class
- Building system on grass tiles
- Crafting system combining resources
- Day/night cycle with time system
- Weather visual effects
- More biomes (desert, forest, mountains)
- Quest/achievement system

## Browser Compatibility

Requires:
- ES6 modules
- LocalStorage API
- Canvas 2D context
- PointerEvent API

Tested: Chrome/Edge/Firefox/Safari (latest versions)
