# Clicker Farm

A browser-based farming game with procedural world generation, inventory management, and plant growth mechanics. Plant seeds, watch them grow, harvest crops, and expand your world.

## Features

### World & Exploration
- **Procedural World Generation**: Natural-looking rivers that flow through grass terrain
- **Expandable World**: Purchase world expansions to grow your map chunk-by-chunk (10x10 tiles per chunk)
- **Camera Controls**: Zoom and pan to explore your world with smooth controls
- **Grid Lines**: Optional toggle to see tile boundaries (Settings → Show Grid Lines)

### Inventory & Items
- **Inventory System**: Expandable inventory with configurable stack sizes
- **Shop System**: Buy seeds and items from unlockable shop menus
- **Item Preview**: See item details and sell items directly from inventory
- **Drag & Drop**: Place items from inventory onto the world

### Farming Mechanics
- **Plant Growth**: Seeds grow over time through multiple stages (seed → seedling → mature)
- **Timestamp-Based**: Plants grow even when the game is closed
- **Harvesting**: Click mature plants to harvest and add to inventory
- **Placement Preview**: See translucent preview of where items will be placed

### Progression
- **Economy System**: Earn money by clicking and selling harvested plants
- **Unlockable Menus**: Shop menus unlock as you reach money thresholds
- **Expandable Inventory**: Purchase additional inventory slots and increase stack sizes
- **Escalating Costs**: Expansion costs increase exponentially

### Quality of Life
- **Persistent Progress**: Auto-save every 30 seconds to browser storage
- **Mobile & Desktop Support**: Touch-friendly UI with full zoom/pan support
- **Selection Persistence**: Place multiple items without reselecting
- **Plant Info Panels**: Floating panels show plant status without blocking the world

## How to Play

### Running Locally

1. **Clone or download this repository**

2. **Open the game**:
   - Simply open `index.html` in a modern web browser
   - Or use a local server (recommended):
     ```bash
     # Using Python 3
     python -m http.server 8000

     # Using Node.js
     npx serve
     ```
   - Then navigate to `http://localhost:8000` in your browser

3. **Start playing!**
   - Click "💲 Make money" to earn your first dollar
   - Buy rose seeds from the Plants menu (unlocks at $15)
   - Open inventory (🎒) and click a seed to select it
   - Click on grass tiles to plant seeds
   - Wait for plants to grow (or keep playing!)
   - Click mature plants to harvest them
   - Sell harvested plants from inventory for profit
   - Expand your world and buy more inventory slots as you progress

### GitHub Pages Deployment

1. **Push this repository to GitHub**

2. **Enable GitHub Pages**:
   - Go to Settings → Pages
   - Set source to "main" branch and "/" (root) directory
   - Save

3. **Access your game**:
   - Visit `https://[your-username].github.io/[repository-name]/`

## Game Controls

### Desktop
- **Mouse Click**: Interact with buttons, place items, harvest plants
- **Mouse Wheel**: Zoom in and out on the world
- **Mouse Drag**: Pan/move the camera around the world
- **Inventory Button (🎒)**: Open/close inventory panel
- **Settings Button (☰)**: Open settings menu

### Mobile
- **Tap**: Interact with buttons, place items, harvest plants
- **Pinch**: Zoom in and out on the world
- **Drag**: Pan/move the camera around the world
- Touch controls are fully supported

## Gameplay Loop

1. **Earn Money**: Click the "Make Money" button ($1 per click)
2. **Buy Seeds**: Purchase seeds from the Plants shop menu
3. **Plant & Grow**: Select seeds from inventory and plant them on grass tiles
4. **Harvest**: Click mature plants to collect them
5. **Sell**: Sell harvested plants from inventory for profit
6. **Expand**: Buy more inventory slots, stack size upgrades, and world expansions
7. **Repeat**: Plant more expensive crops (like trees) for higher returns

## Items

### Rose Seeds 🫘
- **Cost**: $15
- **Grows Into**: Rose 🌹
- **Growth Time**: 10s sprout + 20s maturity
- **Harvest Value**: $30

### Tree Seeds 🌰
- **Cost**: $50
- **Grows Into**: Tree 🌳
- **Growth Time**: 30s sprout + 60s maturity
- **Harvest Value**: $150

## Settings

Click the hamburger menu (☰) in the top-right to access:
- **Show Grid Lines**: Toggle tile boundary visualization
- **Reset Progress**: Clears all saved data and generates a new world

## Technical Details

- **No Build Required**: Pure HTML/CSS/JavaScript - no compilation needed
- **Browser Storage**: Uses LocalStorage to persist game state
- **Auto-Save**: Game automatically saves every 30 seconds
- **Responsive Design**: Adapts to any screen size
- **Efficient Rendering**: Viewport culling for tiles and entities
- **Data-Driven**: Items and menus configured via JSON files

## Browser Requirements

- Modern browser with ES6 module support
- LocalStorage enabled
- Canvas API support
- Pointer Events API support

Recommended browsers:
- Chrome/Edge 61+
- Firefox 60+
- Safari 11+

## Project Structure

```
clicker-farm/
├── index.html              # Entry point
├── styles/
│   └── main.css            # Styling
├── js/
│   ├── config/             # Game configuration (GameConfig.js, UITheme.js, InventoryConfig.js)
│   ├── core/               # Core systems (Game.js, StateManager.js, InputManager.js)
│   ├── world/              # World generation (WorldGenerator.js, ChunkManager.js)
│   ├── rendering/          # Canvas rendering (Renderer.js, AssetLoader.js)
│   ├── ui/                 # UI components (Modal.js, Button.js, UIManager.js, SettingsMenu.js)
│   ├── entities/           # Game entities (Entity.js, Plant.js)
│   ├── inventory/          # Inventory system (InventoryManager.js, InventoryPanel.js)
│   ├── items/              # Item registry (ItemRegistry.js)
│   ├── menus/              # Shop system (MenuManager.js, ShopMenu.js)
│   ├── systems/            # Game systems (WorldInteractionManager.js, PlantInfoPanel.js)
│   └── main.js             # Game initialization
├── data/
│   ├── items.json          # Item definitions
│   └── menus.json          # Shop menu structure
├── assets/
│   ├── grass.png           # Grass tile texture
│   └── water.png           # Water tile texture
└── README.md
```

## Development

See [CLAUDE.md](CLAUDE.md) for architecture overview and development guidelines.

## License

This project is open source and available for educational purposes.
