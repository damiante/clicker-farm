import { Modal } from './Modal.js';
import { Button } from './Button.js';

export class SettingsMenu {
    constructor(game, onReset) {
        this.game = game;
        this.onReset = onReset;
        this.currentModal = null;
    }

    open() {
        // Create custom content with checkbox for grid lines
        const content = document.createElement('div');
        content.style.marginBottom = '20px';

        // Grid lines toggle
        const gridContainer = document.createElement('div');
        gridContainer.style.display = 'flex';
        gridContainer.style.alignItems = 'center';
        gridContainer.style.gap = '10px';
        gridContainer.style.padding = '10px';
        gridContainer.style.background = 'rgba(255, 255, 255, 0.05)';
        gridContainer.style.borderRadius = '4px';
        gridContainer.style.marginBottom = '15px';

        const gridCheckbox = document.createElement('input');
        gridCheckbox.type = 'checkbox';
        gridCheckbox.id = 'grid-toggle';
        gridCheckbox.checked = this.game.settings.showGrid;
        gridCheckbox.style.cursor = 'pointer';
        gridCheckbox.style.width = '20px';
        gridCheckbox.style.height = '20px';

        const gridLabel = document.createElement('label');
        gridLabel.htmlFor = 'grid-toggle';
        gridLabel.textContent = 'Show Grid Lines';
        gridLabel.style.cursor = 'pointer';
        gridLabel.style.color = 'white';
        gridLabel.style.fontSize = '16px';

        gridCheckbox.addEventListener('change', (e) => {
            this.game.settings.showGrid = e.target.checked;
            this.game.stateManager.scheduleSave(this.game.getGameState());
        });

        gridContainer.appendChild(gridCheckbox);
        gridContainer.appendChild(gridLabel);
        content.appendChild(gridContainer);

        const resetButton = new Button('Reset Progress', null, () => {
            this.showResetConfirmation();
        }, 'danger');

        const modal = new Modal('Settings', content, [resetButton]);
        modal.onClose = () => {
            this.currentModal = null;
        };

        modal.show();
        this.currentModal = modal;
    }

    showResetConfirmation() {
        if (this.currentModal) {
            this.currentModal.hide();
        }

        let action = null;
        let modalRef = null;

        const confirmButton = new Button('Confirm Reset', null, () => {
            action = 'reset';
            modalRef.hide();
        }, 'danger');

        const cancelButton = new Button('Cancel', null, () => {
            action = 'reopen';
            modalRef.hide();
        }, 'primary');

        const modal = new Modal(
            'Reset Progress',
            'Are you sure you want to reset all progress? This will destroy all game data and generate a new world. This action cannot be undone.',
            [cancelButton, confirmButton]
        );

        modalRef = modal;

        modal.onClose = () => {
            this.currentModal = null;
            if (action === 'reset' && this.onReset) {
                this.onReset();
            } else if (action === 'reopen') {
                this.open();
            }
        };

        modal.show();
        this.currentModal = modal;
    }

    close() {
        if (this.currentModal) {
            this.currentModal.hide();
            this.currentModal = null;
        }
    }

    isOpen() {
        return this.currentModal !== null && this.currentModal.isVisible();
    }
}
