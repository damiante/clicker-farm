export class ToolsPanel {
    constructor(game, itemRegistry) {
        this.game = game;
        this.itemRegistry = itemRegistry;
        this.panel = null;
        this.selectedTool = null;
        this.createPanel();
    }

    createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'tools-panel';
        document.body.appendChild(this.panel);

        this.refresh();
    }

    // No-op methods for compatibility
    show() {
        // Panel is always visible
    }

    hide() {
        // Panel is always visible
    }

    isVisible() {
        return true;
    }

    toggle() {
        // Panel is always visible
    }

    selectTool(toolId) {
        // Toggle selection
        if (this.selectedTool === toolId) {
            this.selectedTool = null;
        } else {
            this.selectedTool = toolId;

            // Clear inventory selection when tool is selected
            if (this.game.inventoryPanel) {
                this.game.inventoryPanel.clearSelection();
            }
        }

        this.refresh();
    }

    getSelectedTool() {
        return this.selectedTool;
    }

    clearSelection() {
        this.selectedTool = null;
        this.refresh();
    }

    refresh() {
        if (!this.panel) return;

        // Clear panel
        this.panel.innerHTML = '';

        // Get owned tools
        const ownedTools = this.game.player.ownedTools || [];

        // Only show paint tools (not axe, which is a requirement tool)
        const paintTools = ['scissors', 'saw', 'gloves'];
        const ownedPaintTools = ownedTools.filter(toolId => paintTools.includes(toolId));

        // Create tool slots (don't show empty message if no tools)
        for (const toolId of ownedPaintTools) {
            const toolElement = this.createToolElement(toolId);
            if (toolElement) {
                this.panel.appendChild(toolElement);
            }
        }
    }

    createToolElement(toolId) {
        const item = this.itemRegistry.getItem(toolId);
        if (!item) {
            console.warn(`Tool not found: ${toolId}`);
            return null;
        }

        // Create tool slot
        const slot = document.createElement('div');
        slot.className = 'tool-slot';
        slot.setAttribute('data-tool-name', item.name);

        if (this.selectedTool === toolId) {
            slot.classList.add('selected');
        }

        // Tool icon
        const icon = document.createElement('div');
        icon.className = 'tool-icon';

        if (item.image) {
            // Image-based tool
            const img = document.createElement('img');
            img.src = `./assets/${item.image}`;
            img.alt = item.name;
            icon.appendChild(img);
        } else {
            // Emoji-based tool
            icon.textContent = item.emoji;
        }

        slot.appendChild(icon);

        // Click handler
        slot.addEventListener('click', () => {
            this.selectTool(toolId);
        });

        return slot;
    }

    setToolsButton(buttonElement) {
        // No-op for compatibility
    }

    notifyToolPurchased() {
        // No-op for compatibility
    }
}
