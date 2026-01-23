/**
 * ProgressArrow.js
 * Standardized arrow progress indicator with thicker line weight
 * Uses clip-path animation approach with configurable colors per entity type
 */

import { UIComponentTheme } from '../config/UIComponentTheme.js';

export class ProgressArrow {
  /**
   * Creates an arrow progress indicator
   * @param {number} progress - Progress value from 0.0 to 1.0
   * @param {Object} options - Configuration options
   * @param {string} options.color - Fill color for the arrow (defaults to theme FILL)
   * @param {number} options.width - Arrow width in pixels (defaults to theme WIDTH)
   * @param {number} options.height - Arrow height in pixels (defaults to theme HEIGHT)
   * @param {string} options.fontSize - Font size for arrow emoji (defaults to theme FONT_SIZE)
   */
  constructor(progress, options = {}) {
    this.progress = Math.max(0, Math.min(1, progress)); // Clamp to 0-1
    this.options = {
      color: UIComponentTheme.PROGRESS.ARROW.COLORS.FILL,
      width: UIComponentTheme.PROGRESS.ARROW.WIDTH,
      height: UIComponentTheme.PROGRESS.ARROW.HEIGHT,
      fontSize: UIComponentTheme.PROGRESS.ARROW.FONT_SIZE,
      ...options
    };

    this.element = null;
    this.fillElement = null;
  }

  /**
   * Creates the arrow progress DOM element
   * @returns {HTMLElement} The arrow container element
   */
  createElement() {
    const container = document.createElement('div');
    container.className = 'progress-arrow';

    container.style.cssText = `
      width: ${this.options.width}px;
      height: ${this.options.height}px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    `;

    // Background arrow (greyed out)
    const bgArrow = document.createElement('div');
    bgArrow.textContent = UIComponentTheme.PROGRESS.ARROW.EMOJI;
    bgArrow.style.cssText = `
      font-size: ${this.options.fontSize};
      color: ${UIComponentTheme.PROGRESS.ARROW.COLORS.BACKGROUND};
      position: absolute;
      user-select: none;
      pointer-events: none;
    `;

    // Fill arrow (colored, clipped based on progress)
    const fillArrow = document.createElement('div');
    fillArrow.textContent = UIComponentTheme.PROGRESS.ARROW.EMOJI;
    const fillPercentage = this.progress * 100;
    fillArrow.style.cssText = `
      font-size: ${this.options.fontSize};
      color: ${this.options.color};
      position: absolute;
      clip-path: inset(0 ${100 - fillPercentage}% 0 0);
      transition: clip-path 0.1s ease;
      user-select: none;
      pointer-events: none;
    `;

    // Store reference to fill element for updates
    this.fillElement = fillArrow;

    container.appendChild(bgArrow);
    container.appendChild(fillArrow);

    this.element = container;
    return container;
  }

  /**
   * Gets the arrow DOM element (creates if doesn't exist)
   * @returns {HTMLElement} The arrow element
   */
  getElement() {
    if (!this.element) {
      this.createElement();
    }
    return this.element;
  }

  /**
   * Updates the progress value without recreating the element
   * More performant for frequent updates (e.g., every 100ms)
   * @param {number} newProgress - New progress value from 0.0 to 1.0
   */
  updateProgress(newProgress) {
    this.progress = Math.max(0, Math.min(1, newProgress)); // Clamp to 0-1

    if (this.fillElement) {
      const fillPercentage = this.progress * 100;
      this.fillElement.style.clipPath = `inset(0 ${100 - fillPercentage}% 0 0)`;
    }
  }

  /**
   * Changes the arrow fill color
   * @param {string} color - New color (hex, rgb, rgba, etc.)
   */
  setColor(color) {
    this.options.color = color;

    if (this.fillElement) {
      this.fillElement.style.color = color;
    }
  }

  /**
   * Destroys the arrow element and cleans up
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
    this.fillElement = null;
  }
}
