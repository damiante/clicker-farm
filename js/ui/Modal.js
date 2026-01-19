import { UITheme } from '../config/UITheme.js';

export class Modal {
    constructor(title, content, buttons = []) {
        this.title = title;
        this.content = content;
        this.buttons = buttons;
        this.overlay = null;
        this.modal = null;
        this.onClose = null;
    }

    show() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'modal-overlay';
        this.applyOverlayTheme();

        this.modal = document.createElement('div');
        this.modal.className = 'modal';
        this.applyModalTheme();

        const header = document.createElement('div');
        header.className = 'modal-header';
        this.applyHeaderTheme(header);

        const titleElement = document.createElement('h2');
        titleElement.textContent = this.title;
        titleElement.style.margin = '0';
        titleElement.style.fontSize = UITheme.TYPOGRAPHY.MODAL_TITLE_SIZE;
        titleElement.style.color = UITheme.COLORS.TEXT;

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.className = 'modal-close';
        this.applyCloseBtnTheme(closeBtn);
        closeBtn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            this.hide();
        });

        header.appendChild(titleElement);
        header.appendChild(closeBtn);

        const body = document.createElement('div');
        body.className = 'modal-body';
        body.style.padding = UITheme.SPACING.MODAL_PADDING;

        if (typeof this.content === 'string') {
            body.innerHTML = this.content;
            body.style.color = UITheme.COLORS.TEXT;
            body.style.fontSize = '16px';
            body.style.lineHeight = '1.5';
        } else if (this.content instanceof HTMLElement) {
            body.appendChild(this.content);
        }

        const footer = document.createElement('div');
        footer.className = 'modal-footer';
        this.applyFooterTheme(footer);

        for (const button of this.buttons) {
            footer.appendChild(button.getElement());
        }

        this.modal.appendChild(header);
        this.modal.appendChild(body);
        if (this.buttons.length > 0) {
            this.modal.appendChild(footer);
        }

        this.overlay.appendChild(this.modal);

        this.overlay.addEventListener('pointerdown', (e) => {
            if (e.target === this.overlay) {
                e.preventDefault();
                e.stopPropagation();
            }
        });

        document.body.appendChild(this.overlay);

        setTimeout(() => {
            this.overlay.style.opacity = '1';
            this.modal.style.transform = 'scale(1)';
        }, 10);
    }

    applyOverlayTheme() {
        this.overlay.style.position = 'fixed';
        this.overlay.style.top = '0';
        this.overlay.style.left = '0';
        this.overlay.style.width = '100%';
        this.overlay.style.height = '100%';
        this.overlay.style.background = UITheme.COLORS.MODAL_OVERLAY;
        this.overlay.style.zIndex = '1000';
        this.overlay.style.display = 'flex';
        this.overlay.style.justifyContent = 'center';
        this.overlay.style.alignItems = 'center';
        this.overlay.style.opacity = '0';
        this.overlay.style.transition = 'opacity 0.2s';
    }

    applyModalTheme() {
        this.modal.style.background = UITheme.COLORS.BACKGROUND;
        this.modal.style.borderRadius = UITheme.SPACING.BORDER_RADIUS;
        this.modal.style.boxShadow = UITheme.SHADOWS.MODAL;
        this.modal.style.minWidth = UITheme.SIZING.MODAL_MIN_WIDTH;
        this.modal.style.maxWidth = UITheme.SIZING.MODAL_MAX_WIDTH;
        this.modal.style.width = '90%';
        this.modal.style.maxHeight = '80%';
        this.modal.style.overflow = 'auto';
        this.modal.style.transform = 'scale(0.9)';
        this.modal.style.transition = 'transform 0.2s';
    }

    applyHeaderTheme(header) {
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.padding = UITheme.SPACING.MODAL_PADDING;
        header.style.borderBottom = `1px solid ${UITheme.COLORS.BACKGROUND_DARK}`;
    }

    applyCloseBtnTheme(btn) {
        btn.style.background = 'transparent';
        btn.style.border = 'none';
        btn.style.fontSize = '24px';
        btn.style.color = UITheme.COLORS.TEXT_SECONDARY;
        btn.style.cursor = 'pointer';
        btn.style.padding = '0';
        btn.style.width = '32px';
        btn.style.height = '32px';
        btn.style.borderRadius = '4px';
        btn.style.transition = 'all 0.2s';

        btn.addEventListener('pointerover', () => {
            btn.style.background = UITheme.COLORS.DANGER;
            btn.style.color = UITheme.COLORS.TEXT;
        });

        btn.addEventListener('pointerout', () => {
            btn.style.background = 'transparent';
            btn.style.color = UITheme.COLORS.TEXT_SECONDARY;
        });
    }

    applyFooterTheme(footer) {
        footer.style.display = 'flex';
        footer.style.justifyContent = 'flex-end';
        footer.style.gap = UITheme.SPACING.GAP_SMALL;
        footer.style.padding = UITheme.SPACING.MODAL_PADDING;
        footer.style.borderTop = `1px solid ${UITheme.COLORS.BACKGROUND_DARK}`;
    }

    hide() {
        if (this.overlay) {
            this.overlay.style.opacity = '0';
            this.modal.style.transform = 'scale(0.9)';

            setTimeout(() => {
                if (this.overlay && this.overlay.parentNode) {
                    this.overlay.parentNode.removeChild(this.overlay);
                }
                this.overlay = null;
                this.modal = null;

                if (this.onClose) {
                    this.onClose();
                }
            }, 200);
        }
    }

    isVisible() {
        return this.overlay !== null && this.overlay.parentNode !== null;
    }
}
