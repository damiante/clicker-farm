import { Modal } from './Modal.js';
import { Button } from './Button.js';

export class SettingsMenu {
    constructor(onReset) {
        this.onReset = onReset;
        this.currentModal = null;
    }

    open() {
        const resetButton = new Button('Reset Progress', null, () => {
            this.showResetConfirmation();
        }, 'danger');

        const modal = new Modal('Settings', 'Game settings and options', [resetButton]);
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
