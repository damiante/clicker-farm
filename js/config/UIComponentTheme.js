/**
 * UIComponentTheme.js
 * Centralized styling configuration for reusable UI components
 * Separates component-level styling from app-level styling (UITheme.js)
 */

export const UIComponentTheme = {
  // Item Slot Styling
  SLOT: {
    // Size presets for consistent slot dimensions
    SIZES: {
      SMALL: 50,    // Info panel slots (barrel, furnace, crate)
      MEDIUM: 60,   // Tools panel, plant fruit slot, mine output
      LARGE: 80     // Inventory panel
    },

    // Border colors for different slot states
    BORDERS: {
      EMPTY: '#555',        // Empty slot border
      FILLED: '#4A90E2',    // Filled slot border (blue)
      SELECTED: '#2ECC71',  // Selected slot border (green)
      OUTPUT: '#333'        // Output slot border (darker, less prominent)
    },

    // Background colors with opacity
    BACKGROUNDS: {
      INPUT: 'rgba(0, 0, 0, 0.3)',      // Input slot background
      OUTPUT: 'rgba(0, 0, 0, 0.2)',     // Output slot background (lighter)
      HOVER: 'rgba(255, 255, 255, 0.1)' // Hover state overlay
    },

    // Count badge styling (bottom-right corner)
    COUNT_BADGE: {
      BACKGROUND: 'rgba(0, 0, 0, 0.7)',
      COLOR: '#fff',
      FONT_SIZE: '12px',
      PADDING: '2px 4px',
      BORDER_RADIUS: '3px'
    }
  },

  // Progress Indicator Styling
  PROGRESS: {
    // Arrow progress indicator (preferred implementation)
    ARROW: {
      WIDTH: 60,
      HEIGHT: 24,
      LINE_WEIGHT: 4,    // Thicker line weight via larger font-size
      EMOJI: '→',
      FONT_SIZE: '36px', // Larger for thicker appearance (was 30px)

      // Colors for different entity types
      COLORS: {
        BACKGROUND: '#444',  // Greyed arrow background
        FILL: '#ff6600',     // Default fill (orange)
        BARREL: '#3498db',   // Barrel fermentation (blue)
        FURNACE: '#ff6600'   // Furnace smelting (orange)
      }
    },

    // Bar progress indicator (fallback, not used by default)
    BAR: {
      WIDTH: 60,
      HEIGHT: 20,
      BORDER_RADIUS: '4px',

      COLORS: {
        BACKGROUND: 'rgba(52, 73, 94, 0.5)',
        BORDER: 'rgba(52, 73, 94, 0.8)',
        FILL: 'linear-gradient(90deg, #3498db, #2ecc71)'
      }
    }
  },

  // Info Panel Styling
  PANEL: {
    // Button configuration for consistent sizing
    BUTTON: {
      WIDTH: '100%',      // All panel buttons full-width
      MIN_WIDTH: '200px', // Minimum button width
      SPACING: '8px'      // Gap between stacked buttons
    },

    // Dropdown styling for item selection
    DROPDOWN: {
      BACKGROUND: 'rgba(44, 62, 80, 0.98)',
      BORDER: '2px solid #34495e',
      BORDER_RADIUS: '8px',
      PADDING: '8px',
      MAX_HEIGHT: '200px',
      SHADOW: '0 4px 12px rgba(0, 0, 0, 0.5)',

      // Dropdown item hover state (standardized to pointer events)
      ITEM_HOVER: 'rgba(52, 152, 219, 0.3)'
    }
  }
};
