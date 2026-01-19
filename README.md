# Clicker Farm

A browser-based clicker/farming game hybrid with procedural world generation. Players accumulate resources through clicking and explore an ever-expanding tile-based world with natural river formations.

## Features

- **Procedural World Generation**: Natural-looking rivers that flow through grass terrain
- **Expandable World**: Click expansion buttons to grow your world chunk-by-chunk (10x10 tiles per chunk)
- **Camera Controls**: Zoom and pan to explore your world
- **Clicker Mechanics**: Earn money by clicking the "Make money" button
- **Persistent Progress**: Your game state is automatically saved to browser storage
- **Mobile & Desktop Support**: Touch-friendly UI that works on all devices with full zoom/pan support
- **Settings Menu**: Reset your progress and start a new procedurally generated world

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
   - Click the "💲 Make money" button to earn $1 per click
   - Use mouse wheel or pinch to zoom in and out
   - Drag to pan around the world
   - Click expansion buttons (⬆⬇⬅➡) at chunk edges to grow your world
   - Each expansion adds a 10x10 tile chunk in that direction
   - Your progress is automatically saved every 30 seconds
   - Explore the procedurally generated world with rivers

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
- **Mouse Click**: Interact with buttons and UI elements
- **Mouse Wheel**: Zoom in and out on the world
- **Mouse Drag**: Pan/move the camera around the world
- **Settings Button (☰)**: Open settings menu
- **Expansion Buttons (⬆⬇⬅➡)**: Expand the world by adding new 10x10 tile chunks

### Mobile
- **Tap**: Interact with buttons and UI elements
- **Pinch**: Zoom in and out on the world
- **Drag**: Pan/move the camera around the world
- Touch controls are fully supported

## Settings

Click the hamburger menu (☰) in the top-right to access:
- **Reset Progress**: Clears all saved data and generates a new world

## Technical Details

- **No Build Required**: Pure HTML/CSS/JavaScript - no compilation needed
- **Browser Storage**: Uses LocalStorage to persist game state
- **Auto-Save**: Game automatically saves every 30 seconds
- **Responsive Design**: Adapts to any screen size
- **Tile-Based Rendering**: Efficient canvas rendering with viewport culling

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
│   └── main.css           # Styling
├── js/
│   ├── config/            # Configuration files
│   ├── core/              # Core game systems
│   ├── world/             # World generation
│   ├── rendering/         # Canvas rendering
│   ├── ui/                # UI components
│   ├── entities/          # Game entities
│   └── main.js            # Game initialization
├── assets/
│   ├── grass.png          # Grass tile texture
│   └── water.png          # Water tile texture
└── README.md
```

## Development

See [CLAUDE.md](CLAUDE.md) for detailed architecture documentation and development guidelines.

## License

This project is open source and available for educational purposes.
