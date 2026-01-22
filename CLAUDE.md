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
- **AssetLoader.js**: Image caching with preload list for fence images
- Viewport culling only renders visible tiles/entities
- Camera system with zoom (0.25-4.0x) and pan
- Anti-aliasing prevention: `imageSmoothingEnabled = false`, floored positions
- Tiles rendered with 1px overlap to prevent background gaps
- Grid lines drawn as solid lines (not stroked rectangles) for better visibility
- Supports both emoji rendering and image assets (fences use PNG files)

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
- **ItemPreviewPanel.js**: Floating preview with sell/sell-all functionality
- Expandable slots (3-20) and stack sizes (5-1000)
- Exponential pricing: `price = base * (growth ^ count)`
- Selection persistence: items stay selected after placement
- Image rendering support for non-emoji items (structure icons)

### Shop & Menus
**Location**: `js/menus/`

- **MenuManager.js**: Menu unlock logic based on `player.peakMoney`
- **ShopMenu.js**: Left-side collapsible shop UI with scrolling support
- Menus unlock when `peakMoney >= minItemPrice` (note: `>=` not `>`)
- Menu expand/collapse state independent of money
- Item requirements displayed with hover tooltips
- Tool ownership shown with checkmark and strikethrough
- Affordability checking includes money + item requirements
- Image rendering support for structure items

### Item System
**Location**: `js/items/`, `data/items.json`

- **ItemRegistry.js**: Loads and caches item data from JSON
- **items.json**: Item definitions with emoji/image, prices, growth times, scaling, requirements, tool prerequisites
- Item types: seed, plant, growth_stage, tool, structure, resource
- `overworldScale` property controls rendering size (default: 1.0)
- `seedlingScale` property controls seedling-stage rendering size (allows different sizes per plant type)
- Image-based items (e.g. fences, barrels) use `image` property instead of `emoji`
- Items can have `requirements` (e.g. fence requires wood, barrel requires wood)
- Items can have `toolPrerequisite` (e.g. saw requires axe to be owned before appearing in shop)
- Tools are one-time purchases stored in `player.ownedTools`
- **Tool types**: Requirement tools (axe - enables harvest button only) vs Paint tools (scissors, saw, gloves - appear in ToolsPanel for drag-harvesting)

### Plant Growth
**Location**: `js/entities/Plant.js`

- Timestamp-based growth using `Date.now()`
- Growth stages: seed → seedling → mature
- Transition times: `plantedAt + sproutTime`, `plantedAt + sproutTime + maturityTime`
- Renders using item emoji scaled by `overworldScale` (or `seedlingScale` during seedling stage)
- Seedling scale from original seed item allows per-plant-type sizes (e.g., tree seedlings larger than flowers)
- Plant types: `plantType` property (flower, tree, grain, fruiting)
- Trees require tools to harvest (axe), other types don't
- Trees yield wood resource, flowers/grains yield themselves
- **Fruiting plants**: Special plant type that generates fruit over time when mature
  - Configurable in `GameConfig.FRUITING.PLANTS` with `fruitItemId`, `baseTime`, `timeVariance`, `maxFruits`, `positions`
  - Fruits appear as overlay icons at configured positions on the plant tile
  - Must take fruit before harvesting the plant
  - After taking fruit, generation timer restarts automatically
- Survives page refresh, immune to frame rate variations

### Structure Entities (Fences)
**Location**: `js/entities/Fence.js`

- Dynamic tiling: orientation updates based on neighboring fences
- Horizontal/vertical variants using different image assets
- `updateOrientation()`: checks north/south neighbors to determine orientation
- All fences update when any fence is added or removed (`updateFenceOrientations()`)
- Click to pickup: returns to inventory, triggers neighbor updates
- Image-based rendering (fence-horizontal.png, fence-vertical.png)

### Structure Entities (Barrels)
**Location**: `js/entities/Barrel.js`

- **Fermentation system**: Two-slot structure for fermenting items (input → output)
- Input slot (left): accepts fermentable items, consumption begins immediately
- Output slot (right): read-only, collects fermented products
- Progress tracked with timestamp-based fermentation timer
- Recipes defined in `GameConfig.FERMENTATION.RECIPES` with `{output, time}` structure
- Each recipe has individual fermentation time (e.g., rice→sake: 60s, wheat→beer: 120s, grapes→wine: 300s)
- Stack processing: items ferment sequentially, timer restarts for each item
- Output stacks up to `maxStackSize` before blocking further fermentation
- Cannot pickup while fermenting or containing items
- **Overlay icons**: Shows input/output slot contents at bottom-left/right of barrel tile
- Image-based rendering (barrel.png)
- **BarrelInfoPanel.js**: Special UI with two slots, progress arrow, dropdown for item selection

### Overlay Icon System
**Location**: `js/rendering/Renderer.js`

- Extensible system for displaying multiple icons on a single entity tile
- Entities implement `getOverlayIcons()` returning array of `{itemId, offsetX, offsetY, scale}` configs
- Used by: Barrels (input/output slots), Fruiting plants (fruits)
- Offset values are tile-relative (0 = left/top, 1 = right/bottom)
- Scale is relative to tile size (e.g., 0.33 = 33% of tile)
- Renderer calls `renderOverlayIcon()` for each overlay after main entity render

### World Interaction
**Location**: `js/systems/WorldInteractionManager.js`

- Click detection: pointerdown → pointerup with minimal drag distance
- Placement: validates tile type (grass only), checks for existing entities
- Harvesting: click mature plants to add to inventory, validates tool ownership
- **Tool-based harvesting**: `tryHarvestWithTool()` enables paint-harvesting with selected tools
  - Scissors: harvest flowers/grains by drag-painting
  - Saw: harvest trees by drag-painting (requires axe owned)
  - Gloves: gather fruits/barrel outputs by drag-painting
- Drag painting: hold and drag to paint multiple tiles with selected item or tool
- Set-based duplicate prevention: `paintedTiles` tracks painted tiles per drag
- Selection persistence: continues across multiple stacks of same item
- Placement preview: translucent emoji/image (40% opacity) on hover
- Mouse position tracking for preview rendering
- Coordinate flooring critical for entity click detection

### UI Components
**Location**: `js/ui/`, `js/systems/`

- **Modal.js**: Base modal with overlay and animation
- **Button.js**: Themed button component with `setText()` and `setEnabled()` methods
- **UIManager.js**: Orchestrates UI creation and updates
- **SettingsMenu.js**: Grid toggle and reset functionality
- **ToolsPanel.js**: Bottom-center always-visible panel for paint tools
  - Filters to show only paint tools (scissors, saw, gloves) not requirement tools (axe)
  - Toggle selection for drag-painting, mutually exclusive with inventory selection
  - Refreshes when tools purchased/unlocked
- **PlantInfoPanel.js**: Floating panel for plant status
  - Dynamic harvest emoji (🪓 for trees, ✂️ for flowers/grains)
  - Harvest button checks axe ownership for trees
  - Fruit slot display for fruiting plants with "Take" button (🫴 emoji)
  - Harvest button disabled when fruit present ("Take fruit first" message)
  - Panel refresh pattern: separate `buildPanel()` (once) and `refresh()` (frequent) to preserve event listeners
- **FenceInfoPanel.js**: Floating panel for structure interaction (pickup)
- **BarrelInfoPanel.js**: Floating panel for barrel interaction
  - Two-slot layout (input/output) with progress arrow between them
  - Click input slot to show dropdown or place selected item
  - Click output slot to take fermented products (triggers gloves unlock on first collection)
  - Dropdown auto-refreshes when inventory changes
  - Progress bar fills left-to-right showing fermentation progress
- All components consume UITheme.js for consistent styling
- CSS class selectors (not ID) allow style reuse across similar panels

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
- Central methods: `addMoney()`, `expandWorld()`, `createPlantEntity()`, `createFenceEntity()`, `checkToolUnlocks()`
- `updateFenceOrientations()`: Updates all fence tiling after fence add/remove
- `checkToolUnlocks()`: Checks unlock conditions (e.g., hasCollectedOutput) and adds tools to ownedTools
- Panning disabled when item selected for placement

## Configuration Files

### GameConfig.js
**All game constants** - tile size, chunk size, river generation, entity rendering, expansion pricing, economy values, fermentation recipes, fruiting plant configs, storage settings

Key sections:
- `WORLD`: Chunk sizes, river parameters, expansion costs
- `ECONOMY`: Starting money, click reward
- `ENTITIES`: Font size, default scale, preview opacity
- `FERMENTATION`: Recipe definitions mapping input items to `{output, time}` configs
- `FRUITING`: Fruiting plant configs with `{fruitItemId, baseTime, timeVariance, maxFruits, positions}`
- `STORAGE`: Save key, auto-save interval
- `TILES`: Tile definitions with assets and codes

### UITheme.js
**All UI styling** - colors, typography, spacing, shadows

### InventoryConfig.js
**Inventory pricing formulas** - slot/stack costs, growth rates, limits

### items.json
**Item definitions** - id, name, emoji/image, prices, growth times, scaling, requirements, toolPrerequisite

### menus.json
**Shop menu structure** - menu id, name, emoji, item lists (note: gloves NOT in Tools menu, unlocked conditionally)

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
    unlockedItems: [],
    ownedTools: [],  // One-time tool purchases (axe, scissors, saw) + conditionally unlocked (gloves)
    hasCollectedOutput: false,  // Triggers gloves unlock on first fruit/barrel output collection
    expansionCount: 0
  },
  settings: {
    showGrid: false
  },
  world: {
    seed: 42,
    chunks: [{x, y, tiles: "compressed", edgeBoundaries}]
  },
  entities: [
    {type: 'plant', x, y, seedItemId, itemId, growthStage, plantedAt, targetItemId, fruitSlot, nextFruitTime},
    {type: 'fence', x, y, itemId, orientation},
    {type: 'barrel', x, y, itemId, inputSlot, outputSlot, fermentationStartTime, fermentationTime, maxStackSize}
  ]
}
```

## Common Development Tasks

### Add a New Item
1. Add definition to `data/items.json` with all required fields
2. Add to menu in `data/menus.json` if purchasable
3. For seeds, include `seedlingScale` to control seedling size
4. For fruiting plants, set `plantType: "fruiting"` and configure in `GameConfig.FRUITING.PLANTS`
5. If new item type, update ItemRegistry/InventoryManager logic

### Add a Fermentation Recipe
1. Add input and output items to `data/items.json`
2. Add recipe to `GameConfig.FERMENTATION.RECIPES`: `'inputId': {output: 'outputId', time: seconds}`
3. Test in barrel to verify timing and output

### Add a Fruiting Plant
1. Add seed, plant, and fruit items to `data/items.json`
   - Seed: normal seed item with `growsInto` pointing to plant
   - Plant: `plantType: "fruiting"`, use appropriate emoji (e.g., 🌿 for vines)
   - Fruit: resource item that will be produced (e.g., 🍇 grapes)
2. Add config to `GameConfig.FRUITING.PLANTS`:
   ```javascript
   'plant_id': {
     fruitItemId: 'fruit_id',
     baseTime: 120,           // Average seconds between fruits
     timeVariance: 30,        // ± random variance
     maxFruits: 2,            // Max fruits on plant at once
     positions: [             // Icon positions for each fruit
       {offsetX: 0.15, offsetY: 0.2, scale: 0.4},
       {offsetX: 0.55, offsetY: 0.3, scale: 0.4}
     ]
   }
   ```
3. Optionally add fermentation recipe if fruit can be fermented
4. Test: plant seed, wait for maturity, verify fruit generation and overlay display

### Add a Tool
1. Add definition to `data/items.json` with `itemType: "tool"`
2. Decide tool category:
   - **Paint tool** (drag-harvesting): Add to `ToolsPanel.js` paintTools filter array
   - **Requirement tool** (enables buttons): Tool NOT added to paintTools filter
3. For shop-purchasable tools: Add to `data/menus.json` Tools menu
4. For conditionally unlocked tools:
   - Add unlock condition check (e.g., `hasCollectedOutput`)
   - Add unlock logic to `Game.checkToolUnlocks()`
   - Add trigger in appropriate WorldInteractionManager method
5. For tool prerequisites: Add `toolPrerequisite: "prerequisite_tool_id"` field
6. Update `Plant.canHarvestWithTool()` or `WorldInteractionManager.tryHarvestWithTool()` if needed

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
│   ├── ToolsPanel.js         # 🔧 Paint tools panel (bottom-center)
│   └── SettingsMenu.js       # ⚙️  Settings modal
├── entities/
│   ├── Entity.js             # 🧬 Base entity class
│   ├── Plant.js              # 🌱 Plant entity (growth, fruiting)
│   ├── Fence.js              # 🚧 Fence entity (tiling)
│   └── Barrel.js             # 🛢️  Barrel entity (fermentation)
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
│   ├── WorldInteractionManager.js  # 🖱️  Click/drag handling
│   ├── PlantInfoPanel.js           # ℹ️  Plant info UI (with fruit slots)
│   ├── FenceInfoPanel.js           # 🚧 Fence info UI
│   └── BarrelInfoPanel.js          # 🛢️  Barrel info UI (fermentation)
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
1. Seed placed → Plant entity created with `plantedAt` timestamp, stores `seedItemId` for seedling scale lookup
2. `Plant.update()` checks `Date.now() - plantedAt`
3. Transitions: sprout at `sproutTime` (uses `seedlingScale`), mature at `sproutTime + maturityTime`
4. Emoji changes automatically as `itemId` changes
5. Mature fruiting plants schedule first fruit generation using `scheduleNextFruit()`

### Fruiting Plant Flow
1. Plant matures → checks `GameConfig.FRUITING.PLANTS[targetItemId]` for fruiting config
2. If fruiting plant, schedules `nextFruitTime` with `baseTime ± timeVariance` randomization
3. `Plant.update()` checks if `Date.now() >= nextFruitTime`
4. `generateFruit()`: adds to `fruitSlot`, schedules next fruit if under `maxFruits`
5. `getOverlayIcons()`: returns fruit icon positions based on `fruitSlot.count`
6. User clicks plant → PlantInfoPanel shows fruit slot with count badge
7. User takes fruit → `takeFruit()` returns all fruits, reschedules generation
8. Harvest blocked if `hasFruit()` returns true

### Fermentation Flow
1. User clicks barrel → BarrelInfoPanel shows with input/output slots
2. Click input slot → dropdown shows fermentable items OR selected item placed directly
3. `barrel.placeInInput()`: stores items, calls `startFermentation()` to set timer
4. `Barrel.update()`: checks progress via `getFermentationProgress()` (elapsed / time)
5. When progress >= 1.0, `completeFermentation()`: moves one item from input to output
6. If items remain in input, timer restarts for next item
7. Output stacks up to `maxStackSize`, then fermentation pauses
8. Click output slot → `takeFromOutput()` returns all output items
9. Progress arrow UI updates every 100ms showing fill percentage

### Menu Unlock Flow
1. Player earns money → `addMoney()` updates `peakMoney`
2. `MenuManager.checkUnlocks()` compares `peakMoney >= minItemPrice`
3. Unlocked menus added to `player.unlockedMenus`
4. `ShopMenu.refresh()` displays newly unlocked menus

### Drag-Drop Flow
1. User clicks inventory slot → `InventoryPanel` emits selection
2. Mouse move → `WorldInteractionManager` tracks position
3. Renders placement preview if valid tile
4. Click/drag → validates, creates entity (Plant/Fence), removes from inventory
5. Drag painting uses Set to prevent duplicate placements
6. Selection persists across stacks if items remain, clears if empty

### Tool System Flow
1. **Tool Categories**:
   - Requirement tools (axe): Enable harvest button in info panels, NOT selectable for drag-painting
   - Paint tools (scissors, saw, gloves): Appear in ToolsPanel for efficient drag-harvesting
2. **Shop Purchase** (scissors, axe, saw):
   - Purchase from Tools menu in shop (gloves NOT in shop, unlocked conditionally)
   - Stored in `player.ownedTools[]`, displayed with checkmark ✅ and strikethrough
   - Tool prerequisites checked via `MenuManager.getUnlockedItemsForMenu()` (saw requires axe owned)
3. **Conditional Unlock** (gloves):
   - First fruit/barrel output collection sets `player.hasCollectedOutput = true`
   - `Game.checkToolUnlocks()` adds gloves to `ownedTools`
   - ToolsPanel refreshes to show newly unlocked tool
4. **ToolsPanel Filtering**:
   - Only displays paint tools (scissors, saw, gloves), filters out requirement tools (axe)
   - Selection mutually exclusive with inventory selection
5. **Harvesting Logic**:
   - Info panel harvest button: checks `requiresTool()` and axe ownership
   - Paint-harvesting: `tryHarvestWithTool()` validates tool type vs entity type

### Item Requirements System
1. Items can specify `requirements` object (e.g. `{wood: 1}`)
2. Shop validates both money and item requirements
3. Temporary item removal checks inventory space after consumption
4. Requirements displayed with hover tooltips showing item details
5. Affordability styling updates dynamically based on inventory changes

### Image-Based Items
1. Items with `image` property use PNG assets instead of emoji
2. AssetLoader preloads structure images (fence-horizontal.png, fence-vertical.png, barrel.png)
3. Rendering logic checks for `item.image` before falling back to `item.emoji`
4. Applies to: ShopMenu, InventoryPanel, ItemPreviewPanel, WorldInteractionManager
5. Images use `object-fit: contain` for proper aspect ratio

### Overlay Icon System
1. Entities implement `getOverlayIcons()` returning array or null
2. Each overlay config: `{itemId, offsetX, offsetY, scale}`
3. Offset values are tile-relative: 0.0 = left/top edge, 1.0 = right/bottom edge
4. Scale is relative to tile size: 0.33 = 33% of tile width/height
5. Renderer calls `renderOverlayIcon()` for each overlay after entity render
6. Used by Barrel (input/output slots at 0.1 and 0.57 X), Plant (fruits at custom positions)
7. Overlay positions configured per entity type in GameConfig or entity class

## Debugging Tips

### Common Issues
- **Grid not aligned**: Ensure grid positions are floored like tile positions
- **Jittering on pan**: Check all screen positions use `Math.floor()`
- **World not rendering**: Verify assets loaded, check camera position
- **Save not working**: Check LocalStorage quota (5-10MB), verify save key
- **Rivers look wrong**: Adjust `GameConfig.WORLD` parameters
- **Entity clicks not working**: Verify coordinate flooring in click detection
- **Panel not showing**: Check CSS uses class selectors (`.class`) not ID (`#id`) for shared styles
- **Fence/Barrel image not rendering**: Verify image is in AssetLoader preload list
- **Drag painting not working**: Ensure panning is disabled when item selected
- **Fermentation not progressing**: Check recipe exists in GameConfig.FERMENTATION.RECIPES
- **Fruit not generating**: Verify plant has `plantType: "fruiting"` and config in GameConfig.FRUITING.PLANTS
- **Overlay icons misaligned**: Check offsetX/offsetY values (0-1 range, tile-relative)
- **Panel refresh issues**: Ensure `buildPanel()` called once, `refresh()` updates content without recreating elements
- **Barrel dropdown not working**: Check click event has `stopPropagation()` to prevent outside-click handler


## Performance Notes

- Viewport culling minimizes draw calls
- Chunk system enables lazy loading
- Asset caching prevents redundant loads
- Run-length encoding compresses tile data
- Auto-save throttling (500ms debounce)
- RequestAnimationFrame for native 60fps