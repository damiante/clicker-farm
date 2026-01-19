import { MoneyDisplay } from './MoneyDisplay.js';
import { Button } from './Button.js';
import { SettingsMenu } from './SettingsMenu.js';
import { GameConfig } from '../config/GameConfig.js';

export class UIManager {
    constructor(game) {
        this.game = game;
        this.moneyDisplay = null;
        this.makeMoneyButton = null;
        this.settingsMenu = null;
        this.expansionButtons = [];
    }

    initialize() {
        const moneyDisplayElement = document.getElementById('money-display');
        this.moneyDisplay = new MoneyDisplay(moneyDisplayElement);

        const makeMoneyContainer = document.getElementById('make-money-container');
        this.makeMoneyButton = new Button('Make money', '💲', () => {
            this.game.addMoney(GameConfig.ECONOMY.CLICK_REWARD);
        }, 'success');
        makeMoneyContainer.appendChild(this.makeMoneyButton.getElement());

        const settingsBtn = document.getElementById('settings-btn');
        this.settingsMenu = new SettingsMenu(() => {
            this.game.reset();
        });

        settingsBtn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            this.settingsMenu.open();
        });
    }

    updateMoney(amount) {
        if (this.moneyDisplay) {
            this.moneyDisplay.update(amount);
        }
    }

    updateExpansionButtons(buttons, onExpand) {
        this.clearExpansionButtons();

        for (const btnData of buttons) {
            const btn = document.createElement('button');
            btn.textContent = btnData.label;
            btn.className = 'expansion-btn';
            btn.style.left = `${btnData.x}px`;
            btn.style.top = `${btnData.y}px`;
            btn.style.transform = 'translate(-50%, -50%)';

            btn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                if (onExpand) {
                    onExpand(btnData);
                }
            });

            const uiOverlay = document.getElementById('ui-overlay');
            uiOverlay.appendChild(btn);
            this.expansionButtons.push(btn);
        }
    }

    clearExpansionButtons() {
        for (const btn of this.expansionButtons) {
            if (btn.parentNode) {
                btn.parentNode.removeChild(btn);
            }
        }
        this.expansionButtons = [];
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
    }

    showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.remove('hidden');
        }
    }
}
