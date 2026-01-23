import { Button } from '../ui/Button.js';
import { ItemSlot } from '../ui/ItemSlot.js';
import { UIComponentTheme } from '../config/UIComponentTheme.js';

export class PlantInfoPanel {
    constructor(itemRegistry, game, assetLoader) {
        this.itemRegistry = itemRegistry;
        this.game = game;
        this.assetLoader = assetLoader;
        this.panel = null;
        this.visible = false;
        this.currentPlant = null;
        this.onHarvestCallback = null;
        this.fruitSlot = null;
        this.createPanel();
    }

    createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'plant-info-panel';
        this.panel.className = 'plant-info-panel hidden';
        document.body.appendChild(this.panel);

        // Close when clicking outside
        document.addEventListener('pointerdown', (e) => {
            if (this.visible && !this.panel.contains(e.target)) {
                this.hide();
            }
        });
    }

    show(plant, screenX, screenY, onHarvest, onTakeFruit) {
        this.currentPlant = plant;
        this.onHarvestCallback = onHarvest;
        this.onTakeFruitCallback = onTakeFruit;

        const item = this.itemRegistry.getItem(plant.itemId);
        if (!item) {
            this.hide();
            return;
        }

        this.panel.innerHTML = '';

        // Item icon
        const icon = document.createElement('div');
        icon.className = 'plant-info-icon';
        icon.textContent = item.emoji;

        // Item name
        const name = document.createElement('div');
        name.className = 'plant-info-name';
        name.textContent = item.name;

        // Growth description
        const description = document.createElement('div');
        description.className = 'plant-info-description';
        description.textContent = plant.getGrowthDescription(this.itemRegistry);

        this.panel.appendChild(icon);
        this.panel.appendChild(name);
        this.panel.appendChild(description);

        // Add fruit slot if this is a fruiting plant
        if (plant.isFruitingPlant() && plant.growthStage === 'mature') {
            this.addFruitSlot(plant);
        }

        // Add harvest button if mature
        if (plant.canHarvest()) {
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'plant-info-buttons';

            // Check if plant has fruit (must take fruit before harvesting)
            const hasFruit = plant.hasFruit();

            // Check if plant requires a tool
            const requiresTool = plant.requiresTool(this.itemRegistry);
            const requiredTool = plant.getRequiredTool(this.itemRegistry);
            const hasTool = !requiresTool || (this.game.player.ownedTools && this.game.player.ownedTools.includes(requiredTool));

            if (hasFruit) {
                // Show disabled button - must take fruit first
                const disabledBtn = new Button('Take fruit first', '🔒', null, 'disabled');
                disabledBtn.getElement().style.width = UIComponentTheme.PANEL.BUTTON.WIDTH;
                buttonContainer.appendChild(disabledBtn.getElement());
            } else if (requiresTool && !hasTool) {
                // Show disabled button with "Tool required" text
                const disabledBtn = new Button('Tool required', '🔒', null, 'disabled');
                disabledBtn.getElement().style.width = UIComponentTheme.PANEL.BUTTON.WIDTH;
                buttonContainer.appendChild(disabledBtn.getElement());
            } else {
                // Determine harvest emoji based on plant type
                const targetItem = this.itemRegistry.getItem(plant.targetItemId);
                let harvestEmoji = '✂️'; // Default for flowers
                if (targetItem && targetItem.plantType === 'tree') {
                    harvestEmoji = '🪓'; // Axe for trees
                }

                // Show normal harvest button
                const harvestBtn = new Button('Harvest', harvestEmoji, () => {
                    if (this.onHarvestCallback) {
                        this.onHarvestCallback(plant);
                    }
                    this.hide();
                }, 'success');
                harvestBtn.getElement().style.width = UIComponentTheme.PANEL.BUTTON.WIDTH;
                buttonContainer.appendChild(harvestBtn.getElement());
            }

            this.panel.appendChild(buttonContainer);
        }

        // Position the panel
        this.positionPanel(screenX, screenY);

        this.panel.classList.remove('hidden');
        this.visible = true;
    }

    addFruitSlot(plant) {
        // Simple container for centering
        const slotWrapper = document.createElement('div');
        slotWrapper.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 4px; margin: 12px 0;';

        const slotLabel = document.createElement('div');
        slotLabel.textContent = 'Fruit:';
        slotLabel.style.cssText = 'font-size: 12px; color: #aaa;';

        // Create ItemSlot component for fruit (clickable to take)
        this.fruitSlot = new ItemSlot('medium', plant.fruitSlot, this.itemRegistry, this.assetLoader, {
            isOutput: true,
            clickable: true,
            onSlotClick: (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (plant.fruitSlot && this.onTakeFruitCallback) {
                    this.onTakeFruitCallback(plant);
                }
            }
        });

        slotWrapper.appendChild(slotLabel);
        slotWrapper.appendChild(this.fruitSlot.getElement());

        this.panel.appendChild(slotWrapper);
    }

    positionPanel(tileScreenX, tileScreenY) {
        const panelWidth = 250;
        const panelHeight = 200; // Approximate height
        const offset = 20; // Distance from tile

        // Default: position to the left of the tile
        let left = tileScreenX - panelWidth - offset;
        let top = tileScreenY - (panelHeight / 2);

        // If too far left, position to the right instead
        if (left < 20) {
            left = tileScreenX + offset;
        }

        // If too far right, clamp
        if (left + panelWidth > window.innerWidth - 20) {
            left = window.innerWidth - panelWidth - 20;
        }

        // Clamp vertical position
        if (top < 20) {
            top = 20;
        }
        if (top + panelHeight > window.innerHeight - 20) {
            top = window.innerHeight - panelHeight - 20;
        }

        this.panel.style.left = `${left}px`;
        this.panel.style.top = `${top}px`;
    }

    hide() {
        this.panel.classList.add('hidden');
        this.visible = false;
        this.currentPlant = null;
        this.onHarvestCallback = null;
        this.fruitSlot = null;
    }

    isVisible() {
        return this.visible;
    }
}
