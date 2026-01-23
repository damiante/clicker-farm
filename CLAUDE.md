# Clicker Farm - Developer Guide

**Tech Stack**: Vanilla JavaScript (ES6 modules), HTML5 Canvas, CSS, LocalStorage
**Deployment**: GitHub Pages (static files, no build tools)
**Architecture**: Object-oriented with modular systems

## Design Principles

1. **Extensibility**: OOP architecture ready for new entities and mechanics
2. **Centralized Configuration**: All tunable values in config files (`GameConfig.js`, `UITheme.js`, `UIComponentTheme.js`, `InventoryConfig.js`)
3. **Unified UI Components**: Reusable components (`ItemSlot`, `ItemDropdown`, `ProgressArrow`, `Button`, `Modal`) - NEVER create custom implementations
4. **Universal Interfaces**: All entities use standardized painting/collection interfaces (`acceptsItemInSlot`, `placeItemInSlot`, `hasOutputToCollect`, `collectFirstOutput`)
5. **Data-Driven**: Items defined in `items.json` with `itemClasses` for filtering (`fermentable`, `smeltable`, `combustible`, `storable`)
6. **Cross-Platform**: PointerEvent API for mouse/touch/pen

## File Structure

```
js/
├── config/           # All tunable values - edit these first
│   ├── GameConfig.js         # Game mechanics, recipes, timers
│   ├── UITheme.js            # Colors, fonts, spacing
│   ├── UIComponentTheme.js   # Slot sizes, progress styling
│   └── InventoryConfig.js    # Pricing formulas
├── core/
│   ├── Game.js               # Main orchestrator, entity management
│   ├── StateManager.js       # Save/load with compression
│   └── InputManager.js       # PointerEvent handling
├── world/
│   ├── WorldGenerator.js     # Procedural chunk generation
│   ├── ChunkManager.js       # Chunk tracking and expansion
│   └── TileMap.js            # Tile storage and lookup
├── rendering/
│   ├── Renderer.js           # Canvas rendering, viewport culling
│   └── AssetLoader.js        # Image preloading and caching
├── ui/
│   ├── ItemSlot.js           # ⭐ Reusable slot component
│   ├── ItemDropdown.js       # ⭐ Class-filtered dropdown
│   ├── ProgressArrow.js      # ⭐ Arrow progress indicator
│   ├── Button.js / Modal.js  # Themed base components
│   └── ToolsPanel.js         # Paint tools (scissors, saw, gloves)
├── entities/
│   ├── Entity.js             # Base class
│   ├── Plant.js              # Growth, fruiting (output collection)
│   ├── Barrel.js             # Fermentation (input + output)
│   ├── Furnace.js            # Smelting (2 inputs + output)
│   ├── Mine.js               # 2x2 multi-tile, 3 output slots
│   ├── Crate.js              # 3x3 storage grid
│   └── Fence.js / NPC.js     # Structures
├── inventory/
│   ├── InventoryManager.js   # Add/remove/expand logic
│   ├── InventoryPanel.js     # Right-side UI
│   └── ItemPreviewPanel.js   # Floating preview + sell
├── systems/
│   ├── WorldInteractionManager.js  # ⭐ Click/drag/paint logic
│   ├── BarrelInfoPanel.js / FurnaceInfoPanel.js / etc.  # Entity UIs
│   └── MenuManager.js / ShopMenu.js  # Economy
└── items/
    └── ItemRegistry.js       # Loads items.json

data/
├── items.json        # ⭐ Item definitions with itemClasses
└── menus.json        # Shop menu structure
```

## Critical Patterns

### Universal Painting System
**All entities** with input slots implement:
```javascript
acceptsItemInSlot(itemId, itemRegistry) {
    // Check itemClasses, return slot type or false
}

placeItemInSlot(itemId, slotType, count, maxStackSize, itemRegistry) {
    // Place item, return success boolean
}
```

**Painting Flow** (see `WorldInteractionManager.js`):
- Requires gloves OWNED (not selected) + item selected
- Entity-based tracking: re-entering same entity doesn't duplicate
- Tile-based tracking: world placement uses tile changes

### Universal Output Collection
**All entities** with output slots implement:
```javascript
hasOutputToCollect() {
    return this.outputSlot !== null && this.outputSlot.count > 0;
}

collectFirstOutput() {
    return this.takeFromOutput();  // Returns {itemId, count}
}
```

**Collection Flow**:
- Requires gloves SELECTED (no item)
- Entity-based tracking: moving between tiles of same entity (2x2 Mine) doesn't duplicate
- Moving to empty space resets tracker, allows re-entry

### Item Classification System
Items have `itemClasses` array for filtering:
- `"fermentable"` → Barrel input
- `"smeltable"` → Furnace smelt slot
- `"combustible"` → Furnace fuel slot
- `"storable"` → Crate storage (default for all items)
- `"placeable"` → Can be placed in world
- `"processed"` → Crafted output

**Usage**: `ItemDropdown` filters inventory by `allowedClasses`, entity `acceptsItemInSlot` checks classes

### Multi-Tile Entities
Entities with `width` and `height` properties (e.g., Mine: 2x2):
- Use `getEntityAtTile(tileX, tileY)` helper to find entities by bounding box
- Clicking ANY tile of entity triggers interaction
- Entity-based tracking prevents duplicate interactions within same entity

## UI Component Usage

**ItemSlot**: `new ItemSlot(size, slotData, itemRegistry, assetLoader, options)`
**ItemDropdown**: `new ItemDropdown(itemRegistry, inventoryManager, {allowedClasses, onSelect})`
**ProgressArrow**: `new ProgressArrow(progress, {color})` - call `updateProgress(newProgress)` to refresh

## Common Tasks

### Add New Item
1. Add to `data/items.json` with appropriate `itemClasses`
2. Add to `data/menus.json` if purchasable
3. For fruiting plants, configure in `GameConfig.FRUITING.PLANTS`

### Add New Entity Type
1. Extend `Entity` in `js/entities/`
2. Implement `update()`, `render()`, `serialize()`, `deserialize()`
3. For input slots: implement `acceptsItemInSlot()` and `placeItemInSlot()`
4. For output slots: implement `hasOutputToCollect()` and `collectFirstOutput()`
5. Create info panel in `js/systems/` using `ItemSlot`, `ItemDropdown`, `ProgressArrow`
6. Add spawn logic in `Game.js` or `WorldInteractionManager.js`

### Add New Recipe (Barrel/Furnace)
1. Add input/output items to `items.json`
2. Add recipe to `GameConfig.FERMENTATION.RECIPES` or `GameConfig.SMELTING.RECIPES`
3. Format: `'inputId': {output: 'outputId', time: seconds}`

### Modify UI Styling
- **Component sizes/colors**: Edit `UIComponentTheme.js`
- **General colors/fonts**: Edit `UITheme.js`
- **Game values**: Edit `GameConfig.js`
- **Never** hardcode styles - always use theme constants

## Key Implementation Notes

### Coordinate Flooring
**Critical**: Always floor tile coordinates for entity detection:
```javascript
const tileX = Math.floor(worldPos.x);
const tileY = Math.floor(worldPos.y);
```

### Tool vs Item Selection
- Tool selection (ToolsPanel) is **mutually exclusive** with item selection (InventoryPanel)
- Gloves painting: Item selected (no tool) + gloves owned
- Gloves collecting: Gloves selected (tool) + no item

### Git Workflow
- NEVER use destructive commands (`--force`, `--hard`, `--no-verify`) unless explicitly requested
- Always create NEW commits, never amend (pre-commit hooks may fail)
- Prefer staging specific files by name over `git add -A`
- Commit message format: end with `Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>`

## Debugging

- **Entity clicks not working**: Check coordinate flooring in `WorldInteractionManager.js`
- **Painting not working**: Check `lastPaintedEntity` vs `lastPaintedTile` tracking
- **UI styling inconsistent**: Ensure using `ItemSlot`, `ItemDropdown`, `ProgressArrow` - not custom implementations
- **Multi-tile entity issues**: Use `getEntityAtTile()` helper, not direct `find()` with `===` comparison
- **Item filtering wrong**: Check `itemClasses` in `items.json` and `allowedClasses` in dropdown options
- **Panel not refreshing**: Separate `buildPanel()` (once) from `refresh()` (frequent) to preserve event listeners

## Performance

- Viewport culling in `Renderer.js` minimizes draw calls
- Chunk system enables lazy loading
- Asset caching prevents redundant loads
- Run-length encoding compresses tile data in saves
- Auto-save throttling (500ms debounce)

---

**For implementation details** (rendering pipeline, world generation algorithm, state compression, etc.), see comments in the relevant JS files.
