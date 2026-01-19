import { UITheme } from '../config/UITheme.js';

export class Button {
    constructor(text, emoji, onClick, variant = 'primary') {
        this.text = text;
        this.emoji = emoji;
        this.onClick = onClick;
        this.variant = variant;
        this.element = this.createElement();
    }

    createElement() {
        const button = document.createElement('button');
        button.className = 'game-button';

        if (this.emoji) {
            button.textContent = `${this.emoji} ${this.text}`;
        } else {
            button.textContent = this.text;
        }

        this.applyTheme(button);

        button.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            if (this.onClick) {
                this.onClick(e);
            }
        });

        return button;
    }

    applyTheme(button) {
        button.style.fontFamily = UITheme.TYPOGRAPHY.FONT_FAMILY;
        button.style.fontSize = UITheme.TYPOGRAPHY.BUTTON_FONT_SIZE;
        button.style.padding = UITheme.SPACING.BUTTON_PADDING;
        button.style.borderRadius = UITheme.SPACING.BORDER_RADIUS;
        button.style.border = 'none';
        button.style.cursor = 'pointer';
        button.style.color = UITheme.COLORS.TEXT;
        button.style.boxShadow = UITheme.SHADOWS.BUTTON;
        button.style.minWidth = UITheme.SIZING.MIN_TOUCH_TARGET;
        button.style.minHeight = UITheme.SIZING.MIN_TOUCH_TARGET;
        button.style.transition = 'all 0.2s';
        button.style.userSelect = 'none';
        button.style.touchAction = 'manipulation';

        if (this.variant === 'primary') {
            button.style.backgroundColor = UITheme.COLORS.PRIMARY;
        } else if (this.variant === 'danger') {
            button.style.backgroundColor = UITheme.COLORS.DANGER;
        } else if (this.variant === 'success') {
            button.style.backgroundColor = UITheme.COLORS.SUCCESS;
        }

        button.addEventListener('pointerover', () => {
            if (this.variant === 'primary') {
                button.style.backgroundColor = UITheme.COLORS.PRIMARY_HOVER;
            } else if (this.variant === 'danger') {
                button.style.backgroundColor = UITheme.COLORS.DANGER_HOVER;
            } else if (this.variant === 'success') {
                button.style.backgroundColor = UITheme.COLORS.SUCCESS_HOVER;
            }
        });

        button.addEventListener('pointerout', () => {
            if (this.variant === 'primary') {
                button.style.backgroundColor = UITheme.COLORS.PRIMARY;
            } else if (this.variant === 'danger') {
                button.style.backgroundColor = UITheme.COLORS.DANGER;
            } else if (this.variant === 'success') {
                button.style.backgroundColor = UITheme.COLORS.SUCCESS;
            }
        });

        button.addEventListener('pointerdown', () => {
            button.style.transform = 'translateY(1px)';
        });

        button.addEventListener('pointerup', () => {
            button.style.transform = 'translateY(0)';
        });
    }

    setEnabled(enabled) {
        this.element.disabled = !enabled;
        this.element.style.opacity = enabled ? '1' : '0.5';
        this.element.style.cursor = enabled ? 'pointer' : 'not-allowed';
    }

    setText(text) {
        this.text = text;
        if (this.emoji) {
            this.element.textContent = `${this.emoji} ${this.text}`;
        } else {
            this.element.textContent = this.text;
        }
    }

    getElement() {
        return this.element;
    }

    remove() {
        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}
