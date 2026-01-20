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
        this.makeMoneyButton = new Button('Search for pennies', '🔍', () => {
            // 50% chance to find a penny
            if (Math.random() < GameConfig.ECONOMY.CLICK_CHANCE) {
                this.game.addMoney(GameConfig.ECONOMY.CLICK_REWARD);
            }
        }, 'success');
        makeMoneyContainer.appendChild(this.makeMoneyButton.getElement());

        // Add shop menus to top-left
        const topLeft = document.getElementById('top-left');
        topLeft.appendChild(this.game.shopMenu.getElement());

        // Add inventory button to top-right (before settings button)
        const topRight = document.getElementById('top-right');
        const inventoryBtn = new Button('Inventory', '🎒', () => {
            this.game.inventoryPanel.show();
        }, 'primary');
        topRight.insertBefore(inventoryBtn.getElement(), topRight.firstChild);

        // Pass button reference to inventory panel for notifications
        this.game.inventoryPanel.setInventoryButton(inventoryBtn.getElement());

        const settingsBtn = document.getElementById('settings-btn');
        this.settingsMenu = new SettingsMenu(this.game, () => {
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

        const expansionPrice = this.game.getExpansionPrice();
        const canAfford = this.game.player.money >= expansionPrice;
        const hasEverAfforded = this.game.player.peakMoney >= expansionPrice;

        // Only show buttons if player has ever had enough money
        if (!hasEverAfforded) {
            return;
        }

        for (const btnData of buttons) {
            const btn = document.createElement('button');
            btn.className = 'expansion-btn';
            btn.style.left = `${btnData.x}px`;
            btn.style.top = `${btnData.y}px`;
            btn.style.transform = 'translate(-50%, -50%)';

            // Create button content with price
            const label = document.createElement('div');
            label.textContent = btnData.label;
            label.style.fontSize = '20px';
            label.style.marginBottom = '4px';

            const price = document.createElement('div');
            price.textContent = `$${expansionPrice.toFixed(2)}`;
            price.style.fontSize = '14px';
            price.style.opacity = '0.8';

            btn.appendChild(label);
            btn.appendChild(price);

            // Disable if can't afford
            if (!canAfford) {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            }

            btn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                if (canAfford && onExpand) {
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
