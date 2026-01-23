/**
 * ItemSlot.js
 * Reusable item slot component with consistent styling and behavior
 * Eliminates 7+ different slot implementations across the codebase
 */

import { UIComponentTheme } from '../config/UIComponentTheme.js';

export class ItemSlot {
  /**
   * Creates a standardized item slot
   * @param {string|number} size - 'small', 'medium', 'large', or pixel value
   * @param {Object|null} slotData - {itemId, count} or null for empty slot
   * @param {ItemRegistry} itemRegistry - Reference to item registry
   * @param {AssetLoader} assetLoader - Reference to asset loader
   * @param {Object} options - Configuration options
   * @param {boolean} options.isOutput - If true, uses output slot styling (lighter bg)
   * @param {boolean} options.showCount - If false, hides count badge (default: true)
   * @param {boolean} options.clickable - If true, adds click handler (default: false)
   * @param {Function} options.onSlotClick - Click handler callback
   */
  constructor(size, slotData, itemRegistry, assetLoader, options = {}) {
    this.size = size;
    this.slotData = slotData;
    this.itemRegistry = itemRegistry;
    this.assetLoader = assetLoader;
    this.options = {
      isOutput: false,
      showCount: true,
      clickable: false,
      onSlotClick: null,
      ...options
    };

    this.element = null;
    this.selected = false;
  }

  /**
   * Creates the slot DOM element with all styling and content
   * @returns {HTMLElement} The slot element
   */
  createElement() {
    const slot = document.createElement('div');
    slot.className = 'item-slot';

    // Determine size in pixels
    let sizePixels;
    if (typeof this.size === 'number') {
      sizePixels = this.size;
    } else {
      const sizeMap = {
        'small': UIComponentTheme.SLOT.SIZES.SMALL,
        'medium': UIComponentTheme.SLOT.SIZES.MEDIUM,
        'large': UIComponentTheme.SLOT.SIZES.LARGE
      };
      sizePixels = sizeMap[this.size] || UIComponentTheme.SLOT.SIZES.MEDIUM;
    }

    // Determine border and background based on slot state
    const hasFilled = this.slotData && this.slotData.itemId;
    const borderColor = hasFilled
      ? UIComponentTheme.SLOT.BORDERS.FILLED
      : UIComponentTheme.SLOT.BORDERS.EMPTY;

    const backgroundColor = this.options.isOutput
      ? UIComponentTheme.SLOT.BACKGROUNDS.OUTPUT
      : UIComponentTheme.SLOT.BACKGROUNDS.INPUT;

    // Apply base styling
    slot.style.cssText = `
      width: ${sizePixels}px;
      height: ${sizePixels}px;
      background: ${backgroundColor};
      border: 2px solid ${borderColor};
      border-radius: 4px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: ${this.options.clickable ? 'pointer' : 'default'};
      transition: all 0.2s ease;
    `;

    // Add content if slot has an item
    if (hasFilled) {
      const item = this.itemRegistry.getItem(this.slotData.itemId);
      if (item) {
        // Render item icon (emoji or image)
        if (item.image) {
          // Image-based item (structures like fences, barrels)
          const img = document.createElement('img');
          img.src = `./assets/${item.image}`;
          img.style.cssText = `
            width: ${sizePixels * 0.7}px;
            height: ${sizePixels * 0.7}px;
            object-fit: contain;
            pointer-events: none;
          `;
          slot.appendChild(img);
        } else if (item.emoji) {
          // Emoji-based item
          const icon = document.createElement('div');
          icon.textContent = item.emoji;
          icon.style.cssText = `
            font-size: ${sizePixels * 0.55}px;
            line-height: 1;
            pointer-events: none;
          `;
          slot.appendChild(icon);
        }

        // Add count badge if count > 1 and showCount is true
        if (this.options.showCount && this.slotData.count > 1) {
          const countBadge = document.createElement('div');
          countBadge.textContent = this.slotData.count;
          countBadge.style.cssText = `
            position: absolute;
            bottom: 2px;
            right: 2px;
            background: ${UIComponentTheme.SLOT.COUNT_BADGE.BACKGROUND};
            color: ${UIComponentTheme.SLOT.COUNT_BADGE.COLOR};
            font-size: ${UIComponentTheme.SLOT.COUNT_BADGE.FONT_SIZE};
            padding: ${UIComponentTheme.SLOT.COUNT_BADGE.PADDING};
            border-radius: ${UIComponentTheme.SLOT.COUNT_BADGE.BORDER_RADIUS};
            font-weight: bold;
            pointer-events: none;
          `;
          slot.appendChild(countBadge);
        }
      }
    }

    // Add click handler if clickable
    if (this.options.clickable && this.options.onSlotClick) {
      slot.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.options.onSlotClick(e);
      });

      // Add hover effect
      slot.addEventListener('pointerenter', () => {
        slot.style.background = `${backgroundColor}`;
        slot.style.filter = 'brightness(1.2)';
      });

      slot.addEventListener('pointerleave', () => {
        slot.style.background = backgroundColor;
        slot.style.filter = 'brightness(1)';
      });
    }

    this.element = slot;
    return slot;
  }

  /**
   * Gets the slot DOM element (creates if doesn't exist)
   * @returns {HTMLElement} The slot element
   */
  getElement() {
    if (!this.element) {
      this.createElement();
    }
    return this.element;
  }

  /**
   * Updates slot contents without recreating the element
   * Preserves event listeners and DOM position
   * @param {Object|null} newSlotData - New {itemId, count} or null
   */
  updateContents(newSlotData) {
    this.slotData = newSlotData;

    if (!this.element) {
      return;
    }

    // Clear existing content except event listeners
    while (this.element.firstChild) {
      this.element.removeChild(this.element.firstChild);
    }

    // Re-render content
    const hasFilled = newSlotData && newSlotData.itemId;
    const borderColor = hasFilled
      ? UIComponentTheme.SLOT.BORDERS.FILLED
      : UIComponentTheme.SLOT.BORDERS.EMPTY;

    this.element.style.borderColor = borderColor;

    if (hasFilled) {
      const item = this.itemRegistry.getItem(newSlotData.itemId);
      if (item) {
        const sizePixels = parseInt(this.element.style.width);

        // Render icon
        if (item.image) {
          const img = document.createElement('img');
          img.src = `./assets/${item.image}`;
          img.style.cssText = `
            width: ${sizePixels * 0.7}px;
            height: ${sizePixels * 0.7}px;
            object-fit: contain;
            pointer-events: none;
          `;
          this.element.appendChild(img);
        } else if (item.emoji) {
          const icon = document.createElement('div');
          icon.textContent = item.emoji;
          icon.style.cssText = `
            font-size: ${sizePixels * 0.55}px;
            line-height: 1;
            pointer-events: none;
          `;
          this.element.appendChild(icon);
        }

        // Add count badge
        if (this.options.showCount && newSlotData.count > 1) {
          const countBadge = document.createElement('div');
          countBadge.textContent = newSlotData.count;
          countBadge.style.cssText = `
            position: absolute;
            bottom: 2px;
            right: 2px;
            background: ${UIComponentTheme.SLOT.COUNT_BADGE.BACKGROUND};
            color: ${UIComponentTheme.SLOT.COUNT_BADGE.COLOR};
            font-size: ${UIComponentTheme.SLOT.COUNT_BADGE.FONT_SIZE};
            padding: ${UIComponentTheme.SLOT.COUNT_BADGE.PADDING};
            border-radius: ${UIComponentTheme.SLOT.COUNT_BADGE.BORDER_RADIUS};
            font-weight: bold;
            pointer-events: none;
          `;
          this.element.appendChild(countBadge);
        }
      }
    }
  }

  /**
   * Sets the selected state of the slot
   * @param {boolean} selected - Whether the slot should be selected
   */
  setSelected(selected) {
    this.selected = selected;

    if (!this.element) {
      return;
    }

    if (selected) {
      this.element.style.borderColor = UIComponentTheme.SLOT.BORDERS.SELECTED;
      this.element.style.borderWidth = '3px';
      this.element.style.boxShadow = `0 0 10px rgba(46, 204, 113, 0.5)`;
    } else {
      const hasFilled = this.slotData && this.slotData.itemId;
      const borderColor = hasFilled
        ? UIComponentTheme.SLOT.BORDERS.FILLED
        : UIComponentTheme.SLOT.BORDERS.EMPTY;

      this.element.style.borderColor = borderColor;
      this.element.style.borderWidth = '2px';
      this.element.style.boxShadow = 'none';
    }
  }

  /**
   * Destroys the slot element and cleans up event listeners
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}
