/**
 * ItemDropdown.js
 * Reusable dropdown component with class-based item filtering
 * Standardizes dropdown behavior across Barrel, Furnace, Crate, and other entity panels
 */

import { UIComponentTheme } from '../config/UIComponentTheme.js';

export class ItemDropdown {
  /**
   * Creates a filtered item dropdown
   * @param {ItemRegistry} itemRegistry - Reference to item registry
   * @param {InventoryManager} inventoryManager - Reference to inventory manager
   * @param {AssetLoader} assetLoader - Reference to asset loader
   * @param {Object} options - Configuration options
   * @param {Array<string>} options.allowedClasses - Item classes to show (default: ['storable'])
   * @param {Function} options.onSelect - Callback when item selected (itemId) => void
   * @param {boolean} options.multiSelect - Allow multiple selections (default: false)
   */
  constructor(itemRegistry, inventoryManager, assetLoader, options = {}) {
    this.itemRegistry = itemRegistry;
    this.inventoryManager = inventoryManager;
    this.assetLoader = assetLoader;
    this.options = {
      allowedClasses: ['storable'],
      onSelect: null,
      multiSelect: false,
      ...options
    };

    this.element = null;
    this.visible = false;
    this.anchorElement = null;

    // Bind click-outside handler
    this.handleClickOutside = this.handleClickOutside.bind(this);
  }

  /**
   * Filters inventory items by allowed classes
   * @returns {Array} Array of {itemId, count} for matching items
   */
  getFilteredItems() {
    const filtered = [];
    const allowedClasses = this.options.allowedClasses || ['storable'];

    for (const slot of this.inventoryManager.slots) {
      if (!slot || !slot.itemId) continue;

      const item = this.itemRegistry.getItem(slot.itemId);
      if (!item) continue;

      // Check if item has ANY of the allowed classes
      // Backward compatibility: default to ['storable'] if itemClasses missing
      const itemClasses = item.itemClasses || ['storable'];
      const hasMatch = allowedClasses.some(allowedClass =>
        itemClasses.includes(allowedClass)
      );

      if (hasMatch) {
        // Get total count across all inventory slots
        const totalCount = this.inventoryManager.getItemCount(slot.itemId);

        // Avoid duplicates (multiple stacks of same item)
        if (!filtered.find(f => f.itemId === slot.itemId)) {
          filtered.push({ itemId: slot.itemId, count: totalCount });
        }
      }
    }

    return filtered;
  }

  /**
   * Shows the dropdown anchored to an element
   * @param {HTMLElement} anchorElement - Element to position dropdown relative to
   */
  show(anchorElement) {
    this.anchorElement = anchorElement;

    // Get filtered items
    const filteredItems = this.getFilteredItems();

    // Don't show empty dropdown
    if (filteredItems.length === 0) {
      console.log('ItemDropdown: No items match allowed classes', this.options.allowedClasses);
      return;
    }

    // Create dropdown element
    this.element = document.createElement('div');
    this.element.className = 'item-dropdown';

    // Apply styling from UIComponentTheme
    this.element.style.cssText = `
      position: fixed;
      background: ${UIComponentTheme.PANEL.DROPDOWN.BACKGROUND};
      border: ${UIComponentTheme.PANEL.DROPDOWN.BORDER};
      border-radius: ${UIComponentTheme.PANEL.DROPDOWN.BORDER_RADIUS};
      padding: ${UIComponentTheme.PANEL.DROPDOWN.PADDING};
      max-height: ${UIComponentTheme.PANEL.DROPDOWN.MAX_HEIGHT};
      overflow-y: auto;
      box-shadow: ${UIComponentTheme.PANEL.DROPDOWN.SHADOW};
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 4px;
    `;

    // Populate with filtered items
    for (const { itemId, count } of filteredItems) {
      const item = this.itemRegistry.getItem(itemId);
      if (!item) continue;

      const option = document.createElement('div');
      option.className = 'item-dropdown-option';
      option.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        cursor: pointer;
        border-radius: 4px;
        transition: background 0.2s ease;
      `;

      // Item icon
      const icon = document.createElement('div');
      icon.style.cssText = 'font-size: 24px; flex-shrink: 0;';

      if (item.image) {
        const img = document.createElement('img');
        img.src = `./assets/${item.image}`;
        img.style.cssText = 'width: 24px; height: 24px; object-fit: contain;';
        icon.appendChild(img);
      } else if (item.emoji) {
        icon.textContent = item.emoji;
      }

      option.appendChild(icon);

      // Item name and count
      const text = document.createElement('div');
      text.style.cssText = 'color: #fff; font-size: 14px; flex-grow: 1;';
      text.textContent = `${item.name} (${count})`;
      option.appendChild(text);

      // Hover effect (standardized to pointerenter/leave)
      option.addEventListener('pointerenter', () => {
        option.style.background = UIComponentTheme.PANEL.DROPDOWN.ITEM_HOVER;
      });

      option.addEventListener('pointerleave', () => {
        option.style.background = 'transparent';
      });

      // Click handler
      option.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (this.options.onSelect) {
          this.options.onSelect(itemId);
        }

        // Close dropdown after selection (unless multiSelect)
        if (!this.options.multiSelect) {
          this.hide();
        }
      });

      this.element.appendChild(option);
    }

    // Add to DOM
    document.body.appendChild(this.element);

    // Position dropdown
    this.positionDropdown();

    // Mark as visible
    this.visible = true;

    // Add click-outside handler (delayed to avoid immediate closure)
    setTimeout(() => {
      document.addEventListener('pointerdown', this.handleClickOutside);
    }, 100);
  }

  /**
   * Positions the dropdown relative to anchor element
   */
  positionDropdown() {
    if (!this.element || !this.anchorElement) return;

    const anchorRect = this.anchorElement.getBoundingClientRect();

    // Position below anchor by default
    let top = anchorRect.bottom + 5;
    let left = anchorRect.left;

    // Ensure dropdown stays on screen
    const dropdownRect = this.element.getBoundingClientRect();

    if (top + dropdownRect.height > window.innerHeight) {
      // Show above anchor if not enough space below
      top = anchorRect.top - dropdownRect.height - 5;
    }

    if (left + dropdownRect.width > window.innerWidth) {
      // Align right edge if not enough space on right
      left = window.innerWidth - dropdownRect.width - 5;
    }

    this.element.style.top = `${top}px`;
    this.element.style.left = `${left}px`;
  }

  /**
   * Refreshes dropdown contents without recreating
   * Useful when inventory changes while dropdown is open
   */
  refresh() {
    if (!this.visible || !this.element || !this.anchorElement) return;

    // Hide and re-show to refresh contents
    const anchor = this.anchorElement;
    this.hide();
    this.show(anchor);
  }

  /**
   * Hides and removes the dropdown
   */
  hide() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    this.element = null;
    this.visible = false;
    this.anchorElement = null;

    // Remove click-outside handler
    document.removeEventListener('pointerdown', this.handleClickOutside);
  }

  /**
   * Handles clicks outside dropdown to close it
   * @param {PointerEvent} e - Click event
   */
  handleClickOutside(e) {
    if (!this.element) return;

    // Check if click was outside dropdown
    if (!this.element.contains(e.target) && !this.anchorElement.contains(e.target)) {
      this.hide();
    }
  }

  /**
   * Cleans up dropdown and event listeners
   */
  destroy() {
    this.hide();
  }
}
